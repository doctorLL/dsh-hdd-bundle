# GitHub 发布前检查

这份目录是 Fairy DSH 的公开版本。它**包含**语料派生内容（人格提示词、44 段合成语音、
`.agent-presets/fairy/` 语料），这是维护者的明确决定；不包含生产会话、日志、密钥、
缓存、`node_modules` 和本地 TTS 运行时。

发布前必须逐项确认：

- 已确认这次发布包含上述语料派生内容，并接受其权利状态：Apache-2.0 只覆盖原创代码，
  不覆盖这些文本、角色与声音（见 `NOTICE`、`TRADEMARKS.md`、`THIRD_PARTY_NOTICES.md`）；
- 已确认原创代码、脚本、测试、配置和文档按 Apache-2.0 发布，并保留 `LICENSE`、`NOTICE`；
  第三方内容仍按其原始许可证处理；
- `git clone` 到全新临时目录后，`DSH_HOME` 指向独立测试目录，不指向生产 `~/.dsh`；
- `cd legacy/rc2 && DSH_HOME="$PWD/.dsh-test-home" ./scripts/test-isolated.sh` 全部通过；
- 未上传 `node_modules`、`.cache`、`.pnpm-store`、`.dsh-test-home`、会话、日志、凭据、
  TTS 模型与 venv；
- 已检查发布文件里维护者本机绝对路径的数量与必要性（`docs/`、`fairy-system/` 里保留了
  迁移当时的路径描述，属于历史记录）；
- GitHub Actions 的 Node/pnpm 测试通过；
- README 已说明 monorepo 的安装方式（每包装一次，别用仓库根地址）。
