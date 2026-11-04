window.__ModuleLoader__.load({
  id: 'dsh-sticky-notes',
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const h = React.createElement;

    const NS = 'sticky-notes';
    const PANEL_ID = 'sticky-notes';
    const STYLE_ID = 'dsh-sticky-notes-style';
    const API = '/sticky-notes/state';
    const COLORS = 4;
    const MAX_TEXT = 4000;
    const REFRESH_AFTER_MS = 30_000;

    const zh = {
      panel: '便签',
      title: '便签与待办',
      subtitle: '随手记下想法，把待办一条条处理掉。',
      'composer.placeholder': '记一条便签，或者一件要做的事…',
      'composer.hint': 'Enter 添加 · Shift+Enter 换行',
      'composer.submit': '添加',
      'kind.label': '记录类型',
      'kind.note': '便签',
      'kind.todo': '待办',
      'filter.label': '筛选',
      'filter.all': '全部',
      'filter.todo': '待办',
      'filter.done': '已完成',
      'filter.note': '便签',
      'search.label': '搜索',
      'search.placeholder': '搜索内容',
      'search.clear': '清除搜索',
      'stat.open': '待办',
      'stat.done': '已完成',
      'stat.note': '便签',
      'clear.action': '清除已完成',
      'clear.title': '删除所有已完成的待办',
      'status.loading': '正在加载…',
      'status.saving': '保存中…',
      'status.ready': '已保存',
      'status.error': '保存失败，稍后重试',
      'status.conflict': '别处已更新，已载入最新内容',
      'empty.title': '还没有便签',
      'empty.body': '在上面写下第一条便签或待办。',
      'empty.filtered': '这个筛选下没有内容',
      'empty.search': '没有匹配的内容',
      'error.title': '便签读取失败',
      'error.body': '无法连接本地便签存储，请稍后重试。',
      'error.retry': '重试',
      'card.done': '标记为已完成',
      'card.undone': '标记为未完成',
      'card.pin': '置顶',
      'card.unpin': '取消置顶',
      'card.edit': '编辑',
      'card.delete': '删除',
      'card.save': '保存',
      'card.cancel': '取消',
      'card.color': '便签颜色',
      'card.colorOption': '颜色 {index}',
      'card.pinnedTag': '已置顶',
      'undo.deleted': '已删除「{text}」',
      'undo.cleared': '已清除 {count} 项已完成',
      'undo.action': '撤销',
      dateLocale: 'zh-CN',
    };

    const en = {
      panel: 'Notes',
      title: 'Notes & todos',
      subtitle: 'Jot down ideas and work through the list one item at a time.',
      'composer.placeholder': 'Write a note, or something to do…',
      'composer.hint': 'Enter to add · Shift+Enter for a new line',
      'composer.submit': 'Add',
      'kind.label': 'Entry type',
      'kind.note': 'Note',
      'kind.todo': 'Todo',
      'filter.label': 'Filter',
      'filter.all': 'All',
      'filter.todo': 'Todos',
      'filter.done': 'Done',
      'filter.note': 'Notes',
      'search.label': 'Search',
      'search.placeholder': 'Search notes',
      'search.clear': 'Clear search',
      'stat.open': 'to do',
      'stat.done': 'done',
      'stat.note': 'notes',
      'clear.action': 'Clear done',
      'clear.title': 'Delete every completed todo',
      'status.loading': 'Loading…',
      'status.saving': 'Saving…',
      'status.ready': 'Saved',
      'status.error': 'Save failed, retrying',
      'status.conflict': 'Updated elsewhere; latest version loaded',
      'empty.title': 'No notes yet',
      'empty.body': 'Write your first note or todo above.',
      'empty.filtered': 'Nothing matches this filter',
      'empty.search': 'No matches',
      'error.title': 'Could not load your notes',
      'error.body': 'The local notes store is unreachable. Try again in a moment.',
      'error.retry': 'Retry',
      'card.done': 'Mark as done',
      'card.undone': 'Mark as not done',
      'card.pin': 'Pin',
      'card.unpin': 'Unpin',
      'card.edit': 'Edit',
      'card.delete': 'Delete',
      'card.save': 'Save',
      'card.cancel': 'Cancel',
      'card.color': 'Note color',
      'card.colorOption': 'Color {index}',
      'card.pinnedTag': 'Pinned',
      'undo.deleted': 'Deleted “{text}”',
      'undo.cleared': 'Cleared {count} completed items',
      'undo.action': 'Undo',
      dateLocale: 'en',
    };

    const CSS = `
.dsn-page{--dsn-accent:#d9a441;position:relative;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;color:var(--dsw-alias-label-primary,#1c1c1e);background:radial-gradient(820px 340px at 16% -160px,color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 10%,transparent),transparent 72%),var(--dsw-alias-bg-base,#fff);font:13px/1.55 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
.dsn-page *{box-sizing:border-box}
.dsn-page button,.dsn-page input,.dsn-page textarea{font-family:inherit}
.dsn-page :focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3b82f6);outline-offset:2px}
.dsn-head{flex:none;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;width:100%;max-width:1120px;margin:0 auto;padding:26px 32px 12px}
.dsn-head-main{min-width:0}
.dsn-title{margin:0;font-size:21px;line-height:1.25;font-weight:650;letter-spacing:-.015em}
.dsn-sub{margin:5px 0 0;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280)}
.dsn-head-side{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none}
.dsn-counts{display:flex;gap:16px;font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);font-variant-numeric:tabular-nums}
.dsn-stat{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}
.dsn-stat strong{font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-status{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap}
.dsn-status-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary,#2f9e63);flex:none}
.dsn-status[data-state="loading"] .dsn-status-dot,.dsn-status[data-state="saving"] .dsn-status-dot{background:var(--dsw-alias-state-warn-primary,#d09a2a)}
.dsn-status[data-state="error"] .dsn-status-dot{background:var(--dsw-alias-state-error-primary,#d33)}
.dsn-status[data-state="conflict"] .dsn-status-dot{background:var(--dsw-alias-state-warn-primary,#d09a2a)}
.dsn-composer{flex:none;width:100%;max-width:1120px;margin:0 auto;padding:0 32px 0}
.dsn-composer-card{border:1px solid var(--dsw-alias-border-l1,rgba(17,24,39,.12));border-radius:16px;background:var(--dsw-alias-bg-layer-1,#fff);padding:10px 12px 8px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 18px 36px -30px rgba(15,23,42,.55);transition:border-color .15s ease,box-shadow .15s ease}
.dsn-composer-card:focus-within{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 45%,var(--dsw-alias-border-l2,rgba(17,24,39,.2)));box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 12%,transparent)}
.dsn-input{display:block;width:100%;min-height:44px;max-height:180px;padding:4px 4px 0;border:0;background:transparent;color:inherit;font-size:14px;line-height:1.6;resize:none;outline:none;overflow-y:auto}
.dsn-input::placeholder{color:var(--dsw-alias-label-secondary,#9ca3af)}
.dsn-composer-row{display:flex;align-items:center;gap:10px;padding:6px 2px 2px}
.dsn-seg{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2,rgba(17,24,39,.05))}
.dsn-seg button{border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);padding:4px 11px;font-size:12px;line-height:1.4;cursor:pointer;transition:background .12s ease,color .12s ease}
.dsn-seg button[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1c1c1e);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.14)}
.dsn-hint{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary,#9ca3af)}
.dsn-primary{flex:none;border:0;border-radius:9px;background:var(--dsw-alias-brand-primary,#2f6fed);color:#fff;padding:6px 15px;font-size:12px;font-weight:600;line-height:1.5;cursor:pointer;transition:filter .12s ease,opacity .12s ease}
.dsn-primary:hover{filter:brightness(1.06)}
.dsn-primary:disabled{cursor:default;opacity:.4;filter:none}
.dsn-toolbar{flex:none;display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;max-width:1120px;margin:0 auto;padding:16px 32px 12px}
.dsn-tabs{display:inline-flex;gap:2px;padding:3px;border:1px solid var(--dsw-alias-border-l1,rgba(17,24,39,.1));border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2,#f3f4f6) 70%,transparent)}
.dsn-tab{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);padding:5px 11px;font-size:12px;line-height:1.4;cursor:pointer;transition:background .12s ease,color .12s ease}
.dsn-tab[aria-selected="true"]{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#1c1c1e);font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.dsn-tab-count{min-width:18px;padding:0 5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#6b7280) 12%,transparent);font-size:10.5px;font-weight:600;line-height:16px;text-align:center;font-variant-numeric:tabular-nums}
.dsn-ghost{border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);padding:5px 9px;font-size:12px;line-height:1.4;cursor:pointer;transition:background .12s ease,color .12s ease}
.dsn-ghost:hover{background:color-mix(in srgb,var(--dsw-alias-label-secondary,#6b7280) 10%,transparent);color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-search{position:relative;display:flex;align-items:center;margin-left:auto}
.dsn-search svg{position:absolute;left:9px;color:var(--dsw-alias-label-secondary,#9ca3af);pointer-events:none}
.dsn-search input{width:210px;padding:6px 28px 6px 29px;border:1px solid var(--dsw-alias-border-l1,rgba(17,24,39,.12));border-radius:9px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font-size:12px;line-height:1.5;outline:none;transition:border-color .12s ease}
.dsn-search input:focus{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 50%,var(--dsw-alias-border-l2,rgba(17,24,39,.2)))}
.dsn-search input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.dsn-search-clear{position:absolute;right:4px;display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#9ca3af);cursor:pointer}
.dsn-search-clear:hover{background:color-mix(in srgb,var(--dsw-alias-label-secondary,#6b7280) 12%,transparent);color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:2px 32px 44px;scrollbar-gutter:stable}
.dsn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(236px,1fr));gap:14px;max-width:1120px;margin:0 auto;align-items:start}
.dsn-card{--dsn-accent:#d9a441;position:relative;display:flex;flex-direction:column;gap:10px;padding:13px 13px 9px;border:1px solid color-mix(in srgb,var(--dsn-accent) 26%,var(--dsw-alias-border-l1,rgba(17,24,39,.12)));border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--dsn-accent) 9%,var(--dsw-alias-bg-layer-1,#fff)),var(--dsw-alias-bg-layer-1,#fff) 64%);box-shadow:0 1px 2px rgba(15,23,42,.05);transition:border-color .16s ease,box-shadow .16s ease}
.dsn-card::before{content:"";position:absolute;inset:0 0 auto;height:3px;border-radius:14px 14px 0 0;background:color-mix(in srgb,var(--dsn-accent) 65%,transparent);opacity:.9}
.dsn-card:hover{border-color:color-mix(in srgb,var(--dsn-accent) 45%,var(--dsw-alias-border-l2,rgba(17,24,39,.2)));box-shadow:0 14px 28px -22px rgba(15,23,42,.6)}
.dsn-card[data-color="0"]{--dsn-accent:#d9a441}
.dsn-card[data-color="1"]{--dsn-accent:#3fa08c}
.dsn-card[data-color="2"]{--dsn-accent:#5b8bd9}
.dsn-card[data-color="3"]{--dsn-accent:#c76b8a}
.dsn-card[data-done="true"]{opacity:.72}
.dsn-card[data-done="true"] .dsn-text{text-decoration:line-through;text-decoration-thickness:1.5px;opacity:.62}
.dsn-card-head{display:flex;align-items:flex-start;gap:9px;min-width:0}
.dsn-check{flex:none;display:grid;place-items:center;width:18px;height:18px;margin-top:2px;padding:0;border:1.5px solid color-mix(in srgb,var(--dsn-accent) 60%,var(--dsw-alias-border-l2,rgba(17,24,39,.25)));border-radius:6px;background:transparent;color:#fff;cursor:pointer;transition:background .12s ease,border-color .12s ease,transform .12s ease}
.dsn-check:hover{transform:scale(1.06)}
.dsn-check[aria-checked="true"]{border-color:var(--dsn-accent);background:var(--dsn-accent)}
.dsn-text{margin:0;font-size:13px;line-height:1.58;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.dsn-meta{display:flex;align-items:center;gap:7px;margin-top:auto;padding-top:2px;font-size:10.5px;color:var(--dsw-alias-label-secondary,#8b8f97);font-variant-numeric:tabular-nums}
.dsn-kind{padding:1px 6px;border-radius:5px;background:color-mix(in srgb,var(--dsn-accent) 16%,transparent);color:color-mix(in srgb,var(--dsn-accent) 70%,var(--dsw-alias-label-primary,#1c1c1e));font-weight:600;letter-spacing:.01em}
.dsn-actions{margin-left:auto;display:flex;gap:1px;opacity:0;transition:opacity .14s ease}
.dsn-card:hover .dsn-actions,.dsn-card:focus-within .dsn-actions,.dsn-card[data-pinned="true"] .dsn-actions{opacity:1}
.dsn-icon-btn{display:grid;place-items:center;width:24px;height:24px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#8b8f97);cursor:pointer;transition:background .12s ease,color .12s ease}
.dsn-icon-btn:hover{background:color-mix(in srgb,var(--dsw-alias-label-secondary,#6b7280) 14%,transparent);color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-icon-btn[aria-pressed="true"]{color:var(--dsn-accent)}
.dsn-icon-btn[data-danger]:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d33) 14%,transparent);color:var(--dsw-alias-state-error-primary,#d33)}
.dsn-editor{display:flex;flex-direction:column;gap:9px}
.dsn-edit{width:100%;min-height:88px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2,rgba(17,24,39,.18));border-radius:10px;background:var(--dsw-alias-bg-base,#fff);color:inherit;font-size:13px;line-height:1.58;resize:vertical;outline:none}
.dsn-edit:focus{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 55%,var(--dsw-alias-border-l2,rgba(17,24,39,.2)))}
.dsn-editor-row{display:flex;align-items:center;gap:6px}
.dsn-swatches{display:flex;gap:6px;align-items:center}
.dsn-swatch{width:16px;height:16px;padding:0;border:2px solid transparent;border-radius:50%;cursor:pointer;transition:transform .12s ease}
.dsn-swatch:hover{transform:scale(1.12)}
.dsn-swatch[aria-pressed="true"]{border-color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-swatch[data-swatch="0"]{background:#d9a441}
.dsn-swatch[data-swatch="1"]{background:#3fa08c}
.dsn-swatch[data-swatch="2"]{background:#5b8bd9}
.dsn-swatch[data-swatch="3"]{background:#c76b8a}
.dsn-editor-actions{margin-left:auto;display:flex;gap:6px}
.dsn-small{border:1px solid var(--dsw-alias-border-l1,rgba(17,24,39,.14));border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);padding:3px 10px;font-size:11.5px;line-height:1.5;cursor:pointer}
.dsn-small:hover{color:var(--dsw-alias-label-primary,#1c1c1e);background:color-mix(in srgb,var(--dsw-alias-label-secondary,#6b7280) 8%,transparent)}
.dsn-small[data-primary]{border-color:transparent;background:var(--dsw-alias-brand-primary,#2f6fed);color:#fff;font-weight:600}
.dsn-empty{max-width:1120px;margin:34px auto 0;padding:40px 24px;border:1px dashed var(--dsw-alias-border-l2,rgba(17,24,39,.18));border-radius:18px;text-align:center;color:var(--dsw-alias-label-secondary,#6b7280);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#fff) 60%,transparent)}
.dsn-empty svg{color:color-mix(in srgb,var(--dsw-alias-brand-primary,#3b82f6) 45%,var(--dsw-alias-label-secondary,#6b7280));margin-bottom:10px}
.dsn-empty h2{margin:0 0 6px;font-size:14px;font-weight:650;color:var(--dsw-alias-label-primary,#1c1c1e)}
.dsn-empty p{margin:0;font-size:12px;line-height:1.6}
.dsn-empty .dsn-primary{margin-top:16px}
.dsn-skeleton{height:118px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1,rgba(17,24,39,.08));background:linear-gradient(100deg,var(--dsw-alias-bg-layer-2,rgba(17,24,39,.04)) 20%,var(--dsw-alias-bg-layer-1,#fff) 52%,var(--dsw-alias-bg-layer-2,rgba(17,24,39,.04)) 84%);background-size:240% 100%;animation:dsn-shimmer 1.5s ease-in-out infinite}
@keyframes dsn-shimmer{0%{background-position:120% 0}100%{background-position:-40% 0}}
.dsn-toast{position:absolute;left:50%;bottom:20px;z-index:5;display:flex;align-items:center;gap:14px;max-width:min(520px,calc(100% - 48px));padding:8px 8px 8px 14px;border:1px solid var(--dsw-alias-border-l2,rgba(17,24,39,.16));border-radius:11px;background:var(--dsw-alias-bg-overlay,#1f2430);color:var(--dsw-alias-label-primary,#fff);box-shadow:0 16px 40px -18px rgba(0,0,0,.55);font-size:12px;transform:translateX(-50%);animation:dsn-toast-in .18s ease-out}
.dsn-toast-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsn-toast button{flex:none;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-brand-primary,#7fb2ff);padding:4px 9px;font-size:12px;font-weight:600;cursor:pointer}
.dsn-toast button:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary,#7fb2ff) 16%,transparent)}
@keyframes dsn-toast-in{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}
@media (hover:none){.dsn-actions{opacity:1}}
@media (max-width:760px){.dsn-head,.dsn-composer,.dsn-toolbar{padding-left:16px;padding-right:16px}.dsn-scroll{padding-left:16px;padding-right:16px}.dsn-head{align-items:flex-start;flex-direction:column;gap:10px}.dsn-head-side{align-items:flex-start}.dsn-search{margin-left:0;width:100%}.dsn-search input{width:100%}}
@media (prefers-reduced-motion:reduce){.dsn-page *{animation:none!important;transition:none!important}}
`;

    function injectStyle() {
      document.getElementById(STYLE_ID)?.remove();
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.setAttribute('data-plugin', 'dsh-sticky-notes');
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }

    function createId() {
      const random = Math.random().toString(36).slice(2, 10);
      return `n${Date.now().toString(36)}${random}`.slice(0, 60);
    }

    const stampFormatters = new Map();
    function stampFormatter(locale, options) {
      const key = `${locale}|${options.hour ? 'time' : 'date'}`;
      let formatter = stampFormatters.get(key);
      if (!formatter) {
        formatter = new Intl.DateTimeFormat(locale, options);
        stampFormatters.set(key, formatter);
      }
      return formatter;
    }

    function formatStamp(iso, locale) {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      const now = new Date();
      const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
      try {
        return stampFormatter(locale, sameDay
          ? { hour: '2-digit', minute: '2-digit' }
          : { month: '2-digit', day: '2-digit' }).format(date);
      } catch {
        return '';
      }
    }

    function formatFullStamp(iso, locale) {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '';
      try {
        return date.toLocaleString(locale);
      } catch {
        return date.toISOString();
      }
    }

    /**
     * The board store: one authoritative document, optimistic local edits, and a
     * single debounced writer that retries after a failed save.
     * @returns observable store consumed by the page through useSyncExternalStore.
     */
    function createNotesStore() {
      let snapshot = { status: 'init', items: [], revision: 0, error: null, notice: null, loadedAt: 0 };
      const listeners = new Set();
      let started = false;
      let disposed = false;
      let dirty = false;
      let timer = 0;
      let retryTimer = 0;
      let inFlight = null;
      let queued = false;

      const emit = (patch) => {
        snapshot = { ...snapshot, ...patch };
        for (const listener of [...listeners]) listener();
      };
      const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      const getSnapshot = () => snapshot;

      const load = async () => {
        emit({ status: 'loading', error: null });
        try {
          const response = await fetch(API, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json();
          if (disposed) return;
          const state = payload?.state ?? {};
          emit({
            status: 'ready',
            items: Array.isArray(state.items) ? state.items : [],
            revision: Number.isSafeInteger(state.revision) ? state.revision : 0,
            error: null,
            loadedAt: Date.now(),
          });
        } catch (error) {
          if (disposed) return;
          emit({ status: 'error', error: 'load' });
        }
      };

      const schedule = (delay = 320) => {
        if (disposed) return;
        clearTimeout(timer);
        timer = setTimeout(() => { timer = 0; void flush(); }, delay);
      };

      const flush = async () => {
        if (disposed || inFlight) {
          queued = inFlight != null;
          return;
        }
        if (!dirty) return;
        clearTimeout(timer);
        timer = 0;
        const payload = { baseRevision: snapshot.revision, items: snapshot.items };
        dirty = false;
        emit({ status: 'saving' });
        const request = (async () => {
          try {
            const response = await fetch(API, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (response.status === 409) {
              const conflict = await response.json().catch(() => null);
              const state = conflict?.state;
              if (disposed) return;
              if (state && Array.isArray(state.items)) {
                emit({
                  status: 'ready',
                  items: state.items,
                  revision: Number.isSafeInteger(state.revision) ? state.revision : snapshot.revision,
                  notice: 'conflict',
                  error: null,
                  loadedAt: Date.now(),
                });
                return;
              }
              throw new Error('conflict');
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (disposed) return;
            const state = data?.state;
            if (state && Array.isArray(state.items)) {
              emit({
                status: 'ready',
                items: state.items,
                revision: Number.isSafeInteger(state.revision) ? state.revision : snapshot.revision + 1,
                error: null,
                loadedAt: Date.now(),
              });
            } else {
              emit({ status: 'ready', error: null });
            }
          } catch (error) {
            if (disposed) return;
            dirty = true;
            emit({ status: 'error', error: 'save' });
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => { retryTimer = 0; void flush(); }, 4000);
          }
        })();
        inFlight = request;
        try {
          await request;
        } finally {
          if (inFlight === request) inFlight = null;
          if (queued || (dirty && snapshot.status !== 'error')) {
            queued = false;
            schedule(0);
          }
        }
      };

      const commit = (items) => {
        dirty = true;
        const status = snapshot.status === 'loading' || snapshot.status === 'saving' ? snapshot.status : 'ready';
        emit({ items, status });
        schedule();
      };

      return {
        subscribe,
        getSnapshot,
        start() {
          if (started || disposed) return;
          started = true;
          void load();
        },
        refresh() {
          if (!started || disposed || dirty || inFlight) return;
          if (snapshot.status === 'init' || snapshot.status === 'loading') return;
          if (Date.now() - snapshot.loadedAt < REFRESH_AFTER_MS) return;
          void load();
        },
        retry() {
          if (disposed) return;
          if (dirty) {
            void flush();
            return;
          }
          void load();
        },
        dismissNotice() {
          if (snapshot.notice !== null) emit({ notice: null });
        },
        flushNow() {
          clearTimeout(timer);
          timer = 0;
          void flush();
        },
        add(text, kind) {
          const value = String(text).trim().slice(0, MAX_TEXT);
          if (value === '') return null;
          const now = new Date().toISOString();
          const item = {
            id: createId(),
            kind: kind === 'todo' ? 'todo' : 'note',
            text: value,
            done: false,
            pinned: false,
            color: Math.floor(Math.random() * COLORS),
            createdAt: now,
            updatedAt: now,
          };
          commit([item, ...snapshot.items]);
          return item;
        },
        update(id, patch) {
          const now = new Date().toISOString();
          commit(snapshot.items.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch, updatedAt: now };
            if (next.kind !== 'todo') next.done = false;
            if (typeof next.text === 'string') next.text = next.text.slice(0, MAX_TEXT);
            return next;
          }));
        },
        remove(items) {
          const ids = new Set(items.map((item) => item.id));
          commit(snapshot.items.filter((item) => !ids.has(item.id)));
        },
        restore(items) {
          if (!Array.isArray(items) || items.length === 0) return;
          const existing = new Set(snapshot.items.map((item) => item.id));
          const restored = items.filter((item) => item && !existing.has(item.id));
          if (restored.length === 0) return;
          commit([...restored, ...snapshot.items]);
        },
        dispose() {
          disposed = true;
          clearTimeout(timer);
          clearTimeout(retryTimer);
          listeners.clear();
        },
      };
    }

    function icon(size, children, props) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 20 20', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, focusable: false, ...props,
      }, ...children);
    }

    const IconPin = ({ size = 14, filled = false }) => icon(size, [
      h('path', {
        key: 'p',
        d: 'M10 2.9l2.15 4.36 4.85.7-3.5 3.4.82 4.83L10 14.9l-4.32 2.29.82-4.83-3.5-3.4 4.85-.7z',
        fill: filled ? 'currentColor' : 'none',
      }),
    ]);

    const IconPencil = ({ size = 14 }) => icon(size, [
      h('path', { key: 'a', d: 'M13.1 3.2a1.6 1.6 0 0 1 2.27 0l1.43 1.43a1.6 1.6 0 0 1 0 2.27l-8.2 8.2-3.9.9.9-3.9z' }),
      h('path', { key: 'b', d: 'M11.6 4.7l3.7 3.7' }),
    ]);

    const IconTrash = ({ size = 14 }) => icon(size, [
      h('path', { key: 'a', d: 'M4.3 5.9h11.4' }),
      h('path', { key: 'b', d: 'M8 5.9V4.4h4v1.5' }),
      h('path', { key: 'c', d: 'M6.1 5.9l.63 9.1a1 1 0 0 0 1 .93h4.54a1 1 0 0 0 1-.93l.63-9.1' }),
      h('path', { key: 'd', d: 'M8.55 9v4.1M11.45 9v4.1' }),
    ]);

    const IconCheck = ({ size = 12 }) => icon(size, [
      h('path', { key: 'a', d: 'M4.4 10.4l3.3 3.3 7.9-7.9', strokeWidth: 2.1 }),
    ]);

    const IconSearch = ({ size = 13 }) => icon(size, [
      h('circle', { key: 'a', cx: 8.6, cy: 8.6, r: 4.7 }),
      h('path', { key: 'b', d: 'M12.2 12.2l3.9 3.9' }),
    ]);

    const IconClose = ({ size = 12 }) => icon(size, [
      h('path', { key: 'a', d: 'M5.2 5.2l9.6 9.6M14.8 5.2l-9.6 9.6' }),
    ]);

    const IconNote = ({ size = 34 }) => icon(size, [
      h('path', { key: 'a', d: 'M4.6 3.6h10.8l3 3v9.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 16.4V5.2a1.6 1.6 0 0 1 1.6-1.6z' }),
      h('path', { key: 'b', d: 'M15.4 3.6v3h3' }),
      h('path', { key: 'c', d: 'M6.4 8.1h6.4M6.4 11.1h7.4M6.4 14.1h4.6' }),
    ]);

    function useAutoGrow(ref, value, max = 180) {
      React.useEffect(() => {
        const node = ref.current;
        if (!node) return;
        node.style.height = 'auto';
        node.style.height = `${Math.min(node.scrollHeight, max)}px`;
      }, [ref, value, max]);
    }

    function Composer({ t, onAdd }) {
      const [text, setText] = React.useState('');
      const [kind, setKind] = React.useState('note');
      const inputRef = React.useRef(null);
      useAutoGrow(inputRef, text, 180);

      const submit = () => {
        const value = text.trim();
        if (value === '') return;
        onAdd(value, kind);
        setText('');
        inputRef.current?.focus();
      };

      return h('div', { className: 'dsn-composer' },
        h('div', { className: 'dsn-composer-card' },
          h('textarea', {
            ref: inputRef,
            className: 'dsn-input',
            rows: 1,
            value: text,
            placeholder: t('composer.placeholder'),
            'aria-label': t('composer.placeholder'),
            onChange: (event) => setText(event.target.value),
            onKeyDown: (event) => {
              if (event.key !== 'Enter' || event.shiftKey) return;
              if (event.nativeEvent?.isComposing === true || event.keyCode === 229) return;
              event.preventDefault();
              submit();
            },
          }),
          h('div', { className: 'dsn-composer-row' },
            h('div', { className: 'dsn-seg', role: 'group', 'aria-label': t('kind.label') },
              h('button', { type: 'button', 'aria-pressed': kind === 'note', onClick: () => setKind('note') }, t('kind.note')),
              h('button', { type: 'button', 'aria-pressed': kind === 'todo', onClick: () => setKind('todo') }, t('kind.todo'))),
            h('span', { className: 'dsn-hint' }, t('composer.hint')),
            h('button', {
              type: 'button',
              className: 'dsn-primary',
              disabled: text.trim() === '',
              onClick: submit,
            }, t('composer.submit')))));
    }

    function NoteEditor({ t, item, onSave, onCancel }) {
      const [text, setText] = React.useState(item.text);
      const [color, setColor] = React.useState(item.color);
      const ref = React.useRef(null);

      React.useEffect(() => {
        const node = ref.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(node.value.length, node.value.length);
      }, []);

      const save = () => {
        const value = text.trim();
        if (value === '') return;
        onSave({ text: value.slice(0, MAX_TEXT), color });
      };

      return h('div', { className: 'dsn-editor' },
        h('textarea', {
          ref,
          className: 'dsn-edit',
          value: text,
          'aria-label': t('card.edit'),
          onChange: (event) => setText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
              return;
            }
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              save();
            }
          },
        }),
        h('div', { className: 'dsn-editor-row' },
          h('div', { className: 'dsn-swatches', role: 'group', 'aria-label': t('card.color') },
            Array.from({ length: COLORS }, (_, index) => h('button', {
              key: index,
              type: 'button',
              className: 'dsn-swatch',
              'data-swatch': String(index),
              'aria-pressed': color === index,
              'aria-label': t('card.colorOption', { index: index + 1 }),
              onClick: () => setColor(index),
            }))),
          h('div', { className: 'dsn-editor-actions' },
            h('button', { type: 'button', className: 'dsn-small', onClick: onCancel }, t('card.cancel')),
            h('button', {
              type: 'button',
              className: 'dsn-small',
              'data-primary': true,
              disabled: text.trim() === '',
              onClick: save,
            }, t('card.save')))));
    }

    function NoteCard({ t, item, editing, onStartEdit, onCancelEdit, onSaveEdit, onToggle, onPin, onDelete }) {
      const locale = t('dateLocale');
      const summary = item.text.length > 48 ? `${item.text.slice(0, 48)}…` : item.text;

      return h('article', {
        className: 'dsn-card',
        'data-color': String(item.color),
        'data-kind': item.kind,
        'data-done': item.done ? 'true' : 'false',
        'data-pinned': item.pinned ? 'true' : 'false',
      },
        editing
          ? h(NoteEditor, { t, item, onSave: onSaveEdit, onCancel: onCancelEdit })
          : [
            h('div', { className: 'dsn-card-head', key: 'head' },
              item.kind === 'todo'
                ? h('button', {
                  type: 'button',
                  className: 'dsn-check',
                  role: 'checkbox',
                  'aria-checked': item.done,
                  'aria-label': `${t(item.done ? 'card.undone' : 'card.done')}: ${summary}`,
                  onClick: () => onToggle(item),
                }, item.done ? h(IconCheck, { size: 12 }) : null)
                : null,
              h('p', { className: 'dsn-text' }, item.text)),
            h('div', { className: 'dsn-meta', key: 'meta' },
              h('span', { className: 'dsn-kind' }, t(item.kind === 'todo' ? 'kind.todo' : 'kind.note')),
              h('time', {
                className: 'dsn-time',
                dateTime: item.updatedAt,
                title: formatFullStamp(item.updatedAt, locale),
              }, formatStamp(item.updatedAt, locale)),
              h('div', { className: 'dsn-actions' },
                h('button', {
                  type: 'button',
                  className: 'dsn-icon-btn',
                  'aria-pressed': item.pinned,
                  'aria-label': t(item.pinned ? 'card.unpin' : 'card.pin'),
                  title: t(item.pinned ? 'card.unpin' : 'card.pin'),
                  onClick: () => onPin(item),
                }, h(IconPin, { size: 14, filled: item.pinned })),
                h('button', {
                  type: 'button',
                  className: 'dsn-icon-btn',
                  'aria-label': t('card.edit'),
                  title: t('card.edit'),
                  onClick: () => onStartEdit(item.id),
                }, h(IconPencil, { size: 14 })),
                h('button', {
                  type: 'button',
                  className: 'dsn-icon-btn',
                  'data-danger': true,
                  'aria-label': t('card.delete'),
                  title: t('card.delete'),
                  onClick: () => onDelete(item),
                }, h(IconTrash, { size: 14 })))),
          ]);
    }

    function StatusPill({ t, status, notice }) {
      const state = notice === 'conflict' ? 'conflict' : status;
      const label = notice === 'conflict'
        ? t('status.conflict')
        : status === 'saving' ? t('status.saving')
          : status === 'loading' ? t('status.loading')
            : status === 'error' ? t('status.error')
              : t('status.ready');
      return h('div', { className: 'dsn-status', 'data-state': state, role: 'status', 'aria-live': 'polite' },
        h('span', { className: 'dsn-status-dot', 'aria-hidden': true }),
        h('span', null, label));
    }

    function EmptyState({ t, kind, onRetry }) {
      if (kind === 'error') {
        return h('div', { className: 'dsn-empty', role: 'alert' },
          h(IconNote, { size: 34 }),
          h('h2', null, t('error.title')),
          h('p', null, t('error.body')),
          h('button', { type: 'button', className: 'dsn-primary', onClick: onRetry }, t('error.retry')));
      }
      if (kind === 'filtered') {
        return h('div', { className: 'dsn-empty', role: 'status' },
          h(IconNote, { size: 34 }),
          h('h2', null, t('empty.filtered')));
      }
      return h('div', { className: 'dsn-empty', role: 'status' },
        h(IconNote, { size: 34 }),
        h('h2', null, t('empty.title')),
        h('p', null, t('empty.body')));
    }

    function NotesPage(props) {
      const t = typeof props.t === 'function' ? props.t : props.translate;
      const store = props.store;
      const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
      const [filter, setFilter] = React.useState('all');
      const [query, setQuery] = React.useState('');
      const [editingId, setEditingId] = React.useState(null);
      const [undo, setUndo] = React.useState(null);

      React.useEffect(() => {
        store.start();
        store.refresh();
      }, [store]);

      React.useEffect(() => {
        if (snapshot.notice === null) return undefined;
        const timer = setTimeout(() => store.dismissNotice(), 8000);
        return () => clearTimeout(timer);
      }, [snapshot.notice, store]);

      React.useEffect(() => {
        if (undo === null) return undefined;
        const timer = setTimeout(() => setUndo(null), 6000);
        return () => clearTimeout(timer);
      }, [undo]);

      const items = snapshot.items;
      const counts = React.useMemo(() => {
        let open = 0;
        let done = 0;
        let notes = 0;
        for (const item of items) {
          if (item.kind === 'todo') {
            if (item.done) done += 1;
            else open += 1;
          } else {
            notes += 1;
          }
        }
        return { open, done, notes, total: items.length };
      }, [items]);

      const visible = React.useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = items.filter((item) => {
          if (filter === 'todo' && !(item.kind === 'todo' && !item.done)) return false;
          if (filter === 'done' && !(item.kind === 'todo' && item.done)) return false;
          if (filter === 'note' && item.kind !== 'note') return false;
          if (needle !== '' && !item.text.toLowerCase().includes(needle)) return false;
          return true;
        });
        return filtered.sort((left, right) => (Number(right.pinned) - Number(left.pinned))
          || (Number(left.done) - Number(right.done))
          || (Date.parse(right.updatedAt) - Date.parse(left.updatedAt)));
      }, [items, filter, query]);

      const add = (text, kind) => {
        store.add(text, kind);
        if (filter === 'done' || (filter === 'note' && kind === 'todo') || (filter === 'todo' && kind === 'note')) setFilter('all');
      };
      const removeOne = (item) => {
        store.remove([item]);
        setUndo({ items: [item], kind: 'deleted' });
        if (editingId === item.id) setEditingId(null);
      };
      const removeDone = () => {
        const done = items.filter((item) => item.kind === 'todo' && item.done);
        if (done.length === 0) return;
        store.remove(done);
        setUndo({ items: done, kind: 'cleared' });
      };
      const undoNow = () => {
        if (undo !== null) store.restore(undo.items);
        setUndo(null);
      };

      const emptyKind = snapshot.status === 'error' && items.length === 0
        ? 'error'
        : (query.trim() !== '' || filter !== 'all' ? 'filtered' : 'empty');

      let body = null;
      if ((snapshot.status === 'init' || snapshot.status === 'loading') && items.length === 0) {
        body = h('div', { className: 'dsn-grid' },
          Array.from({ length: 6 }, (_, index) => h('div', { key: index, className: 'dsn-skeleton' })));
      } else if (snapshot.status === 'error' && items.length === 0) {
        body = h(EmptyState, { t, kind: 'error', onRetry: () => store.retry() });
      } else if (visible.length === 0) {
        body = h(EmptyState, { t, kind: emptyKind, onRetry: () => store.retry() });
      } else {
        body = h('div', { className: 'dsn-grid', role: 'list', 'aria-label': t('title') },
          visible.map((item) => h('div', { key: item.id, role: 'listitem' },
            h(NoteCard, {
              t,
              item,
              editing: editingId === item.id,
              onStartEdit: setEditingId,
              onCancelEdit: () => setEditingId(null),
              onSaveEdit: (patch) => {
                store.update(item.id, patch);
                setEditingId(null);
              },
              onToggle: (target) => store.update(target.id, { done: !target.done }),
              onPin: (target) => store.update(target.id, { pinned: !target.pinned }),
              onDelete: removeOne,
            }))));
      }

      const tabs = [
        ['all', t('filter.all'), counts.total],
        ['todo', t('filter.todo'), counts.open],
        ['done', t('filter.done'), counts.done],
        ['note', t('filter.note'), counts.notes],
      ];

      return h('section', { className: 'dsn-page', 'aria-label': t('title') },
        h('header', { className: 'dsn-head' },
          h('div', { className: 'dsn-head-main' },
            h('h1', { className: 'dsn-title' }, t('title')),
            h('p', { className: 'dsn-sub' }, t('subtitle'))),
          h('div', { className: 'dsn-head-side' },
            h('div', { className: 'dsn-counts' },
              h('span', { className: 'dsn-stat' }, h('strong', null, String(counts.open)), t('stat.open')),
              h('span', { className: 'dsn-stat' }, h('strong', null, String(counts.done)), t('stat.done')),
              h('span', { className: 'dsn-stat' }, h('strong', null, String(counts.notes)), t('stat.note'))),
            h(StatusPill, { t, status: snapshot.status, notice: snapshot.notice }))),
        h(Composer, { t, onAdd: add }),
        h('div', { className: 'dsn-toolbar' },
          h('div', { className: 'dsn-tabs', role: 'tablist', 'aria-label': t('filter.label') },
            tabs.map(([value, label, count]) => h('button', {
              key: value,
              type: 'button',
              role: 'tab',
              className: 'dsn-tab',
              'aria-selected': filter === value,
              onClick: () => setFilter(value),
            }, label, h('span', { className: 'dsn-tab-count' }, String(count))))),
          counts.done > 0 && filter !== 'note'
            ? h('button', { type: 'button', className: 'dsn-ghost', title: t('clear.title'), onClick: removeDone }, t('clear.action'))
            : null,
          h('div', { className: 'dsn-search' },
            h(IconSearch, { size: 13 }),
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('search.placeholder'),
              'aria-label': t('search.label'),
              onChange: (event) => setQuery(event.target.value),
            }),
            query !== ''
              ? h('button', {
                type: 'button',
                className: 'dsn-search-clear',
                'aria-label': t('search.clear'),
                onClick: () => setQuery(''),
              }, h(IconClose, { size: 12 }))
              : null)),
        h('div', { className: 'dsn-scroll' }, body),
        undo !== null
          ? h('div', { className: 'dsn-toast', role: 'status' },
            h('span', { className: 'dsn-toast-text' },
              undo.kind === 'cleared'
                ? t('undo.cleared', { count: undo.items.length })
                : t('undo.deleted', { text: undo.items[0].text.length > 24 ? `${undo.items[0].text.slice(0, 24)}…` : undo.items[0].text })),
            h('button', { type: 'button', onClick: undoNow }, t('undo.action')))
          : null);
    }

    function StickyNotesIcon({ size }) {
      const edge = Number.isFinite(size) ? size : 20;
      return icon(edge, [
        h('path', { key: 'a', d: 'M4.4 3.6h8.2l4 4v8.2a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6V5.2a1.6 1.6 0 0 1 1.6-1.6z' }),
        h('path', { key: 'b', d: 'M12.4 3.6v4.2h4.2' }),
        h('path', { key: 'c', d: 'M6.2 9.1h5.6M6.2 12.3h3.8' }),
      ], { width: edge, height: edge, strokeWidth: 1.5, strokeLinejoin: 'round' });
    }

    const inject = ['slots', 'locale'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-sticky-notes: dictionaries');
      ctx.effect(() => injectStyle(), 'dsh-sticky-notes: styles');
      const t = ctx.locale.bind(NS);
      const store = createNotesStore();
      ctx.effect(() => () => store.dispose(), 'dsh-sticky-notes: store');
      ctx.effect(() => {
        const flushHidden = () => {
          if (document.visibilityState === 'hidden') store.flushNow();
        };
        document.addEventListener('visibilitychange', flushHidden);
        window.addEventListener('pagehide', store.flushNow);
        return () => {
          document.removeEventListener('visibilitychange', flushHidden);
          window.removeEventListener('pagehide', store.flushNow);
        };
      }, 'dsh-sticky-notes: save lifecycle');

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => t('panel'),
      }, StickyNotesIcon));

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ store, translate: t }),
      }, NotesPage));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
