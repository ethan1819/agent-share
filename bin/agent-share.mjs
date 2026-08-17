#!/usr/bin/env node
// agent-share — 把 Claude Code / Codex JSONL 会话导出成可分享的单文件 HTML
// 用法：
//   agent-share -i session.jsonl -o share.html
//   cat session.jsonl | agent-share -o share.html
//   agent-share -i session.jsonl --title "调试 vLLM" --author "Ethan"
import { promises as fs } from "node:fs";
import process from "node:process";

export function parseSession(jsonlText) {
  const messages = [];
  for (const raw of jsonlText.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      const m = obj.message || obj;
      const role = m.role || obj.type || "unknown";
      const content = m.content !== undefined ? m.content : obj.content;
      messages.push({
        role: String(role).toLowerCase(),
        content,
        timestamp: obj.timestamp || m.created_at || null,
        model: m.model || obj.model || null,
      });
    } catch {
      // 跳过坏行（注释、heartbeat、空对象等）
    }
  }
  return messages;
}

function escape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderContent(content) {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return `<p>${escape(content)}</p>`;
  if (!Array.isArray(content)) return `<pre>${escape(JSON.stringify(content, null, 2))}</pre>`;
  return content.map((b) => {
    if (b === null || b === undefined) return "";
    if (typeof b === "string") return `<p>${escape(b)}</p>`;
    if (b.type === "text") return `<p>${escape(b.text || "")}</p>`;
    if (b.type === "thinking") return `<details class="thinking"><summary>💭 thinking</summary><pre>${escape(b.thinking || b.text || "")}</pre></details>`;
    if (b.type === "tool_use") {
      const args = typeof b.input === "string" ? b.input : JSON.stringify(b.input, null, 2);
      return `<details class="tool" open><summary>🔧 <b>${escape(b.name || "tool")}</b></summary><pre>${escape(args)}</pre></details>`;
    }
    if (b.type === "tool_result") {
      const out = typeof b.content === "string" ? b.content : JSON.stringify(b.content, null, 2);
      const isErr = b.is_error ? " tool-err" : "";
      return `<details class="result${isErr}"><summary>↳ result${b.is_error ? " (error)" : ""}</summary><pre>${escape(out)}</pre></details>`;
    }
    return `<pre class="block">${escape(JSON.stringify(b, null, 2))}</pre>`;
  }).join("\n");
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 920px; margin: 2rem auto; padding: 0 1rem; background: #fafbfc; color: #1f2328; line-height: 1.6; }
h1 { border-bottom: 2px solid #d0d7de; padding-bottom: 0.5rem; }
.meta { color: #656d76; font-size: 0.9rem; margin-bottom: 2rem; }
.msg { margin: 1rem 0; padding: 1rem 1.25rem; border-radius: 8px; border: 1px solid #d0d7de; background: white; }
.msg.user { background: #ddf4ff; border-color: #54aeff; }
.msg.assistant { background: #ffffff; border-color: #d0d7de; }
.msg.system { background: #fff8c5; border-color: #d4a72c; font-size: 0.9rem; }
.role { font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #656d76; margin-bottom: 0.5rem; display: flex; justify-content: space-between; }
.role .ts { font-weight: 400; text-transform: none; letter-spacing: 0; }
.msg p { margin: 0.5rem 0; }
.msg p:first-child { margin-top: 0; }
.msg p:last-child { margin-bottom: 0; }
pre { background: #f6f8fa; padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; line-height: 1.4; }
pre.block { background: #f3e5f5; }
details.tool { background: #fff8e1; padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0.5rem 0; }
details.tool > summary { cursor: pointer; color: #6e4e00; }
details.result { background: #e6f4e6; padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0.5rem 0; }
details.result.tool-err { background: #ffebe9; }
details.result > summary { cursor: pointer; color: #1a7f37; }
details.result.tool-err > summary { color: #cf222e; }
details.thinking { background: #f5f0ff; padding: 0.5rem 0.75rem; border-radius: 6px; margin: 0.5rem 0; }
details.thinking > summary { cursor: pointer; color: #8250df; font-style: italic; }
code { background: rgba(175, 184, 193, 0.2); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #d0d7de; color: #656d76; font-size: 0.85rem; text-align: center; }
`;

export function renderHtml(messages, opts = {}) {
  const title = opts.title || "Agent Session";
  const author = opts.author || "";
  const source = opts.source || "";
  const generatedAt = new Date().toISOString();
  const msgs = messages.map((m) => `
<div class="msg ${escape(m.role)}">
<div class="role"><span>${escape(m.role)}${m.model ? ` · ${escape(m.model)}` : ""}</span><span class="ts">${escape(m.timestamp || "")}</span></div>
${renderContent(m.content)}
</div>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>${CSS}</style>
</head><body>
<h1>${escape(title)}</h1>
<div class="meta">
${author ? `By <b>${escape(author)}</b> · ` : ""}Generated ${escape(generatedAt)} · ${messages.length} messages${source ? ` · source: ${escape(source)}` : ""}
</div>
${msgs}
<footer>Generated by <a href="https://github.com/ethan1819/agent-share">agent-share</a></footer>
</body></html>`;
}

async function readStdin() {
  const chunks = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function run() {
  const args = process.argv.slice(2);
  let input = null;
  let output = null;
  let title = "Agent Session";
  let author = "";
  let source = "";
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-i" || a === "--input") input = args[++i];
    else if (a === "-o" || a === "--output") output = args[++i];
    else if (a === "--title") title = args[++i];
    else if (a === "--author") author = args[++i];
    else if (a === "--source") source = args[++i];
    else if (a === "-h" || a === "--help") showHelp = true;
    else if (!input) input = a;
    else throw new Error(`未知参数: ${a}`);
  }

  if (showHelp || (!input && process.stdin.isTTY)) {
    console.log(`agent-share — Export Claude Code / Codex JSONL sessions to shareable HTML

Usage:
  agent-share -i session.jsonl -o share.html
  cat session.jsonl | agent-share -o share.html
  agent-share -i session.jsonl --title "调试 vLLM" --author "Ethan"

Options:
  -i, --input <file>    Read session JSONL from file (default: stdin)
  -o, --output <file>   Write HTML to file (default: stdout)
  --title <str>         Page title (default: "Agent Session")
  --author <str>        Author name shown in header
  --source <str>        Source file/path label
  -h, --help            Show this help
`);
    return;
  }

  const raw = input && input !== "-" ? await fs.readFile(input, "utf8") : await readStdin();
  if (!source && input) source = input;
  const messages = parseSession(raw);
  const html = renderHtml(messages, { title, author, source });

  if (output) {
    await fs.writeFile(output, html, "utf8");
    console.error(`✓ ${output}  (${messages.length} messages, ${(html.length / 1024).toFixed(1)} KB)`);
  } else {
    process.stdout.write(html);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error("agent-share:", err.message);
    process.exit(1);
  });
}