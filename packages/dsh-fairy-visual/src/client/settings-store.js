// Client-side replacement for `ctx.settingsScope.bind({ namespace })`, which is
// not part of the 0.2.1-rc.5 client service catalog (a plugin that injects it
// simply never activates).
//
// The shape is kept identical to the old scope so the controller and the
// settings section stay untouched:
//
//   getSnapshot() -> { value }   (STABLE wrapper, FRESH `value` on every change)
//   subscribe(fn) -> unsubscribe
//   set(field, value) -> optimistic merge, then persist
//
// The stable wrapper matters: the settings section feeds `getSnapshot().value`
// into useState, and the old code warned that a fresh wrapper on every read
// makes React abort the section render.

const ROUTE = '/fairy-visual/settings';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createSettingsScope(namespace, options) {
  const opts = options || {};
  const onError = typeof opts.onError === 'function' ? opts.onError : function noop() {};
  const listeners = new Set();
  // Stable identity, replaced `value` — see the note above.
  const snapshot = { value: isPlainObject(opts.defaults) ? { ...opts.defaults } : {} };
  let disposed = false;
  let hydrating = null;
  let writes = Promise.resolve();

  function emit() {
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch (error) {
        onError(error);
      }
    }
  }

  function apply(next, replace) {
    if (!isPlainObject(next)) return;
    snapshot.value = replace ? { ...next } : { ...snapshot.value, ...next };
    emit();
  }

  function namespacesOf(payload) {
    if (!isPlainObject(payload)) return {};
    return isPlainObject(payload.namespaces) ? payload.namespaces : {};
  }

  function adopt(payload) {
    if (disposed) return;
    const value = namespacesOf(payload)[namespace];
    if (isPlainObject(value)) apply(value, true);
  }

  function hydrate() {
    if (hydrating) return hydrating;
    hydrating = fetch(ROUTE, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(adopt)
      .catch((error) => onError(error))
      .then(() => {
        hydrating = null;
      });
    return hydrating;
  }

  function persist(patch) {
    writes = writes
      .then(() =>
        fetch(ROUTE, {
          method: 'POST',
          cache: 'no-store',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ namespace, patch }),
        }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then(adopt)
      .catch((error) => onError(error));
    return writes;
  }

  const scope = {
    namespace,
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') return function unsubscribe() {};
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    },
    set(field, value) {
      if (typeof field !== 'string' || !field) return;
      const patch = { [field]: value };
      apply(patch, false);
      void persist(patch);
    },
    replace(next) {
      if (!isPlainObject(next)) return;
      apply(next, true);
      void persist(next);
    },
    ready() {
      return hydrate();
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };

  void hydrate();
  return scope;
}

module.exports = { createSettingsScope, SETTINGS_ROUTE: ROUTE };
