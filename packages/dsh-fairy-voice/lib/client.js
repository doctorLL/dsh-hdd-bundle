// dsh-fairy-voice client half.
//
// Ported from the pi-desktop `fairy-hdd` plugin, where the same cues are driven
// by a sidecar writing state.json and a widget window polling it. DSH needs
// none of that: this module lives in the same page as the conversation, so it
// reads the session and plays a file.
//
// The rule table is unchanged from upstream: a cue owns several variants, each
// with a priority. A higher priority may interrupt a lower one; a lower one is
// dropped while something more important is already speaking.

window.__ModuleLoader__.load({
  id: 'dsh-fairy-voice',
  factory: () => {
    const SOUND_ROUTE = '/fairy-voice/sounds';
    const SETTINGS_ROUTE = '/fairy-voice/settings';

    // Only the moments the upstream state table actually voices. An earlier
    // version of this port also spoke on every user message (`input`) and every
    // tool call (`activity`); both are absent upstream, and the `input` line
    // ("主人请提供进一步指示") lands right after the user's own question, which
    // reads as nonsense. Fewer cues, each in the right place.
    const SOUNDS = {
      // state 0 - agent started: delayed 500ms and cancelled if the turn
      // already moved on, so a burst of tool calls cannot stack the line.
      taskStart: {
        files: ['task-start-1.wav', 'task-start-2.wav', 'task-start-3.wav', 'task-start-4.wav'],
        priority: 2,
      },
      // state 4 / 5
      success: { files: ['success-1.wav', 'success-2.wav', 'success-3.wav'], priority: 2 },
      error: { files: ['error.wav'], priority: 3 },
      // Intro voice, tied to the app opening - not to a session switch.
      welcome: {
        files: [
          'welcome-1.wav', 'welcome-2.wav', 'welcome-3.wav', 'welcome-4.wav',
          'welcome-5.wav', 'welcome-6.wav', 'welcome-7.wav',
        ],
        priority: 2,
      },
      // Approval is its own channel, kept out of the state cues so a status
      // change cannot overwrite "the user has to decide something".
      permission: { files: ['permission-1.wav', 'permission-2.wav', 'permission-3.wav'], priority: 3 },
      approved: { files: ['permission-approved.wav'], priority: 3 },
      denied: { files: ['permission-denied.wav'], priority: 3 },
    };

    const settings = { enabled: true, volume: 0.6, cues: null };
    const lastVariant = new Map();
    let current = null;

    function pick(name) {
      const spec = SOUNDS[name];
      if (!spec || spec.files.length === 0) return null;
      const files = spec.files;
      let chosen = files[Math.floor(Math.random() * files.length)];
      // Avoid repeating the exact same variant back to back.
      if (files.length > 1 && chosen === lastVariant.get(name)) {
        chosen = files[(files.indexOf(chosen) + 1) % files.length];
      }
      lastVariant.set(name, chosen);
      return { file: chosen, priority: spec.priority };
    }

    function play(name) {
      if (!settings.enabled) return false;
      // Per-cue opt-out, read from the settings file: `{"cues":{"welcome":false}}`.
      // Anything not explicitly disabled stays on.
      if (settings.cues && settings.cues[name] === false) return false;
      const picked = pick(name);
      if (!picked) return false;
      if (current && picked.priority < current.priority) return false;
      try {
        const audio = new Audio(`${SOUND_ROUTE}/${picked.file}`);
        audio.volume = Math.min(1, Math.max(0, Number(settings.volume) || 0.6));
        const previous = current && current.audio;
        current = { priority: picked.priority, audio };
        const release = () => {
          if (current && current.audio === audio) current = null;
        };
        audio.addEventListener('ended', release);
        audio.addEventListener('error', release);
        // A rejected play() only means the page has not seen a gesture yet;
        // the next interaction retries naturally, so the cue is simply skipped.
        const started = audio.play();
        if (started && typeof started.catch === 'function') started.catch(release);
        if (previous) {
          try {
            previous.pause();
          } catch {
            /* already gone */
          }
        }
        return true;
      } catch {
        current = null;
        return false;
      }
    }

    // The conversation surface stamps the session it is showing. `sessions.list`
    // carries no `current` on 0.2.1-rc.5 (see dsh-fairy-visual's controller for
    // the same finding), so the DOM is the reliable source.
    function currentSessionId() {
      const surface = document.querySelector('[data-conversation-region="chat"]');
      const stamped = surface && surface.getAttribute ? surface.getAttribute('data-conversation-session') : null;
      return stamped === undefined || stamped === null || stamped === '' ? undefined : stamped;
    }

    function apply(ctx) {
      const state = {
        sessionId: undefined,
        session: null,
        offSnapshot: null,
        offEvents: null,
        lastSeq: -1,
        wasRunning: false,
        attempts: 0,
      };

      // Coalesced re-bind. A session switch can replace the whole conversation
      // subtree (a childList change, no attribute record), so the watcher has to
      // see childList as well - but that fires on every streamed token. Fold all
      // of it into at most one lookup per frame.
      let scheduled = 0;
      // Approval is detected from the panel's own marker. The host never tells
      // the client whether a request was allowed, so the outcome is inferred the
      // way upstream does it: the tool starting right after the panel closes is
      // an approval, a quiet close is a denial.
      const approval = { present: false, pending: null, timer: 0 };

      function checkApproval() {
        const panelPresent = Boolean(document.querySelector('[data-approval-key]'));
        if (panelPresent && !approval.present) {
          approval.present = true;
          approval.pending = { decided: false };
          if (approval.timer) {
            clearTimeout(approval.timer);
            approval.timer = 0;
          }
          play('permission');
          return;
        }
        if (!panelPresent && approval.present) {
          approval.present = false;
          if (approval.pending && !approval.pending.decided) {
            approval.timer = setTimeout(() => {
              approval.timer = 0;
              if (approval.pending && !approval.pending.decided) {
                approval.pending.decided = true;
                play('denied');
              }
              approval.pending = null;
            }, 400);
          }
        }
      }

      function settleApproval() {
        if (!approval.pending || approval.pending.decided) return false;
        approval.pending.decided = true;
        if (approval.timer) {
          clearTimeout(approval.timer);
          approval.timer = 0;
        }
        play('approved');
        approval.pending = null;
        return true;
      }

      // Upstream delays the task-start line by 500ms and drops it if the turn
      // already moved on, so a burst of tool calls cannot stack the sentence.
      let taskStartTimer = 0;
      function scheduleTaskStart() {
        if (taskStartTimer) return;
        taskStartTimer = setTimeout(() => {
          taskStartTimer = 0;
          const snap = state.session && state.session.getSnapshot ? state.session.getSnapshot() : null;
          if (snap && snap.running === false) return;
          play('taskStart');
        }, 500);
      }

      function cancelTaskStart() {
        if (!taskStartTimer) return;
        clearTimeout(taskStartTimer);
        taskStartTimer = 0;
      }

      function scheduleBind() {
        if (scheduled) return;
        const run = () => {
          scheduled = 0;
          bind();
          checkApproval();
        };
        scheduled = typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(run)
          : setTimeout(run, 16);
      }

      function unbind() {
        if (typeof state.offSnapshot === 'function') state.offSnapshot();
        if (typeof state.offEvents === 'function') state.offEvents();
        state.offSnapshot = null;
        state.offEvents = null;
        state.session = null;
        state.sessionId = undefined;
      }

      function onSnapshot() {
        const snap = state.session && state.session.getSnapshot ? state.session.getSnapshot() : null;
        if (!snap) return;
        const running = Boolean(snap.running);
        if (state.wasRunning && !running) {
          // The turn is over - a queued task-start line is now stale.
          cancelTaskStart();
          const error = snap.promptError;
          if (error && error.op === 'stop') return;
          if (snap.lastAgentError) play('error');
          else play('success');
        }
        state.wasRunning = running;
      }

      function onEvents() {
        const source = state.session && state.session.eventSource;
        const window_ = source && source.getSnapshot ? source.getSnapshot() : null;
        const entries = window_ && window_.entries;
        if (!Array.isArray(entries) || entries.length === 0) return;
        for (const entry of entries) {
          const event = entry && entry.event;
          if (!event) continue;
          const seq = typeof event.seq === 'number' ? event.seq : -1;
          if (seq <= state.lastSeq) continue;
          state.lastSeq = seq;
          const type = event.type;
          // Upstream voices only state 0 here; states 1..3 are silent. `input`
          // and `activity` used to speak and were removed for that reason.
          if (type === 'turn/start') scheduleTaskStart();
          else if (type === 'tool/call') {
            // A tool that starts right after the approval panel closed is the
            // approval signal.
            settleApproval();
          }
        }
      }

      function bind() {
        const id = currentSessionId();
        if (id === state.sessionId && state.session) return;
        unbind();
        if (!id) return;
        const binding = ctx.sessions.binding(id);
        const session = binding && binding.session;
        // The conversation retains the session, but a freshly switched session
        // is not necessarily retained by the time the node changes. Retrying a
        // bounded number of times is what makes a session switch bind at all -
        // returning here silently was why switching produced no welcome cue.
        if (!session) {
          if (state.attempts < 6) {
            state.attempts += 1;
            setTimeout(scheduleBind, 300);
          }
          return;
        }
        state.attempts = 0;
        state.sessionId = id;
        state.session = session;
        const snap = session.getSnapshot ? session.getSnapshot() : null;
        state.wasRunning = Boolean(snap && snap.running);
        // Skip the history that is already in the window, or every bind would
        // replay the whole conversation as sound.
        const source = session.eventSource;
        const existing = source && source.getSnapshot ? source.getSnapshot() : null;
        const entries = existing && Array.isArray(existing.entries) ? existing.entries : [];
        state.lastSeq = entries.reduce((max, entry) => {
          const seq = entry && entry.event && typeof entry.event.seq === 'number' ? entry.event.seq : -1;
          return seq > max ? seq : max;
        }, -1);
        if (session.subscribe) state.offSnapshot = session.subscribe(onSnapshot);
        if (source && source.subscribe) state.offEvents = source.subscribe(onEvents);
      }

      ctx.effect(() => {
        let disposed = false;
        const watcher = typeof MutationObserver === 'function'
          ? new MutationObserver(() => {
            if (!disposed) scheduleBind();
          })
          : null;
        if (watcher) {
          watcher.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-conversation-session'],
            childList: true,
            subtree: true,
          });
        }
        bind();
        checkApproval();
        // The welcome line belongs to the app opening (upstream plays it with
        // the boot intro), not to every session switch - speaking it on each
        // switch is what made the voice feel like it was narrating nothing.
        play('welcome');
        // Mount race: React writes data-conversation-session while creating the
        // element, which produces no attribute record, so a module that mounts
        // before the conversation exists would never bind. A few bounded
        // retries cover the first paint.
        const retries = [0, 300, 1000, 2500, 5000].map((delay) => setTimeout(() => {
          if (!disposed) bind();
        }, delay));
        return () => {
          disposed = true;
          for (const timer of retries) clearTimeout(timer);
          if (approval.timer) {
            clearTimeout(approval.timer);
            approval.timer = 0;
          }
          approval.pending = null;
          if (watcher) watcher.disconnect();
          unbind();
        };
      }, 'dsh-fairy-voice binding');

      // Preference is optional: a failed read keeps the defaults, and the
      // feature never depends on the network.
      ctx.effect(() => {
        let alive = true;
        fetch(SETTINGS_ROUTE, { cache: 'no-store', credentials: 'same-origin' })
          .then((response) => (response.ok ? response.json() : null))
          .then((value) => {
            if (!alive || !value || typeof value !== 'object') return;
            if (typeof value.enabled === 'boolean') settings.enabled = value.enabled;
            if (typeof value.volume === 'number') settings.volume = value.volume;
            if (value.cues && typeof value.cues === 'object') settings.cues = value.cues;
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, 'dsh-fairy-voice settings');
    }

    return { name: 'dsh-fairy-voice', inject: ['sessions'], apply };
  },
});
