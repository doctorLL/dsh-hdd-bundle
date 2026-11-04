// Client-half smoke test.
//
// A browser module is an IIFE that calls window.__ModuleLoader__.load({id,
// factory}). We capture the factory, give it a React stub, and invoke apply()
// against a stub ctx shaped exactly like the live 0.2.1-rc.5 client Service
// catalog (which has no `sessions.clear` and no `workspaces.startSession`).
//
// This answers "which plugin throws before it can register anything" without
// restarting the desktop app.
//
// Usage: node tools/client-smoke.mjs <packageDir> [--legacy]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , dir, mode] = process.argv;
if (!dir) {
  console.error('usage: node tools/client-smoke.mjs <packageDir> [--legacy]');
  process.exit(2);
}
const legacy = mode === '--legacy';

// ---- DOM stubs -------------------------------------------------------------
class StubElement {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  insertBefore(child) { return this.appendChild(child); }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); return child; }
  remove() { this.parentNode?.removeChild(this); }
  addEventListener() {}
  removeEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; }
  get firstChild() { return this.children[0] ?? null; }
  get lastChild() { return this.children[this.children.length - 1] ?? null; }
  get nextSibling() { return null; }
}

const documentElement = new StubElement('html');
const head = new StubElement('head');
const body = new StubElement('body');
const document = {
  documentElement,
  head,
  body,
  readyState: 'complete',
  createElement: (tag) => new StubElement(tag),
  createTextNode: (text) => ({ textContent: text, parentNode: null }),
  createTreeWalker: () => ({ nextNode: () => null }),
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
  activeElement: null,
};

class StubObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return []; }
}

const timers = new Set();
const setTimeoutStub = (fn, ms) => { const id = { fn, ms }; timers.add(id); return id; };

let captured = null;
const windowStub = {
  __ModuleLoader__: {
    load: (entry) => { captured = entry; },
  },
  document,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  requestAnimationFrame: (fn) => setTimeoutStub(fn, 16),
  cancelAnimationFrame: (id) => timers.delete(id),
  setTimeout: setTimeoutStub,
  clearTimeout: (id) => timers.delete(id),
  setInterval: setTimeoutStub,
  clearInterval: (id) => timers.delete(id),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  location: { href: 'http://127.0.0.1/', search: '', pathname: '/', reload() {} },
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 1,
  performance: { now: () => 0 },
  navigator: { language: 'zh-CN', languages: ['zh-CN'] },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
};

// Node 24 exposes some of these as getter-only globals, so define each one
// individually and tolerate the ones that refuse to be replaced.
for (const [key, value] of Object.entries({
  window: windowStub,
  document,
  MutationObserver: StubObserver,
  ResizeObserver: StubObserver,
  IntersectionObserver: StubObserver,
  requestAnimationFrame: windowStub.requestAnimationFrame,
  cancelAnimationFrame: windowStub.cancelAnimationFrame,
  getComputedStyle: windowStub.getComputedStyle,
  localStorage: windowStub.localStorage,
  navigator: windowStub.navigator,
  location: windowStub.location,
  matchMedia: windowStub.matchMedia,
})) {
  try {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  } catch {
    // read-only intrinsic: leave it, the plugin will see Node's own value
  }
}

// `fetch` must fail softly: the settings store treats it as "no hydration".
globalThis.fetch = () => Promise.reject(new Error('smoke: no network'));

// ---- module -----------------------------------------------------------------
const reactStub = {
  createElement: (...args) => ({ __jsx: true, args }),
  Fragment: 'Fragment',
  useRef: (v) => ({ current: v }),
  useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn) => { try { return fn(); } catch { return undefined; } },
  useCallback: (fn) => fn,
  useSyncExternalStore: (_sub, get) => { try { return get(); } catch { return undefined; } },
  createContext: () => ({ Provider: 'Provider', Consumer: 'Consumer' }),
  memo: (c) => c,
  forwardRef: (c) => c,
  Children: { toArray: () => [] },
};
const jsxRuntimeStub = {
  jsx: (...args) => ({ __jsx: true, args }),
  jsxs: (...args) => ({ __jsx: true, args }),
  Fragment: 'Fragment',
};
const requireStub = (id) =>
  id === 'react' ? reactStub
  : id === 'react/jsx-runtime' ? jsxRuntimeStub
  : id === 'react-dom' ? {}
  : {};

const code = readFileSync(join(dir, 'lib', 'client.js'), 'utf8');
new Function('window', 'document', code)(windowStub, document);
if (!captured) {
  console.log('FAIL  module did not call window.__ModuleLoader__.load');
  process.exit(1);
}

const plugin = captured.factory(requireStub);
if (!plugin || typeof plugin.apply !== 'function') {
  console.log(`FAIL  id=${captured.id} factory did not return an apply()`);
  process.exit(1);
}

// ---- ctx shaped like the live client service catalog ------------------------
const noop = () => {};
const subscribed = { subscribe: () => noop, getSnapshot: () => ({}) };
const sessions = {
  list: { getSnapshot: () => ({ current: undefined, ids: [] }), subscribe: () => noop },
  subscribe: () => noop,
  binding: () => undefined,
  retainInfo: () => subscribed,
  refreshProjections: async () => {},
  scope: () => undefined,
  ...(legacy ? { clear: () => {} } : {}),
};
const workspaces = {
  list: { getSnapshot: () => ({ baselinesReady: true, recentWorkspaceId: undefined, ids: [] }), subscribe: () => noop },
  create: async () => ({}),
  ...(legacy ? { startSession: () => {} } : {}),
};

const ctx = {
  sessions,
  workspaces,
  slots: {
    inject: (key, cb) => { try { return cb(); } catch (error) { throw error; } },
    register: () => noop,
    registerFactory: () => noop,
  },
  effect: (fn) => { const dispose = fn(); return typeof dispose === 'function' ? dispose : noop; },
  inject: (deps, cb) => (typeof cb === 'function' ? cb(ctx) : noop),
  on: () => noop,
  get: () => undefined,
  logger: console,
};

const label = `${captured.id}${legacy ? ' [legacy ctx]' : ' [rc.5 ctx]'}`;
try {
  const result = plugin.apply(ctx, {});
  if (result && typeof result.then === 'function') result.catch((error) => {});
  console.log(`OK    ${label}  inject=${JSON.stringify(plugin.inject ?? [])}`);
} catch (error) {
  console.log(`THROW ${label}`);
  console.log(`      ${error && error.name}: ${error && error.message}`);
  const first = String(error && error.stack || '').split('\n').slice(1, 4).join('\n');
  if (first) console.log(first.replace(/^/gm, '      '));
  process.exitCode = 3;
}
