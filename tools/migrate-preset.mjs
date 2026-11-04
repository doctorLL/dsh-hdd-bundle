// Migrates the legacy `.agent-presets/fairy/` directory into a declaration
// bundle (the only form 0.2.1-rc.5 reads).
//
// The persona text is 40 lines of Chinese prose. It is lifted from the legacy
// file byte-for-byte instead of being retyped, so the migration cannot drift.
//
// Four changes, each asserted:
//   1. persona `config.text` -> `config.prefix`   (renamed field)
//   2. drop `fairy-core-runtime`                  (runtime/index.js + fairy_core.py missing)
//   3. drop `fairy-safety-gate`                   (runtime/safety-gate.js missing)
//   4. `workflow-worker-thread` -> `workflow-ptc` (package not shipped in 0.2.1-rc.5)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const legacy = join(root, '.agent-presets', 'fairy');
const target = join(root, 'packages', 'dsh-fairy-preset');

const source = readFileSync(join(legacy, 'agent.cordis.yml'), 'utf8');
const preset = readFileSync(join(legacy, 'preset.yml'), 'utf8');

function yamlField(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

const displayName = yamlField(preset, 'name');
const description = yamlField(preset, 'description');
if (!displayName || !description) throw new Error('preset.yml is missing name/description');

// Split on top-level `- id:` rows; everything before the first row is comment.
const CHUNK = /^- id: /m;
const first = source.search(CHUNK);
if (first < 0) throw new Error('no top-level plugin rows found');

const header = source.slice(0, first);
const body = source.slice(first);
const chunks = body.split(/(?=^- id: )/m).filter((chunk) => chunk.trim().length > 0);

const DROP = new Set(['fairy-core-runtime', 'fairy-safety-gate']);
const WORKER_THREAD = `    - id: workflow-worker-thread
      name: '@deepseek-ai/dsh-workflow-worker-thread'
      config:
        provider: spawn`;
const WORKFLOW_PTC = `    - id: workflow-ptc
      name: '@deepseek-ai/dsh-workflow-ptc'`;

const kept = [];
const dropped = [];
for (const chunk of chunks) {
  const id = chunk.match(/^- id: ([^\n]+)/)[1].trim();
  if (DROP.has(id)) {
    dropped.push(id);
    continue;
  }
  kept.push(chunk);
}
if (dropped.length !== DROP.size) throw new Error(`expected to drop ${DROP.size} rows, dropped ${dropped.length}`);

let plugins = kept.join('');
if (!plugins.includes(WORKER_THREAD)) throw new Error('workflow-worker-thread row not found verbatim');
plugins = plugins.replace(WORKER_THREAD, WORKFLOW_PTC);

const textKey = '  config:\n    text: |-';
if (!plugins.includes(textKey)) throw new Error('persona `text:` block not found');
plugins = plugins.replace(textKey, '  config:\n    prefix: |-');

// Re-indent the whole row list ten columns deeper, to sit under
// `- insert:` -> row -> `config:` -> `plugins:`.
const INDENT = ' '.repeat(10);
const indented = plugins
  .split('\n')
  .map((line) => (line.length === 0 ? line : INDENT + line))
  .join('\n')
  .replace(/\n+$/, '');

const patch = `# Fairy agent preset as a declaration bundle.
#
# Migrated from the legacy $DSH_HOME/.agent-presets/fairy/ directory, which
# 0.2.1-rc.5 no longer reads. Diff against upstream, all deliberate:
#   - persona config field  text  ->  prefix
#   - dropped fairy-core-runtime / fairy-safety-gate (their runtime/ files do
#     not exist in the repo, so the rows could never activate)
#   - workflow-worker-thread -> workflow-ptc (the worker-thread package is not
#     part of 0.2.1-rc.5; workflow-ptc is the shipped workflow engine)

- insert:
    - id: preset-fairy
      name: '@deepseek-ai/dsh-agent-preset'
      config:
        id: fairy
        name: '${displayName}'
        description: '${description}'
        order: 20
        plugins:
${indented}
`;

if (!existsSync(target)) mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'cordis.patch.yml'), patch, 'utf8');
writeFileSync(
  join(target, 'package.json'),
  `${JSON.stringify(
    {
      name: 'dsh-fairy-preset',
      version: '0.2.0',
      private: true,
      type: 'module',
      description: "Fairy's agent preset for the DeepSeek Harness",
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`dropped: ${dropped.join(', ')}`);
console.log(`plugins kept: ${kept.length}`);
console.log(`patch bytes: ${patch.length}`);
console.log(`header comment lines: ${header.split('\n').filter((line) => line.trim()).length} (not carried over)`);
