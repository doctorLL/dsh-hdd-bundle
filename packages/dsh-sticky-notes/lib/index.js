import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Host half of the sticky-notes bundle.
 *
 * The board is a small JSON document owned by this process: the Client page
 * reads and replaces it through two same-origin routes, and the file lives under
 * `$DSH_HOME/sticky-notes` so the notes survive a restart, a port change, and a
 * cleared browser profile. Every write is an atomic rename, so a crash mid-save
 * cannot leave a truncated document behind.
 */

const LOG = '[dsh-sticky-notes]';
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const DATA_DIR = join(DSH_HOME, 'sticky-notes');
const STATE_FILE = join(DATA_DIR, 'notes.json');
const VERSION = 1;
const MAX_ITEMS = 200;
const MAX_TEXT = 4000;
const MAX_BODY = 1024 * 1024;
const COLORS = 4;
const ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

function json(res, status, value) {
  if (res.writableEnded || res.destroyed) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

function isoTimestamp(value, fallback) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

export function emptyState() {
  return { version: VERSION, revision: 0, updatedAt: null, items: [] };
}

/**
 * Coerce an untrusted item list into the stored shape.
 *
 * Unknown keys are dropped, malformed rows are skipped instead of rejected (one
 * bad row must not lose the whole board), text is trimmed and capped, and the
 * list is bounded so a broken Client cannot grow the file without limit.
 * @param value - candidate items from the request body or the stored file.
 * @param now - fallback timestamp for rows without readable dates.
 * @returns normalized items in their original order.
 */
export function normalizeItems(value, now = new Date().toISOString()) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const items = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!ID_PATTERN.test(id) || seen.has(id)) continue;
    const text = typeof raw.text === 'string' ? raw.text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT) : '';
    if (text === '') continue;
    const kind = raw.kind === 'todo' ? 'todo' : 'note';
    const color = Number.isInteger(raw.color) ? Math.min(COLORS - 1, Math.max(0, raw.color)) : 0;
    const createdAt = isoTimestamp(raw.createdAt, now);
    const updatedAt = isoTimestamp(raw.updatedAt, createdAt);
    seen.add(id);
    items.push({
      id,
      kind,
      text,
      done: kind === 'todo' && raw.done === true,
      pinned: raw.pinned === true,
      color,
      createdAt,
      updatedAt,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    const revision = Number.isSafeInteger(parsed?.revision) && parsed.revision >= 0 ? parsed.revision : 0;
    const updatedAt = typeof parsed?.updatedAt === 'string' ? parsed.updatedAt : null;
    return { version: VERSION, revision, updatedAt, items: normalizeItems(parsed?.items) };
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`${LOG} could not read ${STATE_FILE}:`, error?.message ?? error);
    return emptyState();
  }
}

function writeState(state) {
  mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const temporary = `${STATE_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 });
  renameSync(temporary, STATE_FILE);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;
    req.on('data', (chunk) => {
      length += chunk.length;
      if (length > MAX_BODY) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleState(req, res) {
  if (req.method === 'GET') return json(res, 200, { state: readState() });
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'method not allowed' });
  }
  const contentType = String(req.headers?.['content-type'] ?? '');
  if (!contentType.startsWith('application/json')) return json(res, 415, { error: 'application/json required' });
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
  const current = readState();
  const baseRevision = Number.isSafeInteger(body?.baseRevision) ? body.baseRevision : -1;
  if (baseRevision !== current.revision) return json(res, 409, { error: 'conflict', state: current });
  const next = {
    version: VERSION,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
    items: normalizeItems(body?.items),
  };
  try {
    writeState(next);
  } catch (error) {
    console.warn(`${LOG} could not write ${STATE_FILE}:`, error?.message ?? error);
    return json(res, 500, { error: 'could not save' });
  }
  return json(res, 200, { state: next });
}

export function apply(ctx) {
  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => scope.webServer.register({
      kind: 'exact',
      path: '/sticky-notes/state',
      handler: handleState,
    }), 'dsh-sticky-notes: state route');
  });
}
