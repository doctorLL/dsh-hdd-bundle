// Host half of dsh-fairy-visual.
//
// 0.2.1-rc.5 removed the `settings` namespace registry that the rc.2 plugin used
// (`settingsNamespace()` / `settings.register(namespace, schema)`). The client
// still owns the whole settings UI, so this half only has to be the durable
// store behind it: two small JSON namespaces served over a plugin-owned route.
//
// Route shape is deliberately dull so it survives settings-API churn:
//   GET  /fairy-visual/settings -> { namespaces: { 'fairy-visual': {...}, 'fairy-identity': {...} } }
//   POST /fairy-visual/settings  { namespace, patch } -> same envelope

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createFairyDiagnostics } from './contracts/diagnostics.js';

const diagnostics = createFairyDiagnostics('dsh-fairy-visual');

export const name = 'dsh-fairy-visual';

// webServer is a core Host service; declaring it keeps the plugin inactive in
// a profile with no browser carrier instead of throwing.
export const inject = ['webServer'];

const PING_PATH = '/fairy-dsh/ping';
const SETTINGS_PATH = '/fairy-visual/settings';
const NAMESPACES = ['fairy-visual', 'fairy-identity'];
const MAX_BODY_BYTES = 16 * 1024;
const MAX_DEPTH = 3;

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const SETTINGS_DIR = join(DSH_HOME, 'fairy-visual');
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Keep only JSON-safe shapes; a client bug must not be able to grow the file
// without bound or smuggle in a non-serializable value.
function plain(value, depth = 0) {
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string') return value.length > 2048 ? value.slice(0, 2048) : value;
  if (type === 'number') return Number.isFinite(value) ? value : null;
  if (type === 'boolean') return value;
  if (depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 64).map((item) => plain(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value).slice(0, 64)) {
      const next = plain(item, depth + 1);
      if (next !== undefined) out[key] = next;
    }
    return out;
  }
  return undefined;
}

function readStore() {
  try {
    const parsed = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
    return isPlainObject(parsed) ? parsed : {};
  } catch (error) {
    if (!error || error.code !== 'ENOENT') diagnostics.warn('settings.read', {}, error);
    return {};
  }
}

function writeStore(store) {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  const temporary = `${SETTINGS_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  renameSync(temporary, SETTINGS_FILE);
}

// Always hand the client a complete envelope, even for a fresh install.
function envelope(store) {
  const namespaces = {};
  for (const namespace of NAMESPACES) {
    namespaces[namespace] = isPlainObject(store[namespace]) ? store[namespace] : {};
  }
  return { namespaces };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('payload too large'), { code: 'E_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function apply(ctx) {
  diagnostics.guard('apply', () => {
    ctx.effect(() => {
      const disposePing = ctx.webServer.register({
        kind: 'exact',
        path: PING_PATH,
        handler: (req, res) => {
          sendJson(res, 200, { ok: true, plugin: name, stage: 'm1', at: new Date().toISOString() });
        },
      });

      const disposeSettings = ctx.webServer.register({
        kind: 'exact',
        path: SETTINGS_PATH,
        handler: (req, res) => {
          const method = String(req.method || 'GET').toUpperCase();
          if (method === 'GET') {
            sendJson(res, 200, envelope(readStore()));
            return;
          }
          if (method !== 'POST') {
            sendJson(res, 405, { error: 'method-not-allowed' });
            return;
          }
          readBody(req)
            .then((raw) => {
              let parsed;
              try {
                parsed = JSON.parse(raw);
              } catch {
                sendJson(res, 400, { error: 'invalid-json' });
                return;
              }
              const namespace = isPlainObject(parsed) ? parsed.namespace : undefined;
              if (!NAMESPACES.includes(namespace)) {
                sendJson(res, 400, { error: 'unknown-namespace', namespaces: NAMESPACES });
                return;
              }
              const patch = plain(isPlainObject(parsed) ? parsed.patch : undefined);
              if (!isPlainObject(patch)) {
                sendJson(res, 400, { error: 'invalid-patch' });
                return;
              }
              const store = readStore();
              const current = isPlainObject(store[namespace]) ? store[namespace] : {};
              store[namespace] = { ...current, ...patch };
              try {
                writeStore(store);
              } catch (error) {
                diagnostics.error('settings.write', error, { namespace });
                sendJson(res, 500, { error: 'write-failed' });
                return;
              }
              diagnostics.info('settings.write', { namespace, fields: Object.keys(patch) });
              sendJson(res, 200, envelope(store));
            })
            .catch((error) => {
              diagnostics.warn('settings.body', { path: SETTINGS_PATH }, error);
              if (!res.writableEnded) sendJson(res, error?.code === 'E_TOO_LARGE' ? 413 : 400, { error: 'bad-request' });
            });
        },
      });

      return () => {
        disposeSettings();
        disposePing();
      };
    }, 'dsh-fairy-visual host routes');
  }, { surface: 'host' });
}
