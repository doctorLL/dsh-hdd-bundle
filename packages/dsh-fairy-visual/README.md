# dsh-fairy-visual

Fairy 的 HDD 视觉主题，作为一个标准的 DSH bundle 插件，给 DeepSeek Harness Web 界面
加一层可开关的视觉皮肤。它是纯表现层：不改会话、不改预设、不碰语音，删掉它之后
界面回到官方原样。

- 包名：`dsh-fairy-visual`
- 形态：一个包 = 一个 bundle（`dsh.bundle.patch` + `cordis.patch.yml` + 客户端半边）
- 验证环境：DSH `0.2.1-rc.5` 桌面版 / Web 界面
- 许可：Apache-2.0（第三方与商标边界见 [NOTICE](NOTICE) 与 [TRADEMARKS.md](TRADEMARKS.md)）

## 来源与二次开发

本仓库是 [Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH) 的
**二次开发**，不是从零开始的项目。上游是这套 HDD 主题的原始实现（Apache-2.0）；本仓库把
其中的 `fairy-visual/dsh-fairy-visual` 迁移到 DSH `0.2.1-rc.5` 的插件契约上，按标准
bundle 形态重新打包；本包现在是 Fairy-DSH monorepo 的 `packages/dsh-fairy-visual`。

- 上游基线：`d639887`（2026-08-29）中的 `fairy-visual/dsh-fairy-visual` `0.1.0`
- 上游版权与 NOTICE 按 Apache-2.0 保留，见 [NOTICE](NOTICE)；本仓库的修改同样以
  Apache-2.0 发布

相对上游的改动（Apache-2.0 §4(b) 要求的"已修改"声明）：

| 面 | 改动 |
| --- | --- |
| 目标版本 | `0.1.1-rc.2` → `0.2.1-rc.5` |
| 设置通道 | `ctx.settingsScope.bind({ namespace })` 在 rc.5 不存在，改为插件自有 JSON 存储 + `GET/POST /fairy-visual/settings` |
| 装载形态 | 不再依赖 `profiles/web` 的 `clientModules` 注册，改为每包自带 `dsh.bundle.patch` 与 `cordis.patch.yml` |
| 契约 | `dsh-fairy-contracts` 的跨包裸导入内联为 `src/contracts/`；客户端 inject 收窄到 rc.5 真实存在的服务 |
| DOM 适配 | 补 `[data-phase]`、`data-conversation-region="chat"` 等 rc.5 标记的回退读取 |
| 构建 | 宿主半边不再打包（`src/index.js` 由 loader 直接加载），只有客户端走 tsdown |
| 裁剪 | composer 底舱与 Hero 投影在 rc.5 关闭（两个开关保留，代码未删） |

## 它做了什么

| 部件 | 说明 |
| --- | --- |
| HDD 背景层 | 全屏背景面，挂在 `body` 之下，指针穿透 |
| Fairy 舞台 | `shell.overlay` 上的大眼睛 mascot，会随任务状态切表情与动画 |
| 侧栏板 | 品牌 mark、历史区材质与内容渐隐 |
| 视觉开关 | 会话头部工具区一个开关；Hero 界面下从 overlay 渲染兜底入口 |
| 设置页 | 在「设置 → 插件」里：主题、mascot 显隐/大小/偏移/动画速度、节能模式 |
| 滚动条 / 过渡 | 自绘滚动条与模式过渡；`prefers-reduced-motion` 时动画降级 |

## 安装

要求：DSH 桌面版 `0.2.1-rc.5`（或与之客户端契约兼容的 Web profile）。插件装在
profile 里，不在 `app.asar` 内，升级 DSH 不会覆盖它。

三种装法，任选其一：

1. **插件页**（推荐）：侧栏「插件」→ **添加插件** → 填本目录的**本机绝对路径**（仓库是 monorepo，根目录没有 `package.json`，粘贴仓库地址装不上）。
2. **CLI**：`dsh plugin add <本目录绝对路径>`（用 `--profile` 指定目标 profile）。
3. **本地目录**：`git clone` 之后，把 `packages/dsh-fairy-visual` 的绝对路径作为 spec 安装。

装完刷新页面，视觉默认是关的；用会话头部的开关打开。

## 使用

状态存在 `$DSH_HOME/fairy-visual/settings.json`（`DSH_HOME` 缺省为 `~/.dsh`），
插件自己带一条读写路由 `GET/POST /fairy-visual/settings`，不依赖 DSH 的 settings
namespace。

## 开发

宿主半边（`src/index.js`）是普通 ESM，被 Host loader 直接从源码加载，不需要构建；
只有客户端半边要打包成 `lib/client.js`。

```sh
pnpm install --config.node-linker=hoisted   # pnpm 11 会忽略 .npmrc 的 node-linker
pnpm build                                   # tsdown: src/client/index.js -> lib/client.js
```

构建产物 `lib/client.js` 随仓库提交，所以使用者不需要装 tsdown。改了客户端代码要
重新构建再刷新页面；改了 `package.json` 的 `main`/`exports` 需要重新装载 bundle。

## 已知限制

- 只支持 Web 界面；没有浏览器载体（`webServer`）的 profile 里插件不会激活。
- 客户端 inject 的服务名按 rc.5 的服务目录写死。DSH 换版后如果某个服务消失，
  模块会**静默不激活**而不是报错——升级后请先看插件是否还在工作。
- composer 底舱与 Hero 投影两个子系统在 rc.5 上关闭（代码保留，入口是
  `src/client/composer-dock.js` 与 `hero-projection-manager.js` 顶部的开关），
  底栏交回官方布局。其余 HDD 视觉均生效。
- 版本兼容性没有声明 `engines.dsh`：装到不兼容版本上不会被拦住。

## 内容边界

仓库只含原创代码、脚本与配置。不含游戏剧情文本、官方素材、TTS 素材、世界观数据、
个人语料、会话记录或密钥。占位文案是界面用的短句，不含剧情段落。

## 许可证

原创代码按 Apache License 2.0 发布，见 [LICENSE](LICENSE)。代码主体来自上游
[Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH)，本仓库的修改沿用
同一许可并保留其 NOTICE。第三方依赖、宿主提供的 DSH 包以及相关名称/角色/商标不在该
许可范围内，分别见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与
[TRADEMARKS.md](TRADEMARKS.md)。
