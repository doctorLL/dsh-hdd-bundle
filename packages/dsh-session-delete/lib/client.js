// Client half of dsh-session-delete.
//
// Adds one row to a Session's “...” menu and the frame-wide confirmation
// dialog. The menu row is hidden for the conversation currently on screen:
// the Host refuses to delete a live Session (its writer would recreate the
// log on teardown), so offering the action there would only produce an error.
//
// The IIFE is the module-table entry the browser expects: the factory's return
// value IS the plugin object ({ name, inject, apply }).

window.__ModuleLoader__.load({
  id: 'dsh-session-delete',
  factory: (require) => {
    const React = require('react');
    const h = React.createElement;
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');

    const NS = 'session-delete';
    const ENDPOINT = '/fairy-session-delete/delete';

    // Locale dictionaries use flat, dotted keys: the locale service resolves
    // `dict['menu.deleteSession']`, so a nested object would render the key.
    const zh = {
      'menu.deleteSession': '永久删除',
      'confirm.title': '永久删除这个对话？',
      'confirm.desc': '“{title}” 将从本机彻底删除。',
      'confirm.warning': '聊天记录、工具调用记录与本地缓存都会被删除，此操作无法撤销。',
      'confirm.action': '永久删除',
      'confirm.deleting': '正在删除…',
      'confirm.untitled': '未命名对话',
      'activity.turn': '一个正在进行的回合',
      'activity.subagent': '{count} 个运行中的子代理',
      'activity.job': '{count} 个未结束的后台任务',
      'activity.schedule': '{count} 个定时任务',
      'activity.other': '其他运行中的工作',
      'cancel': '取消',
      'close': '关闭',
      'error.live': '这个对话仍在运行或使用中。请先停止它的任务并切换到其他对话，再删除。',
      'error.active': '这个对话还有运行中的工作，停止后才能删除：',
      'error.unsupported': '无法定位这个对话的存储目录，删除未执行。',
      'error.io': '删除文件失败：{message}',
      'error.generic': '删除失败：{message}',
    };

    const en = {
      'menu.deleteSession': 'Delete permanently',
      'confirm.title': 'Delete this conversation permanently?',
      'confirm.desc': '“{title}” will be removed from this device.',
      'confirm.warning': 'Chat history, tool records, and local cache will be deleted. This cannot be undone.',
      'confirm.action': 'Delete permanently',
      'confirm.deleting': 'Deleting…',
      'confirm.untitled': 'Untitled conversation',
      'activity.turn': 'an active turn',
      'activity.subagent': '{count} running subagent(s)',
      'activity.job': '{count} unfinished background job(s)',
      'activity.schedule': '{count} scheduled task(s)',
      'activity.other': 'other running work',
      'cancel': 'Cancel',
      'close': 'Close',
      'error.live': 'This conversation is open. Switch to another conversation before deleting it.',
      'error.active': 'This conversation still has running work. Stop it before deleting:',
      'error.unsupported': 'This conversation’s storage directory could not be located; nothing was deleted.',
      'error.io': 'The files could not be removed: {message}',
      'error.generic': 'The conversation could not be deleted: {message}',
    };

    const styles = {
      warning: {
        margin: '10px 0 0',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: '13px',
        lineHeight: '20px',
      },
      error: {
        margin: '10px 0 0',
        color: 'var(--dsw-alias-state-error-primary)',
        fontSize: '13px',
        lineHeight: '20px',
      },
      activity: {
        margin: '6px 0 0',
        paddingLeft: '18px',
        color: 'var(--dsw-alias-label-secondary)',
        fontSize: '12px',
        lineHeight: '18px',
      },
      danger: {
        color: 'var(--dsw-alias-state-error-primary)',
      },
    };

    function activityText(entry, t) {
      const count = Array.isArray(entry?.items) ? entry.items.length : 1;
      switch (entry?.kind) {
        case 'turn':
          return t('activity.turn');
        case 'subagent':
          return t('activity.subagent', { count });
        case 'job':
          return t('activity.job', { count });
        case 'schedule':
          return t('activity.schedule', { count });
        default:
          return t('activity.other');
      }
    }

    function apply(ctx) {
      // One pending request shared by the menu row (writer) and the overlay
      // dialog (reader). A module-level store keeps the two trees independent.
      let request = null;
      const listeners = new Set();
      const pending = {
        get: () => request,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        open: (next) => {
          request = next;
          for (const listener of listeners) listener();
        },
        close: () => {
          request = null;
          for (const listener of listeners) listener();
        },
      };

      function usePending() {
        return React.useSyncExternalStore(pending.subscribe, pending.get, pending.get);
      }

      /** The Session the main conversation view currently holds, if any. */
      function mainSessionId() {
        const list = ctx.sessions?.list?.getSnapshot?.();
        if (list === undefined) return undefined;
        return Object.values(list.byId ?? {}).find((row) => (row.retainedBy?.mainView ?? 0) > 0)?.id;
      }

      /** A non-archived, non-blank Session to show after leaving the deleted one. */
      function pickFallback(sessionId) {
        const list = ctx.sessions?.list?.getSnapshot?.();
        if (list === undefined) return undefined;
        const archived = new Set(ctx.get?.('workspaces')?.list?.getSnapshot?.().archivedSessionIds ?? []);
        return (list.ids ?? []).find((id) => id !== sessionId
          && list.byId?.[id] !== undefined
          && list.byId[id].blank !== true
          && !archived.has(id));
      }

      /**
       * Deleting a Session that is still on screen would leave the view bound
       * to a removed log, and its writer could recreate it on the next event.
       * Move to another conversation first; the Host then removes the log while
       * the old Session is idle and no longer in the main view.
       */
      async function leaveCurrentSession(sessionId) {
        if (mainSessionId() !== sessionId) return;
        const fallback = pickFallback(sessionId);
        if (fallback !== undefined) ctx.uiWorkspace.openSession(fallback);
        else ctx.uiWorkspace.startSession();
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      async function postDelete(sessionId) {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        if (!response.ok || payload === null || payload.ok !== true) {
          const error = new Error(payload?.message || `HTTP ${response.status}`);
          error.code = payload?.code || 'http';
          error.activity = payload?.details?.activity;
          throw error;
        }
        return payload;
      }

      /**
       * Wait until this client no longer retains the Session. A reference the
       * main view released a moment ago can still be counting down on the
       * Host; deleting before that settles would meet a live Session.
       */
      async function waitForRelease(sessionId) {
        const started = Date.now();
        while (Date.now() - started < 2500) {
          const info = ctx.sessions?.retainInfo?.(sessionId)?.getSnapshot?.();
          if (info === undefined || (info.referenceCount ?? 0) === 0) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      /**
       * A just-left Session can stay live for a few hundred milliseconds while
       * its Agent disposes. Retry a `live` refusal instead of turning that
       * transient state into a permanent “cannot delete” for the user.
       */
      async function requestDelete(sessionId) {
        let lastError;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            return await postDelete(sessionId);
          } catch (error) {
            lastError = error;
            if (error?.code !== 'live') throw error;
            await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          }
        }
        throw lastError;
      }

      function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, t }) {
        const [, setMenuOpen] = useMenuOpenState();
        return h(primitives.MenuItemButton, {
          icon: h(primitives.IconTrashOutlineRegular, { size: 14 }),
          onSelect: () => {
            setMenuOpen(false);
            pending.open({ sessionId, displayTitle });
          },
          children: t('menu.deleteSession'),
        });
      }

      function DeleteSessionDialog({ t }) {
        const activeRequest = usePending();
        if (activeRequest === null) return null;
        return h(DeleteSessionForm, {
          key: activeRequest.sessionId,
          request: activeRequest,
          onSettle: pending.close,
          t,
        });
      }

      function DeleteSessionForm({ request: activeRequest, onSettle, t }) {
        const [deleting, setDeleting] = React.useState(false);
        const [error, setError] = React.useState(null);

        const close = () => {
          if (deleting) return;
          onSettle();
        };

        const confirm = () => {
          if (deleting) return;
          setDeleting(true);
          setError(null);
          (async () => {
            try {
              await leaveCurrentSession(activeRequest.sessionId);
              await waitForRelease(activeRequest.sessionId);
              await requestDelete(activeRequest.sessionId);
              if (typeof ctx.sessions?.refresh === 'function') await ctx.sessions.refresh();
              setDeleting(false);
              onSettle();
            } catch (reason) {
              setDeleting(false);
              setError(reason);
            }
          })();
        };

        const activity = error?.code === 'active' && Array.isArray(error.activity) ? error.activity : [];
        const errorText = error === null
          ? null
          : error.code === 'live'
            ? t('error.live')
            : error.code === 'active'
              ? t('error.active')
              : error.code === 'unsupported'
                ? t('error.unsupported')
                : error.code === 'io'
                  ? t('error.io', { message: error.message })
                  : t('error.generic', { message: error.message });

        const children = [
          h('p', { key: 'warning', style: styles.warning, children: t('confirm.warning') }),
        ];
        if (errorText !== null) {
          children.push(h('p', {
            key: 'error',
            role: 'alert',
            style: styles.error,
            children: errorText,
          }));
        }
        if (activity.length > 0) {
          children.push(h('ul', {
            key: 'activity',
            style: styles.activity,
            children: activity.map((entry, index) => h('li', {
              key: `${entry?.kind ?? 'other'}-${index}`,
              children: activityText(entry, t),
            })),
          }));
        }

        return h(primitives.Modal, {
          open: true,
          onClose: close,
          closeLabel: t('close'),
          title: t('confirm.title'),
          description: t('confirm.desc', {
            title: activeRequest.displayTitle || t('confirm.untitled'),
          }),
          footer: h(React.Fragment, null,
            h(primitives.Button, {
              key: 'cancel',
              variant: 'outline',
              disabled: deleting,
              onClick: close,
              children: t('cancel'),
            }),
            h(primitives.Button, {
              key: 'delete',
              variant: 'outline',
              style: styles.danger,
              disabled: deleting,
              onClick: confirm,
              children: deleting ? t('confirm.deleting') : t('confirm.action'),
            })),
          children,
        });
      }

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-delete: dictionaries');

      ctx.effect(() => ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
        name: 'sidebar.workspaces.session.menu.item',
        id: 'session-delete',
        order: 500,
        locale: NS,
      }, DeleteSessionMenuItem)), 'session-delete: menu row');

      ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'session-delete-confirm',
        order: 1000,
        locale: NS,
      }, DeleteSessionDialog)), 'session-delete: confirm dialog');
    }

    return { name: 'dsh-session-delete', inject: ['slots', 'sessions', 'uiWorkspace', 'locale'], apply };
  },
});
