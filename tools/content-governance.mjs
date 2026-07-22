import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ledgerPath = path.join(root, 'governance', 'content-review-ledger.json');
const posix = value => value.split(path.sep).join('/');
const hash = value => createHash('sha256').update(String(value).normalize('NFC')).digest('hex');
const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const entries = [];

function add(app, kind, location, content, contentVersion = null) {
  const id = `${app}:${hash(location).slice(0, 20)}`;
  entries.push({
    id,
    app,
    kind,
    location: posix(location),
    contentHash: hash(JSON.stringify(content)),
    source: null,
    license: null,
    contentVersion,
    reviewDate: null,
    reviewer: null,
    status: 'quarantined',
    supersedes: null,
    evidenceStrength: 'unverified',
    claimLimits: app === 'pmquiz'
      ? ['Unofficial practice content', 'No PMI endorsement', 'Score does not establish certification readiness']
      : app === 'noodle-nudge'
        ? ['Self-reflection only', 'Not validated here', 'Not diagnostic or clinical guidance']
        : ['Training log guidance only', 'Not medical advice or safety clearance', 'User judgment and qualified professional guidance take priority']
  });
  return id;
}

async function inventoryPmQuiz() {
  const directory = path.join(root, 'apps', 'pmquiz', 'QuestionBanks');
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  const normalized = new Map();
  for (const file of files) {
    const relative = posix(path.relative(root, path.join(directory, file)));
    const bank = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    (bank.questions || []).forEach((question, index) => {
      const id = add('pmquiz', 'practice-question', `${relative}#/questions/${index}`, question);
      const key = normalize(question.questionText);
      if (key) normalized.set(key, [...(normalized.get(key) || []), id]);
    });
  }
  return [...normalized.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([text, ids]) => ({ normalizedHash: hash(text), count: ids.length, entryIds: ids.sort() }))
    .sort((a, b) => a.normalizedHash.localeCompare(b.normalizedHash));
}

function walkNoodle(value, pointer, relative, version) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkNoodle(item, `${pointer}/${index}`, relative, version));
    return;
  }
  if (Object.hasOwn(value, 'day')) add('noodle-nudge', 'daily-content', `${relative}#${pointer}`, value, version);
  if (typeof value.text === 'string' && (value.scoring || pointer.includes('/items/'))) {
    add('noodle-nudge', pointer.includes('/items/') ? 'assessment-card' : 'assessment-question', `${relative}#${pointer}`, value, version);
  }
  if (Object.hasOwn(value, 'interpretation') || Object.hasOwn(value, 'calculation') || Object.hasOwn(value, 'calculationLogic')) {
    add('noodle-nudge', 'scoring-rule-or-interpretation', `${relative}#${pointer}`, value, version);
  }
  for (const [key, child] of Object.entries(value)) walkNoodle(child, `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`, relative, version);
}

async function inventoryNoodle() {
  const directory = path.join(root, 'apps', 'noodle-nudge', 'JSON');
  const files = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  for (const file of files) {
    const full = path.join(directory, file);
    const relative = posix(path.relative(root, full));
    const value = JSON.parse(await readFile(full, 'utf8'));
    if (file.startsWith('Q')) add('noodle-nudge', 'assessment', `${relative}#`, value, value.version || null);
    walkNoodle(value, '', relative, value.version || null);
  }
}

async function inventoryFlexx() {
  const markdownRelative = 'apps/flexx-files/Complete_Strength_Protocol.md';
  const markdown = await readFile(path.join(root, markdownRelative), 'utf8');
  markdown.split(/\r?\n/).forEach((line, index) => {
    const text = line.trim();
    if (text && !/^#{1,6}\s/.test(text) && !/^[-|: ]+$/.test(text)) {
      add('flexx-files', 'strength-protocol-line', `${markdownRelative}#L${index + 1}`, text);
    }
  });
  const i18nRelative = 'apps/flexx-files/js/i18n.js';
  const i18n = await readFile(path.join(root, i18nRelative), 'utf8');
  for (const match of i18n.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):\s*(['"])((?:\\.|(?!\2).)*)\2,?\s*$/gm)) {
    const line = i18n.slice(0, match.index).split(/\r?\n/).length;
    add('flexx-files', 'runtime-guidance-string', `${i18nRelative}#L${line}:${match[1]}`, match[3]);
  }
}

await inventoryNoodle();
await inventoryFlexx();
const duplicateGroups = await inventoryPmQuiz();
entries.sort((a, b) => a.id.localeCompare(b.id));

const ledger = {
  schemaVersion: 1,
  generatedFrom: [
    'apps/pmquiz/QuestionBanks/*.json',
    'apps/noodle-nudge/JSON/*.json',
    'apps/flexx-files/Complete_Strength_Protocol.md',
    'apps/flexx-files/js/i18n.js'
  ],
  entries,
  duplicateGroups
};
const serialized = `${JSON.stringify(ledger, null, 2)}\n`;

if (process.argv.includes('--write')) {
  await writeFile(ledgerPath, serialized);
  console.log(`Wrote ${entries.length} entries and ${duplicateGroups.length} duplicate groups.`);
} else {
  const current = await readFile(ledgerPath, 'utf8').catch(() => '');
  if (current !== serialized) throw new Error('Content ledger is stale. Run: node tools/content-governance.mjs --write');
  console.log(`Content governance PASS: ${entries.length} entries; ${duplicateGroups.length} duplicate groups.`);
}
