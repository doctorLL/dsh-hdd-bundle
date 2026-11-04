# 第三方声明

本包不复制第三方源码：运行期依赖由宿主提供，构建期依赖不随包分发。

## 上游项目

| 项目 | 来源 | 许可证 | 说明 |
| --- | --- | --- | --- |
| Fairy-DSH | [Chengzhibense/Fairy-DSH](https://github.com/Chengzhibense/Fairy-DSH) · 基线 `d639887` | Apache-2.0 | `dsh-fairy-visual` 的原始实现。本仓库是它在 DSH 0.2.1-rc.5 上的二次开发，保留上游版权与 NOTICE；修改清单见 README 的「来源与二次开发」 |

## 运行期（由 DSH 宿主提供，不 vendoring）

| 包 | 许可证 | 说明 |
| --- | --- | --- |
| `react` / `react/jsx-runtime` | MIT | 客户端产物 `lib/client.js` 只把它们外置为 `require`，由 DSH Web 运行时提供；版权归 Meta Platforms, Inc. 及其贡献者 |
| `@deepseek-ai/dsh-*`（base、web-app、client-ui-* 等） | 见 DSH 发行包 | 本包声明为 `dsh.client.inject` 的客户端包与宿主服务均来自 DSH 安装，不由本项目重新授权 |

## 构建期（`devDependencies`，不随包分发）

| 包 | 用途 | 许可证 |
| --- | --- | --- |
| `tsdown` | 打包 `src/client` 为 `lib/client.js` | MIT |
| `tinyexec` | 构建脚本调用 | MIT |

使用者的 profile 不需要这些依赖：`lib/client.js` 是随仓库提交的预构建产物。

## 本包原创内容

`src/`、`lib/`、`locale/`、`cordis.patch.yml`、`icon.svg` 及文档为本项目原创，按
根目录 `LICENSE`（Apache-2.0）与 `NOTICE` 处理。发布新版本时应重新核对实际依赖与
许可证，不能因为依赖被锁定就把它当作本项目原创内容。
