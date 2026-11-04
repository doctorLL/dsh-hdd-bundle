// dsh-fairy-voice host half.
//
// The voice feature is rule-selected playback of pre-recorded cues, not TTS:
// the client decides WHICH cue fits the current state and asks for the file, so
// this half only has to hand out the bundled WAVs and remember one preference.
//
// Why one exact route per file instead of a prefix route: the carrier's route
// kinds are a closed set and `exact` is the only one this port has already
// verified against 0.2.1-rc.5. Forty-odd routes cost nothing and remove the
// guesswork.

import { createReadStream, readdirSync, statSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-fairy-voice';

export const inject = ['webServer'];

const HERE = dirname(fileURLToPath(import.meta.url));
const SOUND_DIR = join(HERE, '..', 'assets', 'sounds');
const SOUND_ROUTE = '/fairy-voice/sounds';
const SETTINGS_ROUTE = '/fairy-voice/settings';

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const SETTINGS_DIR = join(DSH_HOME, 'fairy-voice');
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json');
const MAX_BODY_BYTES = 8 * 1024;

const DEFAULTS = Object.freeze({ enabled: true, volume: 0.6 });

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readSettings() {
  try {
    const parsed = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8'));
    return isPlainObject(parsed) ? { ...DEFAULTS, ...parsed } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeSettings(next) {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  const temporary = `${SETTINGS_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  renameSync(temporary, SETTINGS_FILE);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function listSounds() {
  try {
    return readdirSync(SOUND_DIR).filter((file) => file.endsWith('.wav'));
  } catch {
    return [];
  }
}

export function apply(ctx) {
  ctx.effect(() => {
    const disposers = [];

    for (const file of listSounds()) {
      const absolute = join(SOUND_DIR, file);
      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path: `${SOUND_ROUTE}/${file}`,
        handler: (req, res) => {
          let size;
          try {
            size = statSync(absolute).size;
          } catch {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.statusCode = 200;
          res.setHeader('content-type', 'audio/wav');
          // The filename is content-addressed by release; a long cache keeps
          // repeated cues off the wire without risking a stale sound.
          res.setHeader('cache-control', 'public, max-age=31536000, immutable');
          res.setHeader('content-length', String(size));
          if (String(req.method || 'GET').toUpperCase() === 'HEAD') {
            res.end();
            return;
          }
          const stream = createReadStream(absolute);
          stream.on('error', () => res.destroy());
          stream.pipe(res);
        },
      }));
    }

    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: SETTINGS_ROUTE,
      handler: (req, res) => {
        const method = String(req.method || 'GET').toUpperCase();
        if (method === 'GET') {
          sendJson(res, 200, readSettings());
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
            const current = readSettings();
            const next = { ...current };
            if (isPlainObject(parsed)) {
              if (typeof parsed.enabled === 'boolean') next.enabled = parsed.enabled;
              if (typeof parsed.volume === 'number' && Number.isFinite(parsed.volume)) {
                next.volume = Math.min(1, Math.max(0, parsed.volume));
              }
            }
            try {
              writeSettings(next);
            } catch {
              sendJson(res, 500, { error: 'write-failed' });
              return;
            }
            sendJson(res, 200, next);
          })
          .catch(() => {
            if (!res.writableEnded) sendJson(res, 400, { error: 'bad-request' });
          });
      },
    }));

    return () => {
      for (const dispose of disposers.reverse()) dispose();
    };
  }, 'dsh-fairy-voice routes');
}
