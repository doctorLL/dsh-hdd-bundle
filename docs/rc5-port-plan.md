# Fairy-DSH → 本机 DSH 0.2.1-rc.5 全量移植计划（语音除外）

> 注：本文写于 2026-11-03 的目录重构之前，文中的 `fairy-suite/`、`fairy-port/` 路径已不再存在。
> 现在的对应关系：`fairy-suite/packages/*` → `packages/*`，`fairy-suite/tools/` → `tools/`，
> `fairy-suite/PLAN.md` → `docs/rc5-port-plan.md`；上游 rc.2 基线在 `legacy/rc2/`。

> 目录：`E:\Code\Fairy-DSH-main\fairy-suite\`（原 `fairy-visual/` 等 5 个包**不改**，作为 rc.2 参考与回滚基线）
> 原 `fairy-port/` 是权限死锁的废弃目录，可忽略。

## 0. 已核实的环境事实

| 项 | 值 |
| --- | --- |
| DSH 版本 | `0.2.1-rc.5`（原项目锁定 `0.1.1-rc.2`） |
| 程序目录 | `D:\dsh\resources\app.asar`（升级整包替换，不含用户插件） |
| profile | `desktop` → `C:\Users\super\.dsh\profiles\desktop` |
| Node / pnpm | `v24.10.0` / `11.17.0`（另有内置版在 `~/.dsh/dsh-runtimes/`） |
| 沙箱 | 已修（见 §6） |

## 1. 交付物结构（按 M0 实测调整）

**每个插件包自己就是 bundle**，不做 wrapper：

```
fairy-suite/packages/
  dsh-fairy-visual/          ← 装一次 = profile 多一个 link 依赖 + 一行插件
    package.json             dsh.bundle.patch + dsh.client + locale + icon
    cordis.patch.yml         insert: [{ id: fairy-visual, name: dsh-fairy-visual }]
    lib/index.js             宿主半边
    lib/client.js            客户端半边（IIFE，__ModuleLoader__.load）
    src/                     改造中的源码
    locale/{en,zh}.json
    icon.svg
  dsh-balance-meter/         ← M5
  dsh-fairy-startup/         ← M5
  dsh-browser-dock/          ← M5
```

装载后的 profile：

```json
"dsh": { "profile": { "bundles": [ "...base", "...web-app", "dsh-fairy-visual" ] } },
"dependencies": { "dsh-fairy-visual": "link:E:/Code/Fairy-DSH-main/fairy-suite/packages/dsh-fairy-visual" }
```

`link:` 意味着改源码不用重装；但**宿主半边改完需要重启**才换新的模块代（客户端半边可热更）。

## 2. 为什么不能用 wrapper bundle（M0 踩到的坑）

第一次尝试「一个 `@local/fairy-dsh` 包 + `dependencies: { dsh-fairy-visual: "file:../packages/..." }`」，
pnpm 装成功、激活失败：

```
dsh-fairy-visual: failed to import: Cannot find package 'dsh-fairy-visual'
imported from C:\Users\super\.dsh\profiles\desktop\
```

原因：`file:`/`link:` 目录依赖被当作 **linked package**，它自己的依赖**不会**被装进 profile
（官方 README：linked packages 用自己 checkout 的依赖）。而 loader 是从 **profile 根目录**
解析行里的 `name` 的，所以只有「profile 的直接依赖」才能被解析。

**结论：一个可解析的插件包 = 一个 bundle = 一次 install_bundle。**
连带结论：**不能写跨包裸导入**（如 `import ... from 'dsh-fairy-contracts'`）,
否则宿主半边同样解析失败。`fairy-contracts` 的三个小文件（104 + 13 行）要内联进各包的 `lib/`。

## 3. 必须改的四件硬改（不涉及设计取舍）

### W1 设置模型整代替换
`@deepseek-ai/dsh-settings@0.2.1-rc.5` 只导出 `SettingsConflictError / SettingsForms / redactSecrets`；
`settings` 服务方法只有 `configure / describe / update / replace / mutate / write`，数据源是 `configEditor`。
即**插件自己的 Config 就是设置页**。

- 宿主：删 `settingsNamespace`，改 `export const Config = z.object({...})`，`apply(ctx, config)` 读值。
  原 `fairy-visual` + `fairy-identity` 两套 namespace 合并进一个 Config。
  （`@deepseek-ai/schemastery` 需作为该包依赖由 pnpm 装入 profile。）
- 客户端：`ctx.settingsScope.bind({namespace})` 已不存在。方案 A：插件自带
  `webServer.register` 精确路由 `/fairy-visual/settings`（GET/POST JSON，持久化到
  `$DSH_HOME/fairy-visual.json`），与 voice/balance 现有做法同款、与版本无关。
  方案 B（后续优化）：若客户端有公开的 `ctx.remote.settings`，改走 `describe/mutate`。

### W2 客户端 inject 修正
`['slots','sessions','settingsScope']` → `['slots','sessions']`。
`settingsScope` 不在 live client 服务目录，Cordis 会**静默永不激活**。

### W3 依赖 pin 解锁
删 `@deepseek-ai/dsh-settings: 0.1.1-rc.2`；`schemastery 3.18.1` → `~3.18.5`。
`dsh.client.inject` 里已不存在的 `@deepseek-ai/dsh-client-runtime` / `-ui-slots` / `-ui-primitives` 一并清掉。

### W4 构建链
宿主 `lib/index.js` = `src/index.js` 原样拷贝，不用打包。
只有 client 侧需要 tsdown：`src/client/index.js` → `lib/client.js`（iife + banner 注入
`window.__ModuleLoader__.load`，`neverBundle: react`）。原 `bundle` 脚本的 `cp/mv` 是 Unix 写法，要改。

## 4. DOM 契约：先探测，再适配

`src/client/dom-adapter.js` 已按 CRITICAL/CORE/ENHANCEMENT/OPTIONAL 分级并 fail-closed，是最大资产。
已确认仍在的：所有用到的 slot key（`shell.overlay` / `conversation.session.header.utilities` /
`settings.section` / `conversation.input.left` / `sidebar.footer.action` / `conversation.composer.dock`）。
待验：`[data-phase]`、`[data-composer-card]`、`[data-composer-seat]`、`[data-conversation-scroll]`、
`[data-input-scroll]`、`[data-chat-flow]`、`[role=tree][aria-label="会话"]`、中文 ARIA 文案、`.toBottomSlot`。

手段：一次性探针 client 模块把 `capabilitySnapshot()` POST 到宿主路由落成 JSON 再读。

### 4.1 静态核对结果（已完成，不依赖页面刷新）

shell 侧的 ripgrep 进不去 `app.asar`，所以写了 `tools/asar.mjs` 直接解析 asar 头
（布局：`[u32 4][u32 头部尺寸][u32 头部尺寸-4][u32 JSON 长度][JSON from offset 16]`），
把 62 个 `@deepseek-ai/dsh-client-*/lib/client.js` 抽到 `.cache/asar/` 本地核对。

| adapter 依赖 | rc.5 实际 | 结论 |
| --- | --- | --- |
| `[data-slot="root"/"sidebar"/"conversation"/"shell.overlay"]` | `ui-renderer` 按 `slotKey` 写入（`"data-slot": slotKey`） | ✓ |
| `[data-phase="hero"/"active"]` | `phase = settling ? "settling" : hero ? "hero" : "active"` | ✓ 多一个 `settling`；adapter 的 `phaseSurface` 用 `[data-phase]` 兜底，不会误报 |
| `[data-composer-seat]`、`[data-composer-card="true"]` | JSX 里 `"data-composer-card": true`，React 渲染成 `"true"` | ✓ |
| `[data-conversation-scroll]`、`[data-input-scroll]` | 都在 | ✓ |
| `[data-chat-flow]` | 整个客户端产物里没有这个属性 | ✗ 消失；不是分级能力，只影响内容渐变增强 |
| `.toBottomSlot` / 「回到底部」 | 没有此控件 | ✗ 消失；OPTIONAL，无害 |
| `[role="tree"][aria-label="会话"]` | `ui-workspace` 仍有 `role: "tree"` + 「会话」/「Sessions」 | ✓ |
| slot 键 `sidebar.brand.mark`、`sidebar.footer.action`、`conversation.session.header{,.actions,.utilities}`、`conversation.composer.dock`、`conversation.input.attachments`、`sidebar.settings` | 全部存在 | ✓ |

**结论：CRITICAL 与 CORE 契约全部存活。** 缺的两项一个是 OPTIONAL、一个是 ENHANCEMENT，
按 adapter 的 fail-closed 规则只会降级，不会让视觉整体不挂载。

rc.5 新增、adapter 尚未利用的：

- `conversation.hero.options` / `conversation.hero.workspace` / `conversation.hero.agentPreset` / `conversation.hero.brand.mark`
  —— **Hero 投影现在有官方插槽**，M4 不必再 DOM 劫持
- `data-shell-overlay`、`data-conversation-region`、`data-conversation-content`、
  `data-composer-dock`、`data-composer-input`、`data-queue-dock`、`data-content-phase`

## 5. 里程碑

| # | 内容 | 状态 |
| --- | --- | --- |
| M0 | 骨架：bundle 装进 desktop profile，宿主路由 + 客户端徽章 | **完成**（`application: applied`，`/fairy-dsh/ping` 200，slot occupant 实证） |
| M1 | 设置层迁移（Config + 客户端读写通道） | **完成**（见 §5.1） |
| M2 | DOM 契约探针 | **完成**（动态报告 `missing: 0`，见 §4.1/§5.8） |
| M3 | 视觉主结构：stage、mascot、HDD 背景、侧栏板 | **挂载完成**（`data-dsh-fairy-mode="hdd"`、stage 占用 `shell.overlay`） |
| M4 | composer 底舱 + Hero 投影 + 模式过渡 | **挂载完成**（composer 五个契约全 True）；Hero 建议改走 `conversation.hero.*` 官方插槽 |
| M5 | balance-meter / fairy-startup / browser-dock | **完成**（三个包已装，宿主路由实测通过，见 §5.3） |
| M6 | 人格预设迁移 | **完成**（`preset-fairy` 已注册，`status: schema`，与四个官方预设同级，见 §5.4） |
| M7 | 回归与清理（含移除 probe.js 与 /fairy-dsh/report） | **完成**（见 §9），待一次冷启动确认 |

### 5.1 M1 实际做法与结果

- 宿主不再注册 settings namespace，改成「插件自有 JSON 存储 + 自有路由」：
  `GET/POST /fairy-visual/settings`，落盘 `~/.dsh/fairy-visual/settings.json`，原子写，UTF-8 中文实测正常。
- 客户端补 `src/client/settings-store.js`，复刻旧 scope 的 `{ getSnapshot(): {value}, subscribe, set }`。
  **外层快照对象必须保持稳定、只换内层 `value`** —— 设置页把它喂给 `useState`，
  每次返回新外层对象会让 React 中止该 section 的渲染（原代码注释里就写了这个坑）。
- 客户端 `inject` 从 `['slots','sessions','settingsScope']` 收窄到 `['slots','sessions']`。
- `fairy-contracts` 内联进 `src/contracts/`，删掉跨包裸导入（linked package 解析不到）。
- 860 行客户端源码全量编译通过（456 KB），**除了 settings 那一层，其余代码零改动**就在 0.2.1-rc.5 上跑起来了。

### 5.2 迭代节奏（重要）

| 改动位置 | 生效方式 |
| --- | --- |
| 宿主 `src/index.js` | `remove_bundle` + `install_bundle` 即换新的模块代（**实测有效，不用重启桌面端**） |
| 客户端 `src/client/*` | `tsdown` 重新构建后，**页面刷新一次**才会取新 bundle |
| `package.json` 的 `main`/`exports` | 同宿主 |

构建：`cd packages/dsh-fairy-visual && .\node_modules\.bin\tsdown.CMD`（`pnpm build` 会连带跑 install）。
`pnpm` 默认的隔离式 node_modules 装不上 tsdown 的传递依赖，必须扁平布局：
`pnpm install --config.node-linker=hoisted`（`.npmrc` 里的 `node-linker` 被 pnpm 11 忽略了）。

### 5.3 另外三个插件：走预构建产物，不重建

balance-meter / fairy-startup / browser-dock 上游**没有 `src/`**（只有 browser-dock 有，
但它的 `lib/client.js` 已经自包含，只外置 react），所以直接搬 `lib/` 产物。
`tools/package-prebuilt.mjs` 做三件有断言的事（匹配不到就抛错，不静默）：

| 改动 | 原因 |
| --- | --- |
| `from 'dsh-fairy-contracts/diagnostics'` → `from './diagnostics.js'` | 跨包裸导入在 `link:` 包里解析不到；把 104 行 diagnostics 复制到各自 `lib/` |
| balance-meter 客户端 `inject` 去掉 `connection` | rc.5 客户端服务目录里没有 `connection`，而**注入不到的服务名会让模块静默永不激活**；该名字在它正文里一次都没被用过，属零行为变化 |
| 补 `dsh.bundle.patch`、`cordis.patch.yml`、`locale/*.json`、`icon.svg` | 每个包自己就是 bundle；三份不同的图标，避免插件页三个一样的标记 |

实测：`/balance-meter` 返回 200 且 `todayTokens` 实时增长（证明 `session/event` 宿主事件可用），
`/browser-dock/state` 返回 200 `{status:"idle",revision:0}`。

### 5.4 预设迁移的三处语义改动

`tools/migrate-preset.mjs` 从 `.agent-presets/fairy/` **逐字节搬运** 40 行人格正文（避免手抄漂移），
只做三处有断言的改动：

| 改动 | 原因 |
| --- | --- |
| `persona.config.text` → `prefix` | 0.2.1-rc.5 的字段名 |
| 删 `fairy-core-runtime`、`fairy-safety-gate` | 引用的 `runtime/index.js`、`fairy_core.py`、`safety-gate.js` 在仓库里**根本不存在**，这两行从来就不可能激活 |
| `workflow-worker-thread` → `workflow-ptc` | `@deepseek-ai/dsh-workflow-worker-thread` 不在 0.2.1-rc.5 发行版里（已核实包目录不存在）；`workflow-ptc` 是当期工作流引擎 |

已核实存在的包：`dsh-persona`、`dsh-tool-ask-user`、`dsh-tool-ralph` 全部在位。
保留的 16 个插件行里，`tool-subagent-codex` / `tool-subagent-claude-code` 仍是 `disabled: true`，
与原样一致。

### 5.5 目录名与目标不一致（需要知情）

目标里写的是 `E:\Code\Fairy-DSH-main\fairy-port`，实际落在 `fairy-suite`。
原因是 ACL 死锁（§6）：`fairy-port` 创建于沙箱授权之前，既不可写也不可删，
属主身份也改不动它的完整性标签。新建的 `fairy-suite` 正确继承了授权。
原 5 个包全程只读，未改动。

### 5.6 启动崩溃复盘（重要）

**现象**：重启桌面端后报错，只能选「禁用第三方插件」才进得去。

**根因**（已确定性复现）：`dsh-fairy-startup` 的客户端在 `apply` 里调 `sessions.clear()`。
rc.5 的客户端服务目录里没有这个方法，而它的错误处理是**记完日志再 rethrow**：

```js
try { sessions.clear() } catch (e) { removeAttr(); log(e); throw e }   // ← 致命
```

异常逃出 `apply` → 客户端模块激活失败 → 客户端启动链断掉 → 应用弹出禁用提示。

**为什么安装时没发现**：`install_bundle` 只验证宿主半边；客户端模块要等下一次页面加载才执行。
视觉的客户端恰好验证过，另外三个装完后页面从未重载，等于**从未运行**。

**修复**（`tools/package-prebuilt.mjs` 里的断言式补丁）：全部改成降级而不是失败——
`sessions?.clear` 有则用无则跳过，`startSession` 从 `ctx.uiWorkspace` 回退到 `ctx.workspaces`，
`workspaces.list` 缺失时不再抛。修复后在真实页面里 `data-dsh-fairy-startup-reset="true"` 已落下，
证明那段代码路径跑通了。

**连带损失（已修复）**：禁用流程把 `cordis.patch.yml` 回滚成更早的快照，
冲掉了用户的 `llm-pi-ai`（zhy 服务商 `172.20.2.14:1230`）和 `agent-default-model` 两行。
已按系统自己生成的 `.bak-1793670798781` 逐字恢复，`Config.listConfigs` 确认 `include:llm-pi-ai` 回到 `schema`。

### 5.7 工具链

| 工具 | 作用 |
| --- | --- |
| `tools/asar.mjs` | 直接解析 `app.asar`（布局 `[u32 4][u32 头][u32 头-4][u32 JSON 长度][JSON@16]`），列/抽官方产物到本地，绕开「ripgrep 进不去 asar」 |
| `tools/client-smoke.mjs` | 在 Node 里用桩 DOM 跑客户端 `apply()`，**按 rc.5 真实服务目录塑形**（无 `sessions.clear`、无 `workspaces.startSession`）。装之前先跑，这类崩溃不会再犯 |
| `tools/package-prebuilt.mjs` | 从上游产物生成三个包，所有补丁带断言（匹配不到就抛） |
| `tools/migrate-preset.mjs` | 逐字节搬运人格正文生成预设声明 |
| probe 自动重载 | 客户端产物一变页面自动重载并重新上报；`PROBE_BUILD` 变了才重载一次，带 15s 防环 |

**迭代节奏（修正后）**：客户端改动 = 重建即生效（自动重载）；宿主改动 = `remove_bundle`+`install_bundle`；
bundle 启停 = `set_bundle` 即时生效。

### 5.8 §4.1 需要更正的两处

实测推翻了静态扫描的两个结论：

- `[data-chat-flow]` **没有消失**，它在 `dsh-client-ui-chat` 里（当时只扫了 4 个包），
  实时 DOM 里有 55 个。静态结论必须以「全部 62 个 client 产物」为覆盖面。
- 真正消失的是 `[data-slot="conversation"]`：rc.5 的对话列是带 `data-phase` 的
  `ConversationRoot`，不再包一层 slot。这一条曾让 5 个 CORE 能力全部误报缺失
  （子 resolver 都从 `conversation(doc)` 起算，父节点 null 就全短路）。
  已在 `conversation()` 加回退：`[data-slot="conversation"]` → `[data-phase]`。
  修复后探针报告 **missing: 0**。

### 5.9 composer 底舱在 rc.5 上停用（`COMPOSER_DOCK_ENABLED = false`）

**现象演进**：底部输入框先是整个缩进右下角一个小盒子，修好宽度后模型选择器又彻底消失。

**两个独立病灶**：

1. **宽度**：`sync()` 用 `surface.getBoundingClientRect()` 给 seat 定宽，而
   `surface = anyPhase(conversation)`。rc.5 的对话根节点**自己**带 `data-phase`，
   `querySelector` 只搜后代，于是抓到内层那个 40px 宽的输入框包装，seat 被写成
   `width: 40px`，整块塌掉。已改为从对话列量宽（`left:280px; width:1427px` 正确）。

2. **控件重排**：rc.2 的底舱把官方控件（模型/命令/上下文/推理/发送）用
   `position:absolute` 塞进三栏「设备舱」。rc.5 的卡片包装链不同，模型触发器被推到
   卡片最右列、压在右翼滑杆下面（实测 `x=1649, w=46`，在卡片 `445..1536` 之外）。
   只摘掉标记没用——卡片上还有一条 `grid-template-columns` 在重塑原生布局，
   而它不依赖标记。

**处置**：整个 `mountComposerDock` 提前返回，composer 交回官方布局。
底舱 CSS 全部以 `[data-dsh-fairy-composer-dock="true"]` 为前缀，标记不再写入 → 整段自动失效，
无需逐条删除。实测恢复后：seat 无内联样式、卡片 `x=445 w=1091`、
模型控件 `242×28 @ x=1228`、`receivesClick=true`。

**代价**：composer 失去 HDD 材质框与右翼两条滑杆（mascot 大小 / 动画速度）。
mascot 本体、stage、侧栏板、背景、滚动条均不受影响。

**M4 重做入口**：`composer-dock.js` 顶部 `COMPOSER_DOCK_ENABLED` 一键恢复；
`composer-marker-projection.js` 的模型标记段保留为注释（标注 `kept for the M4 rework`）。
要点：不要假设官方卡片是三栏网格；先摸清 `[data-slot="conversation.input.*"]`，
用插槽 + 少量定位，而不是整体接管。

## 6. 沙箱权限（已修，留档）

现象：所有 shell 调用直接失败 `SetNamedSecurityInfoW failed (Win32 5): grantWrite(E:\Code\Fairy-DSH-main)`。

根因链：
1. 目录缺少 `WRITE_DAC`，沙箱无法授予自己写权限 → 全部命令失败。
2. 补 `WRITE_DAC` 后命令能跑，但**写入**仍被拒：目录上没有沙箱的
   `S-1-4-151317166-782022561` 授权项，也没有 `Low` 完整性标签。
   沙箱是低完整性进程，只能写被标为 Low 的对象。
3. 关键教训：**父目录的继承项不会追溯应用到已存在的子目录**。
   `fairy-port/` 创建于授权之前，因此永久不可写、甚至不可删除（属主也没有改标签的权利）。
   新建目录会正确继承，所以最后弃用 `fairy-port`，改建 `fairy-suite/`。

现状态：`fairy-suite/` 继承了 `S-1-4-*` 写授权与 `(OI)(CI)Low` 标签，沙箱可正常读写。
诊断/修复脚本的报告与回滚命令在 `E:\Code\fairy-acl-recovery\`。

## 7. 更新安全性

插件装在 `~/.dsh/profiles/desktop`（link 到工作区），**不在** `app.asar` 里，桌面端升级不覆盖。
风险是 API 漂移，不是文件覆盖。坏了 `remove_bundle` 后重装即可。

## 8. 预设迁移（与视觉无关，可独立先做）

`.agent-presets/fairy/` 是旧格式目录，当前 registry 不扫描目录。转成
`@deepseek-ai/dsh-agent-preset` 声明行的 bundle：

1. `persona.config.text` → **`prefix`**（0.2.1-rc.5 必填字段名）；
2. 删 `fairy-core-runtime`、`fairy-safety-gate`（引用的 `runtime/*` 文件仓库里不存在）；
3. 删 `@deepseek-ai/dsh-workflow-worker-thread`（不在发行版）；
4. 其余工具行保留。

## 9. 收尾状态（M7）

### 9.1 已清掉的东西

| 项 | 状态 |
| --- | --- |
| `src/client/probe.js`（DOM 盘点/心跳/自动重载） | 已删除 |
| 宿主 `/fairy-dsh/report` 路由 + `REPORT_PATH/FILE/MAX_*` | 已删除 |
| `window.__fairyProbeErrors` / `__DSH_FAIRY_BUILD__` 消费端 | 随 probe 一起移除 |
| `~/.dsh/fairy-visual/report.json` | 已删除 |
| 客户端产物残留 | `fairy-dsh/report` 0 处、`installProbe` 0 处 |

产物从峰值 465 KB 降到 **419 KB**（死代码被摇树掉）。
`/fairy-dsh/ping` 保留——两行、无副作用，冷启动排查时有用。

### 9.2 两个子系统在 rc.5 上关闭（各一个开关，代码保留）

| 子系统 | 开关 | 原因 |
| --- | --- | --- |
| composer 底舱 | `composer-dock.js` 的 `COMPOSER_DOCK_ENABLED` | rc.5 卡片包装链变了，绝对定位把模型选择器推到卡片外（压到右翼滑杆下） |
| Hero 投影 | `hero-projection-manager.js` 的 `HERO_PROJECTION_ENABLED` | 拿不到官方 hero 元素的 rect，`left` 算成 0，整块偏移半个视口（实测 x=-854） |

两者都保留完整原实现，注释里写明 rc.5 的差异点与 M4 重做入口。
关闭后官方原生 UI 全部正常，代价是 composer 与 hero 少一层 HDD 风格重绘。

### 9.3 仍然生效的 HDD 视觉（实测坐标）

| 部件 | 实测 |
| --- | --- |
| HDD 背景层 | `background-surface` 全屏 1707×1042 |
| mascot 主视觉 | `mascot-root` @(801,46) 375×375 |
| stage 容器 | `.dsh-fairy-stage` 1087×510，`visual-active=true` |
| 侧栏板 | layer / geometry=ready / content / history-surface / history-fade |
| 品牌 mark | 176×42，含 glitch 切片与 brow |
| 电源 / 主题 / 视觉开关 | @(152,951) / (1629,51) / (1560,51) |
| 内容渐隐遮罩 | 1425×926 |
| session metrics 按钮 | @(1500,51) |

### 9.4 四层验证梯（这次移植的主要方法论）

1. **能力探针** —— 官方选择器是否还成立（只覆盖"契约漂移"）
2. **DOM 盘点** —— 插件自己的节点在不在、在哪（覆盖"没渲染"）
3. **命中测试** —— 用户点得到吗（`elementFromPoint`）
4. **官方几何** —— 插件有没有把官方 UI 改坏（读 seat 内联样式）

教训：第 1 层全绿时 composer 正被压成 40px。**能力全绿 ≠ 渲染正确**，
第 4 层是唯一能看见"接管把官方布局搞坏"的一层。

### 9.5 冷启动验收（通过）

清理后完整重启桌面端，实测：

| 检查 | 结果 |
| --- | --- |
| 五个 bundle 加载 | 全部加载，无激活告警 |
| `/fairy-dsh/ping` | 200 |
| `/balance-meter` | 200（`todayTokens` 实时累计） |
| `/browser-dock/state` | 200 |
| `/fairy-visual/settings` | 200 |
| `/fairy-dsh/report` | **404** ← 关键证据：新宿主模块代已生效 |
| `shell.overlay` 注册点 | `dsh-fairy-visual-stage`、`dsh-browser-dock` 均 active |

这也同时验证了 §5.6 的客户端崩溃修复在冷启动路径上是有效的。

### 9.6 剩余工作：M4 重做（未完成，非阻塞）

M4 的两块（composer 底舱、Hero 投影）当前是**关闭**状态，官方原生 UI 正常。
要恢复 HDD 风格需要按 rc.5 真实结构调整：

- 先摸清 `[data-slot="conversation.input.*"]`、`conversation.hero.*` 这些官方插槽
- 用插槽 + 少量定位替代"整体接管 DOM"
- 恢复开关：`COMPOSER_DOCK_ENABLED` / `HERO_PROJECTION_ENABLED`

## 10. rc.5 状态漂移的四个实例（本次移植的核心发现）

同一个模式反复出现：**rc.2 把状态放在服务对象上，rc.5 把它挪走了**——挪进渲染适配器、
挪进 DOM 标记、或者挪进另一层包装。每一条都会让插件"静默失效"而不是报错。

| # | rc.2 的写法 | rc.5 的实际 | 症状 |
| --- | --- | --- | --- |
| 1 | `ctx.settingsScope.bind({namespace})` | 客户端服务目录没有 `settingsScope` | 客户端模块**永不激活**；已改为插件自有存储 + HTTP 路由 |
| 2 | `[data-slot="conversation"]` | 对话列根节点带 `data-phase`，没有这层 slot | 5 个 CORE 能力全部误报缺失；`conversation()` 加回退 |
| 3 | `phase(conversation,'hero')` | `data-phase="hero"` 挂在根节点自己身上 | Hero 投影恒不激活；已加同样的回退 |
| 4 | `sessions.list.getSnapshot().current` | 快照只有 `byId`；当前 id 在官方渲染适配器里 | mascot 状态恒为 `normal`，**不反映任务状态** |

第 4 条的修法与验证：

- 官方在对话区节点上写了 `<div data-conversation-region="chat" data-conversation-session={id}>`
- `Controller.resolveSessionId()` 先试 `list.current`（兼容），取不到再读这个 DOM 标记
  （`composer` 区也有 `data-conversation-region`，所以必须限定 `"chat"`）
- 另加一个 `MutationObserver` 盯 `data-conversation-session`，因为**切换会话不一定改变列表快照**
- 实测：跑一次耗时命令期间，大眼睛进入 thinking 动画（`[data-state="thinking"]`
  换 clip-path + 起关键帧）。`mascot-style.js` 里这套动画一直都在，只是从来没被触发。

**方法论结论**：这类漂移不会抛错，只会让功能安安静静地不工作。所以每一项 rc.2 的
状态读取都要在 rc.5 上重新确认来源，而不能假设"没报错就是对的"。

## 11. 第五个包：dsh-fairy-voice（语音播报）

### 11.1 为什么原来的"语音排除"结论被推翻

最初把语音排除在外，理由是"本机跑不了离线 TTS"。但
`E:\Code\fairy-hdd`（pi-desktop 插件）里的语音并不是 TTS——它是
**规则选择 + 播放预录片段**：扩展把会话状态写成 `state.json`（0=thinking / 1=working /
2=result / 3=waiting / 4=success / 5=error + 一次性 cue），浮窗轮询后播放对应 WAV。
没有模型推理，也就不需要 TTS。

### 11.2 DSH 版本反而更简单

pi-desktop 那套是被进程边界逼出来的（agent 在 sidecar 里，插件进程读不到内存，只能落盘 + 轮询，
还要用"确认框关闭后等 400ms 看工具有没有真开跑"来绕过 API 缺失）。DSH 的客户端插件
和会话 UI 在同一个页面，直接读：

- `session.getSnapshot()` —— `running` / `lastAgentError` / `promptError`
- `session.eventSource` —— `turn/start`、`user/message`、`tool/call`、`session/fork`

### 11.3 出声的时刻（对齐上游状态表）

上游 README 的状态对照表是权威依据，**只有 6 个时刻出声**：
0 thinking → `task_start`（延迟 500ms，期间状态变了就取消）；1 working / 2 result /
3 waiting **全部无语音**；4 success → `success`；5 error → `error`；审批另走 cue 通道。

| cue | 信号 | 备注 |
| --- | --- | --- |
| `task-start` | `turn/start` | 延迟 500ms，回合提前结束则取消 |
| `success` | `running` true→false 且无错误 | |
| `error` | `lastAgentError` | |
| `permission` | `[data-approval-key]` 出现 | |
| `approved` | 面板关闭后 400ms 内出现 `tool/call` | |
| `denied` | 面板关闭后 400ms 内没有 `tool/call` | |
| `welcome` | 页面加载一次 | 对上游"开场动画"语义，**不随切会话播** |

**第一版多接了 `input`（用户发消息就播）、`activity`（每次工具都播）、`aborted`
和"切会话播 welcome"，实测语无伦次**——`input.wav` 那句"主人请提供进一步指示"紧跟在
用户自己的提问后面，读起来是反的。上游表里根本没有这些时刻，已全部移除。
教训：移植配音这类"固定台词 + 触发时机"的功能，台账必须照抄上游，不能按直觉补。

单个 cue 可以关掉：在 `~/.dsh/fairy-voice/settings.json` 里写
`"cues": { "welcome": false }`，其余 cue 不受影响。

审批单独走一条通道，不混进状态 cue，避免状态切换把"需要你决定"覆盖掉。
宿主不会把审批结果告诉客户端，所以结果沿用上游的推断法：面板关掉后工具紧接着开跑
算允许，安静地关掉算拒绝。`data-approval-key` 是官方审批面板自带的专用标记，
比按语言读按钮文字稳得多。

规则表原样沿用上游：多变体 + 优先级（高可打断低、低直接丢、同类不连续重复）。

**素材不进 bundle**：9.28 MB / 44 个 WAV 由宿主按文件注册精确路由流出去
（`/fairy-voice/sounds/<file>`，带一年缓存头），客户端 `new Audio(...)` 直接播。
不猜 `prefix` 语义，44 条精确路由代价为零。

### 11.4 两个只有真机才能发现的坑

1. **观察器只盯属性变更**：切会话时 React 重建整棵对话子树（`childList`），
   不产生属性记录，`MutationObserver` 从不触发 → 只有首个会话有 `welcome`。
   改为同时观察 `childList`，并用 `requestAnimationFrame` **合帧**，否则流式输出时
   每个 token 都会触发一次查询。
2. **新会话还没被 retain 就放弃**：`sessions.binding(id)` 在刚切换的瞬间可能返回
   `undefined`，原代码直接 `return`，之后再无重试。改为有界重试（6 次 / 300ms），成功清零。

### 11.5 未接的 cue

`model-switch`（没有稳定信号可差分）、`network-error`（`connection` 服务不在客户端
服务目录里，`inject` 它会让模块静默不激活）、`compact-*` / `context-warning` /
`quota-warning`（客户端不暴露这些状态）。

不是不能做，而是需要新的信号源；其中 `quota-warning` 有可能走
`shell.quota-notice` 插槽（`chat.quota-notice` 已经占着那个座位），但插槽是渲染位、
不是事件，得再加一层观察，值不当。

**设置**：`~/.dsh/fairy-voice/settings.json` 的 `enabled` / `volume`，
经 `GET/POST /fairy-voice/settings` 读写。
