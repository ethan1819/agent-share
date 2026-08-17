// test/agent-share.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSession, renderHtml } from "../bin/agent-share.mjs";

test("parseSession: 提取 user/assistant 消息", () => {
  const jsonl = [
    JSON.stringify({ type: "user", message: { role: "user", content: "你好" }, timestamp: "2026-08-17T10:00:00Z" }),
    JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "你好！" }] }, timestamp: "2026-08-17T10:00:01Z" }),
  ].join("\n");
  const msgs = parseSession(jsonl);
  assert.equal(msgs.length, 2);
  assert.equal(msgs[0].role, "user");
  assert.equal(msgs[1].role, "assistant");
});

test("parseSession: 跳过坏行", () => {
  const jsonl = "not json\n" + JSON.stringify({ type: "user", message: { role: "user", content: "ok" } }) + "\n{bad";
  const msgs = parseSession(jsonl);
  assert.equal(msgs.length, 1);
});

test("parseSession: 处理 tool_use + tool_result", () => {
  const jsonl = JSON.stringify({
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        { type: "tool_use", name: "Bash", input: { command: "ls" } },
        { type: "tool_result", content: "README.md\npackage.json", is_error: false },
      ],
    },
  });
  const msgs = parseSession(jsonl);
  assert.equal(msgs.length, 1);
  assert.ok(Array.isArray(msgs[0].content));
});

test("renderHtml: 输出完整 HTML 文档", () => {
  const msgs = [{ role: "user", content: "hi", timestamp: null }];
  const html = renderHtml(msgs, { title: "Test", author: "Ethan" });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<title>Test<\/title>/);
  assert.match(html, /Ethan/);
  assert.match(html, /hi/);
});

test("renderHtml: 转义 HTML 特殊字符", () => {
  const msgs = [{ role: "user", content: "<script>alert(1)</script>", timestamp: null }];
  const html = renderHtml(msgs);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});