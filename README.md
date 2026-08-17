# agent-share

> 把 Claude Code / Codex 会话导出成可分享的单文件 HTML。
> Export Claude Code / Codex JSONL sessions to a self-contained HTML page.

## TL;DR

- **定位（犀利版）**：`你的 Agent 对话值得被看见`
- **解决什么**：Claude Code / Codex 会话日志藏在 `~/.claude/projects/.../*.jsonl` 里，想发推特 / 写小红书 / 留档复盘都很麻烦
- **跟谁抢用户**：手抄聊天记录；paste2gist + 自制模板（散乱）；浏览器截图（不能复用、丑）
- **为什么是你做**：**单文件** HTML（无外链 CSS/JS），直接拖到任何地方都能渲染；自动识别 user / assistant / tool_use / tool_result / thinking

## 安装

```bash
npm install -g agent-share
```

## 用法

```bash
# 1) 从文件读
agent-share -i ~/.claude/projects/foo/abc.jsonl -o share.html

# 2) 从 stdin
cat session.jsonl | agent-share -o share.html

# 3) 加标题 + 作者
agent-share -i session.jsonl --title "调试 vLLM TTFT" --author "Ethan" -o share.html
```

输出后直接双击 `share.html`，或拖到任何静态网站托管（GitHub Pages / Netlify / Vercel 都行）。

## 演示

> 占位：把 `examples/claude-debug.jsonl` 喂给 agent-share，得到 `examples/claude-debug.html`，截图塞这里。

## 它做了什么

| 会做 | 不会做 |
| --- | --- |
| 解析 Claude Code / Codex JSONL 容错（跳过坏行） | 不解析 OpenAI / Anthropic 私有格式 |
| 渲染 user / assistant / system / tool_use / tool_result / thinking | 不做代码高亮（HTML 干净，无 JS） |
| 内联 GitHub 风格 CSS（无外链） | 不做实时协作 / 评论 / @ 提及 |
| 时间戳 + model 名（assistant header） | 不上传到任何远端，**纯本地** |
| `--title` / `--author` / `--source` 元数据 | 不写日志文件 |

## 跟同类相比

| 工具 | 输入 | 输出 | 单文件 | 工具高亮 | thinking 折叠 |
| --- | --- | --- | --- | --- | --- |
| **agent-share** | JSONL | HTML | ✅ | ✅ | ✅ |
| Claude 官方 replay | URL | Web | ❌ | ❌ | ❌ |
| 手抄 / 截图 | - | - | - | ❌ | ❌ |

## 工作原理（一段话）

`bin/agent-share.mjs` 接 CLI → `parseSession` 用 `JSON.parse` 一行行解 JSONL（坏行 try/catch 跳过），归一化 `role` / `content` / `timestamp` / `model` → `renderHtml` 把内联 CSS + 消息块按角色染色（user 蓝、assistant 白、tool 黄、result 绿、thinking 紫） → 单文件 HTML 输出。

## 路线图

- [x] v0.1: 基础解析 + 单文件 HTML 输出
- [ ] v0.2: `--filter role:assistant,user` —— 只输出指定角色
- [ ] v0.3: `--redact <pattern>` —— 自动遮蔽 token / 邮箱 / 密钥
- [ ] v0.4: `--diff <file1> <file2>` —— 对比两个 session 的差异
- [ ] v0.5: 拖入 .jsonl 直接生成可分享的 GitHub Gist URL

## 风险 / 局限

- **不要**直接把含密钥 / token 的 session 推到公开仓库 —— 工具会原样渲染 tool_use input
- 长 session（> 10MB JSONL）一次性进内存
- 当前只识别 user / assistant / tool_use / tool_result / thinking；遇到不认识的 `type` 会原样 JSON 渲染
- 内联 CSS 不支持主题切换；如果要 dark mode 等后续再说

## 协议

MIT © Ethan