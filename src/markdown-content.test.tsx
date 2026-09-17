import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownContent } from "./markdown-content";

test("renders AI Markdown as semantic headings, separators, lists, and emphasis", () => {
  const html = renderToStaticMarkup(
    <MarkdownContent markdown={[
      "## 优先修复",
      "",
      "---",
      "",
      "1. **恢复页面结构**",
      "2. 再检查字体和间距"
    ].join("\n")} />
  );

  assert.match(html, /<h2>优先修复<\/h2>/);
  assert.match(html, /<hr\/>/);
  assert.match(html, /<ol>/);
  assert.match(html, /<strong>恢复页面结构<\/strong>/);
});

test("renders a GFM comparison table with semantic column headers", () => {
  const html = renderToStaticMarkup(
    <MarkdownContent markdown={[
      "| 元素 | 设计 y | 实际 y | 偏差 |",
      "|---|---:|---:|---:|",
      "| 利率观察 | 551 | 176 | -375 |"
    ].join("\n")} />
  );

  assert.match(html, /<table>/);
  assert.match(html, /<thead>/);
  assert.match(html, /<th scope="col">元素<\/th>/);
  assert.match(html, /<td>利率观察<\/td>/);
});

test("does not execute raw HTML or unsafe links from AI Markdown", () => {
  const html = renderToStaticMarkup(
    <MarkdownContent markdown={'<script>alert("x")</script>\n\n[危险链接](javascript:alert("x"))'} />
  );

  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /危险链接/);
});
