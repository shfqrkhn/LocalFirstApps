import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const read = relative => readFile(path.join(root, relative), 'utf8');
const deliverables = JSON.parse(await read('config/deliverables.json'));
const byId = new Map(deliverables.deliverables.map(item => [item.id, item]));
let changed = 0;

async function project(relative, transform) {
  const current = await read(relative);
  const expected = await transform(current);
  if (current === expected) return;
  if (!write) throw new Error(`${relative} is not projected from config/deliverables.json`);
  await writeFile(path.join(root, relative), expected);
  changed += 1;
}

const noodle = byId.get('noodle-nudge');
await project('apps/noodle-nudge/index.html', source => source
  .replace(/version: "1\.2\.(?:29|30)"/g, `version: "${noodle.appVersion}"`)
  .replace(/noodle-nudge-cache-v1\.2\.(?:29|30)/g, `noodle-nudge-cache-v${noodle.appVersion}`));

await project('package.json', source => {
  const value = JSON.parse(source);
  value.version = deliverables.suite.version;
  return `${JSON.stringify(value, null, 2)}\n`;
});

await project('apps/pmquiz/index.html', source => source.replace(/(<footer[^>]*>)v[^<]+(<\/footer>)/, `$1v${byId.get('pmquiz').appVersion}$2`));
await project('apps/pmquiz/service-worker.js', source => source.replace(/selfquiz-cache-v[^']+/, `selfquiz-cache-v${byId.get('pmquiz').shellVersion}`));
await project('apps/noodle-nudge/service-worker.js', source => source.replace(/shellVersion: "[^"]+"/, `shellVersion: "${noodle.shellVersion}"`));

const flexx = byId.get('flexx-files');
await project('apps/flexx-files/js/constants.js', source => source.replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${flexx.appVersion}'`));
await project('apps/flexx-files/sw.js', source => source.replace(/shellVersion: "[^"]+"/, `shellVersion: "${flexx.shellVersion}"`));
await project('apps/flexx-files/README.md', source => source.replace(/\*\*Version:\*\* [^\r\n]+/, `**Version:** ${flexx.appVersion}`));
await project('apps/flexx-files/Complete_Strength_Protocol.md', source => source.replace(/\*\*App Version:\*\* [^\r\n]+/, `**App Version:** ${flexx.appVersion}`));

for (const [appId, relative] of [['healthos', 'apps/healthos/sw.js'], ['commonground', 'apps/commonground/sw.js']]) {
  await project(relative, source => source.replace(/shellVersion: "[^"]+"/, `shellVersion: "${byId.get(appId).shellVersion}"`));
}
await project('apps/commonground/app.js', source => source.replace(/APP_VERSION = "[^"]+"/, `APP_VERSION = "${byId.get('commonground').appVersion}"`));

for (const relative of ['apps/flexx-files/package.json', 'apps/flexx-files/package-lock.json']) {
  await project(relative, async source => {
    const value = JSON.parse(source);
    value.version = byId.get('flexx-files').appVersion;
    if (value.packages?.['']) value.packages[''].version = byId.get('flexx-files').appVersion;
    return `${JSON.stringify(value, null, 2)}\n`;
  });
}

const shellApps = ['commonground', 'flexx-files', 'healthos', 'noodle-nudge'];
for (const appId of shellApps) {
  const relative = `apps/${appId}/pwa-shell.json`;
  const directory = path.dirname(path.join(root, relative));
  await project(relative, async source => {
    const manifest = JSON.parse(source);
    manifest.shellVersion = byId.get(appId).shellVersion;
    for (const asset of manifest.assets) {
      const assetPath = path.resolve(directory, decodeURIComponent(asset.url));
      if (!assetPath.startsWith(root + path.sep)) throw new Error(`${relative} asset escaped repository: ${asset.url}`);
      const bytes = await readFile(assetPath);
      asset.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    return `${JSON.stringify(manifest, null, 2)}\n`;
  });
}

if (write) console.log(`Synchronized ${changed} runtime contract files.`);
else console.log('Runtime version and shell contracts PASS.');
