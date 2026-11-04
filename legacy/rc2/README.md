# legacy/rc2 — 上游 rc.2 基线（原样保留）

这些目录是 [Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH) 上游基线
（`d639887`，2026-08-29）的原样拷贝，锁定 DSH `0.1.1-rc.2`。它们**不是**当前工作成果，
保留在这里有三个用途：

1. **对照**：rc.5 的包改了什么、为什么改，见 `docs/rc5-port-plan.md`；
2. **回滚**：迁移出问题时回到 rc.2 的行为；
3. **测试**：这套基线自带单元测试与隔离测试脚本；`packages/` 里的 rc.5 包基本没有对应测试
   （只有 `dsh-sticky-notes` 带 `test/`）。

| 路径 | 内容 |
| --- | --- |
| `fairy-visual/`、`fairy-voice/`、`fairy-startup/`、`browser-dock/`、`balance-meter/` | 上游 5 个插件包（`<分类>/dsh-*` 两级结构，未改） |
| `fairy-contracts/` | 上游跨包契约；`packages/dsh-fairy-contracts` 从这里复制而来 |
| `fairy-system/` | 上游验收工具（`check.sh`、`verify-build.js`、preflight、基准脚本）；内部路径按本目录布局写死 |
| `profiles/web/` | rc.2 的 web profile 模板，`link:` 指向上面这些包 |
| `scripts/test-isolated.sh` | 隔离测试入口，用独立 `DSH_HOME` 跑一遍安装与冒烟 |

运行隔离测试：

```sh
cd legacy/rc2
DSH_HOME="$PWD/.dsh-test-home" ./scripts/test-isolated.sh
```

脚本会读仓库根的 `.agent-presets/fairy`（已按 monorepo 位置调整过路径）。改这些目录等于改
上游基线：除非是为了让测试跑通，否则不要动。
