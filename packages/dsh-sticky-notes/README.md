# dsh-sticky-notes

Fairy 的便签插件：在 DSH 侧边栏加一个「便签」入口，点开是完整的便签 + 待办看板。

## 功能

- 一条输入框同时记「便签」和「待办」，Enter 添加、Shift+Enter 换行（中文输入法回车不会误提交）。
- 待办可勾选完成，支持「全部 / 待办 / 已完成 / 便签」筛选和全文搜索。
- 便签可置顶、改色、就地编辑、删除，删除和「清除已完成」都能撤销。
- 内容由 Host 端落盘到 `$DSH_HOME/sticky-notes/notes.json`，重启、换端口、清浏览器缓存都不会丢。
- 浅色 / 深色主题跟随 DSH 的 theme token。

## 数据接口

Host 半注册了同源路由 `/sticky-notes/state`：

| 方法 | 请求 | 响应 |
| --- | --- | --- |
| `GET` | — | `{ state: { version, revision, updatedAt, items } }` |
| `PUT` | `{ baseRevision, items }` | `200 { state }`，版本不匹配时 `409 { error, state }` |

每次写入都是临时文件 + rename 的原子替换；`items` 在写入前会被规范化（丢弃坏行、裁剪文本、限制 200 条）。

## 结构

- `lib/index.js`：Host 半，负责落盘和 HTTP 路由。
- `lib/client.js`：浏览器模块，注册 `sidebar.panellist` 图标与 `main` 面板，内含看板 UI 与本地存储客户端。
- `locale/*.json`：插件管理页里的标题与描述。
- `icon.svg`：插件图标。

## 开发

```bash
node --test test/*.test.js
```
