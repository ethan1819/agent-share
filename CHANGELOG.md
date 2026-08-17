# Changelog

All notable changes to this project will be documented here.

## [0.1.0] - 2026-08-17

### Added

- 初始版本：CLI 工具，把 Claude Code / Codex JSONL 会话导出成单文件 HTML
- 解析 user / assistant / system / tool_use / tool_result / thinking
- 内联 GitHub 风格 CSS（无外链）
- CLI 选项：`-i` / `-o` / `--title` / `--author` / `--source`
- 容错：跳过坏 JSON 行、心跳、注释
- 内置测试：`node --test test/agent-share.test.mjs`（5 个测试覆盖 parse / render / 转义）