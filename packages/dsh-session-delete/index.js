// Host half of dsh-session-delete.
//
// DSH 0.2.1-rc.5 exposes archive but no deletion for a Session: the workspace
// registry can only move a Session into the archived set, while the append-only
// log, the projection cache, and the workspace membership stay on disk. This
// half performs the complete removal for the sidebar's permanent-delete action:
//
//   1. refuse a live Session or one with running work (turn / job / subagent /
//      schedule), because deleting under a writer would resurrect the log;
//   2. remove the Session's log directory (`<root>/<project>/<session>/`);
//   3. drop its projection-cache row (the domain table when open, the file
//      otherwise);
//   4. detach the id from workspace accounting and the archive/pin sets.
//
// The route is deliberately small and plugin-owned so it survives RPC schema
// churn. Permanent deletion is user-only: no agent tool is registered for it.

import { readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

const ROUTE = '/fairy-session-delete/delete';
const MAX_BODY_BYTES = 4096;
const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

class DeleteRefused extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'DeleteRefused';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const name = 'dsh-session-delete';

// webServer is the browser carrier; sessionPersistence guarantees the log
// backend this action removes files from. Optional peers (workspace registry,
// storage domain, session store) are looked up defensively below.
export const inject = ['webServer', 'sessionPersistence'];

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(body);
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejectBody(Object.assign(new Error('payload too large'), { code: 'E_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rejectBody);
  });
}

// A browser POST carries Origin; a same-origin action is the only one this
// destructive route accepts. Requests without Origin (local tooling) pass.
function sameOrigin(req) {
  const origin = req.headers?.origin;
  if (typeof origin !== 'string' || origin.length === 0) return true;
  const host = req.headers?.host;
  if (typeof host !== 'string' || host.length === 0) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** The persistence root as an absolute path, when this backend exposes one. */
function sessionRoot(persistence) {
  if (typeof persistence.root === 'string' && persistence.root.length > 0) return resolve(persistence.root);
  return undefined;
}

/**
 * Find the directory that owns exactly this Session id. The project segment is
 * an encoded form of the Session cwd, so scanning the root's immediate children
 * is both backend-accurate and independent of that encoding. The backend's
 * `locate()` is a fallback for a non-standard layout.
 * @param persistence - the mounted session-persistence service.
 * @param sessionId - validated session id.
 * @param snapshot - the persistence stat result, when available.
 * @returns the absolute Session directory, or undefined when no artifact exists.
 */
async function findSessionDir(persistence, sessionId, snapshot) {
  const root = sessionRoot(persistence);
  if (root !== undefined) {
    let projects;
    try {
      projects = await readdir(root, { withFileTypes: true });
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      projects = [];
    }
    for (const project of projects) {
      if (!project.isDirectory()) continue;
      const candidate = join(root, project.name, sessionId);
      try {
        if ((await stat(candidate)).isDirectory()) return candidate;
      } catch {
        // Not this project: continue scanning.
      }
    }
  }
  if (snapshot !== undefined && typeof persistence.locate === 'function') {
    try {
      const located = persistence.locate(snapshot.header);
      if (typeof located?.path === 'string') {
        const directory = dirname(located.path);
        if (basename(directory) === sessionId) return directory;
      }
    } catch {
      // A locate failure is not proof of absence; the caller reports unsupported.
    }
  }
  return undefined;
}

/** Drop the projection-cache row through its domain table, or its file as a fallback. */
async function clearProjectionCache(ctx, sessionId) {
  const domain = ctx.get('storageDomain')?.get?.('session_projcache');
  if (domain !== undefined) {
    try {
      return await domain.table('sessions').delete(sessionId);
    } catch (error) {
      ctx.logger?.warn?.(`session-delete: projection-cache row '${sessionId}' could not be removed: ${String(error)}`);
    }
  }
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  const file = join(home, 'storages', 'session_projcache', 'sessions', `${sessionId}.json`);
  try {
    await rm(file, { force: true });
    return true;
  } catch (error) {
    ctx.logger?.warn?.(`session-delete: projection-cache file '${file}' could not be removed: ${String(error)}`);
    return false;
  }
}

/** Remove the id from its workspace slot and from the registry-global sets. */
async function detachFromWorkspace(ctx, sessionId) {
  const registry = ctx.get('workspaceRegistry');
  if (registry === undefined) return false;
  try {
    await registry.unarchiveSession(sessionId);
  } catch (error) {
    ctx.logger?.warn?.(`session-delete: unarchive '${sessionId}' failed: ${String(error)}`);
  }
  try {
    await registry.unpinSession(sessionId);
  } catch (error) {
    ctx.logger?.warn?.(`session-delete: unpin '${sessionId}' failed: ${String(error)}`);
  }
  let detached = false;
  for (const workspace of registry.list()) {
    if (!workspace.sessionIds.includes(sessionId)) continue;
    try {
      await workspace.detachSession(sessionId);
      detached = true;
    } catch (error) {
      ctx.logger?.warn?.(`session-delete: detaching '${sessionId}' from workspace '${workspace.id}' failed: ${String(error)}`);
    }
  }
  return detached;
}

/**
 * Permanently remove one Session.
 * @param ctx - the Host plugin context.
 * @param sessionId - validated session id.
 * @returns which parts of the removal ran.
 * @throws {DeleteRefused} for a live/active Session or an unsupported layout.
 */
async function deleteSession(ctx, sessionId) {
  // An idle live Session can be removed: this backend opens the log only for
  // an append, so its directory is deletable. A running one must not be
  // removed under its writer; the activity waterfall below reports it.
  if (ctx.get('agents')?.get(sessionId)?.status === 'running') {
    throw new DeleteRefused(409, 'active', 'the session still has a running turn');
  }
  if (typeof ctx.waterfall === 'function') {
    let activity = [];
    try {
      activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]));
    } catch (error) {
      ctx.logger?.warn?.(`session-delete: activity check for '${sessionId}' failed: ${String(error)}`);
    }
    if (Array.isArray(activity) && activity.length > 0) {
      throw new DeleteRefused(409, 'active', 'the session still has running work', { activity });
    }
  }

  const persistence = ctx.sessionPersistence;
  let snapshot;
  try {
    snapshot = await persistence.stat(sessionId);
  } catch (error) {
    // A corrupt or unreadable log still has a directory worth removing; the
    // scan below finds it without trusting the header.
    ctx.logger?.warn?.(`session-delete: stat '${sessionId}' failed: ${String(error)}`);
  }

  const directory = await findSessionDir(persistence, sessionId, snapshot);
  if (directory === undefined && snapshot !== undefined) {
    throw new DeleteRefused(500, 'unsupported', 'the session directory could not be located');
  }
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
  }

  const cacheRemoved = await clearProjectionCache(ctx, sessionId);
  const workspaceDetached = await detachFromWorkspace(ctx, sessionId);
  return {
    sessionId,
    deleted: directory !== undefined,
    cacheRemoved,
    workspaceDetached,
  };
}

export function apply(ctx) {
  const handle = async (req, res) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'POST') {
      sendJson(res, 405, { ok: false, code: 'method', message: 'POST required' });
      return;
    }
    if (!sameOrigin(req)) {
      sendJson(res, 403, { ok: false, code: 'origin', message: 'cross-origin request refused' });
      return;
    }
    let raw;
    try {
      raw = await readBody(req);
    } catch (error) {
      sendJson(res, error?.code === 'E_TOO_LARGE' ? 413 : 400, {
        ok: false,
        code: 'body',
        message: error?.message ?? 'unreadable request body',
      });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendJson(res, 400, { ok: false, code: 'body', message: 'invalid JSON body' });
      return;
    }
    const sessionId = parsed !== null && typeof parsed === 'object' && typeof parsed.sessionId === 'string'
      ? parsed.sessionId
      : '';
    if (!SESSION_ID_RE.test(sessionId) || sessionId === '.' || sessionId === '..') {
      sendJson(res, 400, { ok: false, code: 'invalid', message: 'invalid session id' });
      return;
    }
    try {
      const result = await deleteSession(ctx, sessionId);
      sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      if (error instanceof DeleteRefused) {
        sendJson(res, error.status, {
          ok: false,
          code: error.code,
          message: error.message,
          ...error.details === undefined ? {} : { details: error.details },
        });
        return;
      }
      ctx.logger?.warn?.(`session-delete: deleting '${sessionId}' failed: ${String(error)}`);
      sendJson(res, 500, {
        ok: false,
        code: 'io',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (req, res) => {
      handle(req, res).catch((error) => {
        ctx.logger?.warn?.(`session-delete: request failed: ${String(error)}`);
        if (!res.headersSent) sendJson(res, 500, { ok: false, code: 'io', message: 'delete failed' });
        else res.end();
      });
    },
  }), 'session-delete: route');
}
