# Fairy-DSH

Fairy 的 DSH（DeepSeek Harness）插件套件。把
[Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH) 里的 Fairy 插件与验收
工具，从 DSH `0.1.1-rc.2` 迁移到 `0.2.1-rc.5` 的插件契约上重新打包。

本仓库是上游的**二次开发**（Apache-2.0 衍生），不是从零开始的项目。上游原始实现原样保留在
`legacy/rc2/`，作为对照与回滚基线。首个公开版本只发布了视觉主题一个包，这一版发布全量内容。

## 目录

| 路径 | 内容 |
| --- | --- |
| `packages/` | 9 个已迁移到 rc.5 的包；除 `dsh-fairy-contracts` 外，每个包自己就是一个 bundle |
| `tools/` | 维护者用的迁移脚本：asar 读取、客户端冒烟、预设迁移、预构建产物改造 |
| `docs/rc5-port-plan.md` | rc.2 → rc.5 的移植计划、已核实的环境事实与里程碑 |
| `legacy/rc2/` | 上游 rc.2 基线原样：5 个插件包 + `fairy-contracts` + `fairy-system` 验收工具 + profile 模板与隔离测试脚本 |
| `.agent-presets/fairy/` | 旧格式 Fairy 语料（`dsh-fairy-preset` 的迁移源；0.2.x 的 registry 已不直接读目录） |
| `.tmp-shot/` | 开发期截图与裁剪脚本，不是产品资产 |

## 包

| 包 | 版本 | 作用 |
| --- | --- | --- |
| `dsh-fairy-visual` | 0.2.0-m1 | HDD 视觉主题：背景层、Fairy 舞台、侧栏板、自绘滚动条、设置页 |
| `dsh-fairy-voice` | 0.1.0 | 规则驱动的语音提示，含 44 段合成语音（`assets/sounds/*.wav`） |
| `dsh-fairy-preset` | 0.2.0 | Fairy 人格预设（`preset-fairy` 声明行，人格提示词内联在 `prefix`） |
| `dsh-fairy-startup` | 0.2.0 | 开页即落一个空白会话 |
| `dsh-browser-dock` | 0.1.0 | 内嵌浏览器坞（`proxy.cjs` + 客户端半边） |
| `dsh-balance-meter` | 0.2.0 | 余额与当日用量估算卡 |
| `dsh-fairy-contracts` | 0.1.0 | 跨包诊断与 DOM 契约；唯一的纯库包，不带 bundle patch |
| `dsh-session-delete` | 0.1.0 | 从侧栏永久删除一个工作区会话 |
| `dsh-sticky-notes` | 0.1.0 | 侧栏便签与待办板 |

## 安装

每个包都能单独安装，目标 profile 由 `--profile` 决定（桌面版默认 `desktop`）。

1. **插件页**：侧栏「插件」→ **添加插件** → 填包目录的**本机绝对路径**，例如
   `...\packages\dsh-fairy-visual`。
2. **CLI**：`dsh plugin add <包目录绝对路径>`。
3. **本地目录**：`git clone` 之后把包目录的绝对路径作为 spec 安装。

注意：仓库根**没有** `package.json`（这是 monorepo），所以不要把仓库根的 Git 地址当成插件
spec 粘贴——那样装不上。首个版本把主题放在仓库根，那个地址已经失效。

## 测试

rc.2 基线的隔离测试（需要 DSH CLI、Node.js、pnpm，且必须用独立 `DSH_HOME`）：

```sh
cd legacy/rc2
DSH_HOME="$PWD/.dsh-test-home" ./scripts/test-isolated.sh
```

rc.5 包的语法门与单测：

```sh
node --check packages/dsh-fairy-visual/src/index.js
node --test packages/dsh-sticky-notes/test/*.test.js
```

CI 见 `.github/workflows/test.yml`：上游候选工作流的路径移植版（跑 rc.2 基线的 visual / voice
测试），外加 rc.5 各包入口的 `node --check` 语法门与 `packages/*/test` 单测。

## 内容与权利边界

本仓库**公开包含**下列派生自《绝区零》语料的内容，这是维护者的明确决定：

- `packages/dsh-fairy-preset/cordis.patch.yml` 里内联的 Fairy 人格提示词；
- `packages/dsh-fairy-voice/assets/sounds/` 下的 44 段合成语音；
- `.agent-presets/fairy/` 下的 canon / behavior / personality / style 语料。

这些文本、角色设定、角色形象与声音的权利归米哈游（miHoYo）及相关权利人。Apache-2.0 只覆盖
本仓库的原创代码、脚本、测试与配置，**不授予上述内容的任何权利**；这里的留存仅用于个人研究
与学习。权利人如有异议，请开 issue，会移除对应内容。

不随仓库分发：生产会话、日志、凭据、TTS 推理运行时（模型 / venv）、个人世界知识库。

## 许可

原创代码、脚本、测试、配置与文档按 Apache License 2.0 发布，见 `LICENSE` 与 `NOTICE`。
第三方依赖不在该许可范围内，见 `THIRD_PARTY_NOTICES.md`；名称、角色与商标见
`TRADEMARKS.md`。发布前复核清单见 `RELEASE-CHECKLIST.md`。
