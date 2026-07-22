import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function withinRepository(target) {
  const relative = path.relative(repositoryRoot, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
}

function excluded(relativePath, patterns) {
  return patterns.some((pattern) => {
    if (pattern === "**/README.md") return path.posix.basename(relativePath) === "README.md";
    if (pattern.endsWith("/**")) return relativePath.startsWith(pattern.slice(0, -3));
    return relativePath === pattern;
  });
}

async function collectFiles(relativeDirectory, patterns, output = []) {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  for (const entry of await readdir(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = toPosix(path.join(relativeDirectory, entry.name));
    if (excluded(relativePath, patterns)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Runtime artifact refuses symbolic link: ${relativePath}`);
    if (entry.isDirectory()) await collectFiles(relativePath, patterns, output);
    else if (entry.isFile()) output.push(relativePath);
  }
  return output;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function dependencyNotice(component) {
  const evidence = component.evidence.join(", ");
  return `${component.name} ${component.version}\nLicense: ${component.license}\nSource: ${component.sourceUrl}\nProvenance: ${component.provenanceStatus}\nChecked: ${component.checkedAt}\nScope: ${component.scope}\nEvidence: ${evidence}\nReplacement: ${component.replacement}`;
}

async function componentEvidence(component) {
  const evidence = [];
  for (const relativePath of component.evidence) {
    const bytes = await readFile(path.join(repositoryRoot, relativePath));
    evidence.push({ path: relativePath, sha256: sha256(bytes), bytes: bytes.length });
  }
  return evidence;
}

async function createSbom(dependencies, suiteVersion) {
  const components = [];
  for (const component of dependencies.components) {
    components.push({
      type: component.runtime ? "library" : "application",
      name: component.name,
      version: component.version,
      scope: component.runtime ? "required" : "excluded",
      licenses: [{ license: { id: component.license } }],
      properties: [
        { name: "localfirstapps:scope", value: component.scope },
        { name: "localfirstapps:source", value: component.sourceUrl },
        { name: "localfirstapps:provenance", value: component.provenanceStatus },
        { name: "localfirstapps:checked-at", value: component.checkedAt },
        { name: "localfirstapps:replacement", value: component.replacement },
        { name: "localfirstapps:evidence", value: JSON.stringify(await componentEvidence(component)) }
      ]
    });
  }
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    version: 1,
    metadata: { component: { type: "application", name: "LocalFirstApps runtime", version: suiteVersion } },
    components
  };
}

export async function buildRuntime({ outputDirectory } = {}) {
  const artifactConfig = await readJson("config/runtime-artifact.json");
  const versions = await readJson("config/deliverables.json");
  const dependencies = await readJson("config/dependencies.json");
  const requestedOutput = outputDirectory || artifactConfig.outputDirectory;
  const outputRoot = path.resolve(repositoryRoot, requestedOutput);
  if (!withinRepository(outputRoot)) throw new Error(`Runtime output must be a child of the repository: ${outputRoot}`);

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const runtimeFiles = [...artifactConfig.rootFiles];
  for (const directory of artifactConfig.includeDirectories) {
    await collectFiles(directory, artifactConfig.exclude, runtimeFiles);
  }
  runtimeFiles.sort((a, b) => a.localeCompare(b));

  for (const requiredPath of artifactConfig.requiredCompatibilityPaths) {
    if (!runtimeFiles.includes(requiredPath)) throw new Error(`Required compatibility path omitted: ${requiredPath}`);
  }

  for (const relativePath of runtimeFiles) {
    const source = path.join(repositoryRoot, relativePath);
    const sourceStat = await stat(source);
    if (!sourceStat.isFile()) throw new Error(`Runtime entry is not a file: ${relativePath}`);
    const target = path.join(outputRoot, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  const metadataRoot = path.join(outputRoot, artifactConfig.metadataDirectory);
  await mkdir(metadataRoot, { recursive: true });
  const releaseMetadata = `${JSON.stringify(versions, null, 2)}\n`;
  const sbom = `${JSON.stringify(await createSbom(dependencies, versions.suite.version), null, 2)}\n`;
  const notices = `LocalFirstApps third-party runtime notices\nSuite ${versions.suite.version}\n\n${dependencies.components.map(dependencyNotice).join("\n\n---\n\n")}\n`;
  await writeFile(path.join(metadataRoot, "release-metadata.json"), releaseMetadata);
  await writeFile(path.join(metadataRoot, "sbom.cdx.json"), sbom);
  await writeFile(path.join(metadataRoot, "THIRD_PARTY_NOTICES.txt"), notices);

  const manifestFiles = [...runtimeFiles,
    `${artifactConfig.metadataDirectory}/release-metadata.json`,
    `${artifactConfig.metadataDirectory}/sbom.cdx.json`,
    `${artifactConfig.metadataDirectory}/THIRD_PARTY_NOTICES.txt`
  ].sort((a, b) => a.localeCompare(b));
  const inventory = [];
  for (const relativePath of manifestFiles) {
    const bytes = await readFile(path.join(outputRoot, relativePath));
    inventory.push({ path: relativePath, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const manifest = {
    schemaVersion: 1,
    suiteVersion: versions.suite.version,
    fileCount: inventory.length,
    files: inventory
  };
  await writeFile(path.join(metadataRoot, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { outputRoot, manifest };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
  const outputDirectory = outputArgument?.slice("--output=".length);
  const result = await buildRuntime({ outputDirectory });
  console.log(`Built deterministic runtime: ${result.manifest.fileCount} files -> ${path.relative(repositoryRoot, result.outputRoot)}`);
}
