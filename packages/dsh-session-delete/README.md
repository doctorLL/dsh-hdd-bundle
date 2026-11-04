# dsh-session-delete

Adds a **permanent delete** action to each conversation in the workspace
sidebar. The shipped UI only offers *archive*, which keeps the append-only
session log, its projection cache, and its workspace membership on disk.

## What the action removes

1. The session log directory (`$DSH_HOME/sessions/<project>/<session>/`).
2. The projection-cache row (`$DSH_HOME/storages/session_projcache/sessions/<id>.json`).
3. The id from workspace accounting and from the global archive/pin sets.

The confirmation dialog states that the removal is irreversible. A live
conversation (the one on screen) is not offered the action, and the Host
refuses a session with running work (turn, background job, subagent, or
schedule) so a writer cannot recreate the log after teardown.

The action is user-only. No agent tool is registered for permanent deletion.

## Layout

- `index.js` — Host half: `POST /fairy-session-delete/delete` and the removal
  sequence (file log, projection cache, workspace membership).
- `lib/client.js` — browser half: the `...` menu row and the `shell.overlay`
  confirmation dialog.
- `cordis.patch.yml` — bundle row (`session-delete`).
- `locale/` — Plugin Manager metadata.
