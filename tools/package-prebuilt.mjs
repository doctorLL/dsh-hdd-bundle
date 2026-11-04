// Port helper: builds the two no-source plugin packages (balance-meter and
// fairy-startup) from their shipped prebuilt artifacts.
//
// Neither upstream package ships `src/`, so their `lib/` output is the artifact
// we have to carry over. Only two kinds of change are applied, and every one of
// them is asserted (the script throws if a pattern is gone):
//
//   1. `dsh-fairy-contracts` is a cross-package bare import that a `link:`ed
//      package cannot resolve, so the diagnostics helper is vendored next to
//      the host half and the import becomes relative.
//   2. balance-meter's client declares `inject = ['slots','connection','sessions']`
//      but never touches `ctx.connection` in its body. rc.5 has no client
//      `connection` service, and a missing injection name means the module
//      silently never activates - so the name is dropped.
//
// Re-runnable: copies are refreshed from the untouched originals every time.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const legacy = join(root, 'legacy', 'rc2');
const packagesDir = join(root, 'packages');
const contracts = join(legacy, 'fairy-contracts');

function assertFile(file) {
  if (!existsSync(file)) throw new Error(`missing source artifact: ${file}`);
}

function patchText(file, required = [], optional = []) {
  let text = readFileSync(file, 'utf8');
  for (const [from, to] of required) {
    if (!text.includes(from)) throw new Error(`pattern not found in ${file}\n  >>> ${from}`);
    text = text.split(from).join(to);
  }
  for (const [from, to] of optional) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  writeFileSync(file, text, 'utf8');
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const HOST_IMPORT_FIX = [["from 'dsh-fairy-contracts/diagnostics'", "from './diagnostics.js'"]];
const HOST_IMPORT_FIX_OPTIONAL = [["from 'dsh-fairy-contracts/diagnostics.js'", "from './diagnostics.js'"]];

// One icon per plugin so the Plugins page does not show three identical marks.
function icon(accent, glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Fairy DSH">
  <defs>
    <linearGradient id="shell" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#12354f" />
      <stop offset="1" stop-color="#07131f" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#shell)" stroke="${accent}" stroke-width="2" />
  ${glyph}
</svg>
`;
}

const PLUGINS = [
  {
    dir: 'dsh-balance-meter',
    source: join(legacy, 'balance-meter', 'dsh-balance-meter'),
    version: '0.2.0',
    description: "Fairy's DeepSeek balance meter and daily usage estimate",
    rowId: 'fairy-balance',
    locale: {
      en: { title: 'Fairy Balance Meter', description: 'DeepSeek balance and today’s estimated spend in the sidebar footer.' },
      zh: { title: 'Fairy 余额计量', description: '在侧栏底部显示 DeepSeek 余额与今日用量估算。' },
    },
    icon: icon(
      '#8fe3ff',
      `<path d="M22 40h6V30h-6zM30 40h6V24h-6zM38 40h6V34h-6z" fill="#8fe3ff" />
  <circle cx="32" cy="20" r="4" fill="none" stroke="#8fe3ff" stroke-width="2.2" />`,
    ),
    clientPatches: [
      ["const inject = ['slots', 'connection', 'sessions'];", "const inject = ['slots', 'sessions'];"],
    ],
  },
  {
    dir: 'dsh-fairy-startup',
    source: join(legacy, 'fairy-startup', 'dsh-fairy-startup'),
    version: '0.2.0',
    description: "Fairy's fresh-session startup behaviour",
    rowId: 'fairy-startup',
    locale: {
      en: { title: 'Fairy Startup', description: 'Opens a fresh session instead of restoring the previous conversation.' },
      zh: { title: 'Fairy 启动', description: '启动时打开新会话，而不是恢复上一次对话。' },
    },
    icon: icon(
      '#b9a6ff',
      `<circle cx="32" cy="32" r="11" fill="none" stroke="#b9a6ff" stroke-width="2.4" />
  <path d="M32 15v5M32 44v5M15 32h5M44 32h5" stroke="#b9a6ff" stroke-width="2.4" stroke-linecap="round" />`,
    ),
    clientPatches: [
      // 0.2.1-rc.5 removed `sessions.clear()` and moved `startSession` from
      // `workspaces` to `uiWorkspace`. The shipped client calls both unguarded
      // and RETHROWS after logging, so its activation failed and took the
      // whole client boot down with it (the app then offers to disable
      // third-party plugins). Every change below degrades instead of failing.
      [
        `    function createWorkspaceStarter(workspaces) {
      let unsubscribe = null;
      let started = false;
      const startWhenReady = () => {
        const snapshot = workspaces.list.getSnapshot();
        if (started || !snapshot.baselinesReady) return false;`,
        `    function createWorkspaceStarter(workspaces, ctx) {
      let unsubscribe = null;
      let started = false;
      const startWhenReady = () => {
        const snapshot = workspaces?.list?.getSnapshot?.() || {};
        if (started || snapshot.baselinesReady === false) return false;`,
      ],
      [
        `        if (snapshot.recentWorkspaceId !== undefined) {
          try {
            workspaces.startSession();`,
        `        if (snapshot.recentWorkspaceId !== undefined) {
          try {
            const owner = typeof ctx?.uiWorkspace?.startSession === 'function' ? ctx.uiWorkspace : workspaces;
            if (!owner || typeof owner.startSession !== 'function') throw new Error('no startSession on this client');
            owner.startSession();`,
      ],
      [
        '    function resetStartupSelection(sessions, workspaces) {',
        '    function resetStartupSelection(sessions, workspaces, ctx) {',
      ],
      [
        `      try {
        sessions.clear();
      } catch (error) {
        root.removeAttribute(STARTUP_RESET_ATTR);
        diagnostics.error('session.clear-restored', error, {});
        throw error;
      }
      const starter = createWorkspaceStarter(workspaces);`,
        `      if (typeof sessions?.clear === 'function') {
        try {
          sessions.clear();
        } catch (error) {
          root.removeAttribute(STARTUP_RESET_ATTR);
          diagnostics.error('session.clear-restored', error, {});
          throw error;
        }
      } else {
        diagnostics.info('session.clear-unavailable', { reason: 'no sessions.clear on this client' });
      }
      const starter = createWorkspaceStarter(workspaces, ctx);`,
      ],
      [
        '        const disposeReset = resetStartupSelection(ctx.sessions, ctx.workspaces);',
        '        const disposeReset = resetStartupSelection(ctx.sessions, ctx.workspaces, ctx);',
      ],
    ],
  },
  {
    dir: 'dsh-browser-dock',
    source: join(legacy, 'browser-dock', 'dsh-browser-dock'),
    version: '0.1.0',
    description: "Fairy's embedded browser dock",
    rowId: 'fairy-browser',
    locale: {
      en: { title: 'Fairy Browser Dock', description: 'An embedded browser surface docked beside the conversation.' },
      zh: { title: 'Fairy 浏览器坞', description: '停靠在对话旁边的内嵌浏览器面板。' },
    },
    icon: icon(
      '#7ef0c0',
      `<rect x="17" y="19" width="30" height="26" rx="5" fill="none" stroke="#7ef0c0" stroke-width="2.2" />
  <path d="M17 27h30" stroke="#7ef0c0" stroke-width="2.2" />
  <circle cx="22" cy="23" r="1.5" fill="#7ef0c0" />
  <circle cx="27" cy="23" r="1.5" fill="#7ef0c0" />`,
    ),
    clientPatches: [],
  },
];

const summary = [];

for (const plugin of PLUGINS) {
  const target = join(packagesDir, plugin.dir);
  assertFile(join(plugin.source, 'lib', 'index.js'));
  assertFile(join(plugin.source, 'lib', 'client.js'));

  mkdirSync(join(target, 'lib'), { recursive: true });
  mkdirSync(join(target, 'locale'), { recursive: true });

  copyFileSync(join(plugin.source, 'lib', 'index.js'), join(target, 'lib', 'index.js'));
  copyFileSync(join(plugin.source, 'lib', 'client.js'), join(target, 'lib', 'client.js'));
  copyFileSync(join(contracts, 'diagnostics.js'), join(target, 'lib', 'diagnostics.js'));

  patchText(join(target, 'lib', 'index.js'), HOST_IMPORT_FIX, HOST_IMPORT_FIX_OPTIONAL);
  if (plugin.clientPatches.length) patchText(join(target, 'lib', 'client.js'), plugin.clientPatches);

  writeFileSync(join(target, 'icon.svg'), plugin.icon, 'utf8');
  writeJson(join(target, 'locale', 'en.json'), { meta: plugin.locale.en });
  writeJson(join(target, 'locale', 'zh.json'), { meta: plugin.locale.zh });
  writeFileSync(
    join(target, 'cordis.patch.yml'),
    `# ${plugin.dir} bundle layer.\n#\n# This package is its own bundle: installing it adds one profile dependency\n# and appends the row below after @deepseek-ai/dsh-base and @deepseek-ai/dsh-web-app.\n# Keep the row id stable - the profile patch layer addresses rows by id.\n\n- insert:\n    - id: ${plugin.rowId}\n      name: '${plugin.dir}'\n`,
    'utf8',
  );
  writeJson(join(target, 'package.json'), {
    name: plugin.dir,
    version: plugin.version,
    private: true,
    type: 'module',
    description: plugin.description,
    main: './lib/index.js',
    exports: {
      '.': './lib/index.js',
      './client': './lib/client.js',
      './locale/*.json': './locale/*.json',
      './icon': './icon.svg',
      './package.json': './package.json',
    },
    files: ['lib', 'locale', 'icon.svg', 'cordis.patch.yml'],
    dsh: {
      bundle: { patch: './cordis.patch.yml' },
      client: {
        platform: 'web',
        inject: [
          '@deepseek-ai/dsh-client-ui-layout',
          '@deepseek-ai/dsh-client-ui-sidebar',
          '@deepseek-ai/dsh-client-ui-conversation',
          '@deepseek-ai/dsh-client-ui-settings',
        ],
      },
    },
  });

  summary.push(`${plugin.dir}: packaged (row ${plugin.rowId})`);
}

console.log(summary.join('\n'));
