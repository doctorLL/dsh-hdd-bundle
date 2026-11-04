# Third-party notices

本仓库不复制第三方源码。以下依赖由包管理器或 DSH 宿主安装；它们不在
Fairy-DSH 的 Apache-2.0 原创代码许可范围内，发布时必须继续保留各自的
许可证、版权和 NOTICE 要求。

| 包 | 固定版本 / 来源 | 许可证 | 版权 / 来源 |
| --- | --- | --- | --- |
| `@playwright/mcp` | `0.0.79` · [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Apache-2.0 | Microsoft；随包附带声明 |
| `@upstash/context7-mcp` | `4.0.2` · [upstash/context7](https://github.com/upstash/context7) | MIT | Upstash；随包附带声明 |
| `dsh-message-edit` | `0.2.3` · [Moeblack/dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) | MIT | Moeblack；随包附带声明 |
| `dsh-reasoning-effort` | `0.6.2` · commit `83bc8c548749d7156a03d11d875d8117e9b5d994` · [HanaAyane/dsh-reasoning-effort](https://github.com/HanaAyane/dsh-reasoning-effort) | MIT | HanaAyane；随包附带声明 |
| `hono` | `4.13.2` · [honojs/hono](https://github.com/honojs/hono) | MIT | Hono contributors；随包附带声明 |

## 宿主提供的 DSH 包

`@deepseek-ai/dsh-base`、`@deepseek-ai/dsh-web-app` 等由 DSH CLI/profile
宿主提供，不随本仓库 vendoring，也不由本项目重新授权。使用者应按照 DSH
发行包中的许可证和版权文件处理。

## 本仓库内的原创包

`packages/` 下的九个包（`dsh-fairy-visual`、`dsh-fairy-voice`、`dsh-fairy-preset`、
`dsh-fairy-startup`、`dsh-browser-dock`、`dsh-balance-meter`、
`dsh-fairy-contracts`、`dsh-session-delete`、`dsh-sticky-notes`）的原创代码与配置
按根目录 `LICENSE` 和 `NOTICE` 处理。

`legacy/rc2/` 下的目录是上游 [Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH)
基线的原样拷贝（Apache-2.0，版权 Chengzhibense），同样按根目录 `LICENSE` 与
`NOTICE` 处理；其中的第三方依赖照旧适用各自许可证。

## 语料派生的内容（不属于上述许可）

以下内容派生自《绝区零》语料，按维护者决定随仓库公开，但**不受 Apache-2.0
覆盖，也不授予任何权利**：

| 内容 | 位置 | 说明 |
| --- | --- | --- |
| Fairy 人格提示词 | `packages/dsh-fairy-preset/cordis.patch.yml` | 由 `.agent-presets/fairy/agent.cordis.yml` 的 `persona.config.text` 迁入 `prefix`，逐字节搬运 |
| 合成语音 | `packages/dsh-fairy-voice/assets/sounds/*.wav` | 44 段提示音，本地 TTS 生成 |
| 参考语料 | `.agent-presets/fairy/{canon,behavior,personality,style}/` | 含《绝区零》场景 ID 证据链与派生产物 |

上述材料的版权、角色形象与声音权利归米哈游（miHoYo）及相关权利人；本仓库
只做个人研究用途的留存，权利人提出异议即移除。

发布新版本时，应从最终 lockfile 重新核对版本、来源和许可证，并把新增的
第三方依赖补入本表；不能因为依赖被锁定就把它们当作本项目原创内容。
