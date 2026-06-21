import React from "react";

// ── Inline parser ─────────────────────────────────────────────────────────────

const INLINE_PATTERNS = [
  { re: /\[([^\]]+)\]\(([^)]+)\)/, type: "link" },
  { re: /\*\*([^*]+)\*\*/, type: "strong" },
  { re: /~~([^~]+)~~/, type: "del" },
  { re: /\*([^*\n]+)\*/, type: "em" },
  { re: /_([^_\n]+)_/, type: "em" },
  { re: /`([^`]+)`/, type: "code" },
];

function parseInline(text) {
  if (!text) return [];
  const nodes = [];
  let rem = text;

  while (rem.length > 0) {
    let earliest = null;
    let earliestIdx = rem.length;
    let earliestPat = null;

    for (const pat of INLINE_PATTERNS) {
      const m = rem.match(pat.re);
      if (m && m.index < earliestIdx) {
        earliest = m;
        earliestIdx = m.index;
        earliestPat = pat;
      }
    }

    if (!earliest) { nodes.push(rem); break; }
    if (earliestIdx > 0) nodes.push(rem.slice(0, earliestIdx));

    if (earliestPat.type === "link") {
      nodes.push({ type: "link", text: earliest[1], href: earliest[2] });
    } else {
      nodes.push({ type: earliestPat.type, text: earliest[1] });
    }
    rem = rem.slice(earliestIdx + earliest[0].length);
  }
  return nodes;
}

function inlineToJsx(nodes) {
  return nodes.map((n, i) => {
    if (typeof n === "string") return n;
    switch (n.type) {
      case "strong": return <strong key={i}>{n.text}</strong>;
      case "em":     return <em key={i}>{n.text}</em>;
      case "del":    return <del key={i}>{n.text}</del>;
      case "code":   return (
        <code key={i} style={{ fontFamily: "var(--mono)", background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4, fontSize: "0.88em", border: "1px solid var(--border-soft)" }}>
          {n.text}
        </code>
      );
      case "link":   return (
        <a key={i} href={n.href} target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}>
          {n.text}
        </a>
      );
      default: return n.text;
    }
  });
}

// ── Block parser ──────────────────────────────────────────────────────────────

function parseBlocks(md) {
  const lines = md.split("\n");
  const blocks = [];
  let para = [];
  let list = null;
  let listType = null;
  let inCode = false;
  let codeLines = [];

  const flushPara = () => {
    if (para.length) { blocks.push({ type: "p", lines: [...para] }); para = []; }
  };
  const flushList = () => {
    if (list) { blocks.push({ type: listType, items: [...list] }); list = null; listType = null; }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { blocks.push({ type: "pre", text: codeLines.join("\n") }); codeLines = []; inCode = false; }
      else { flushPara(); flushList(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) { flushPara(); flushList(); blocks.push({ type: "h3", text: line.slice(4) }); continue; }
    if (line.startsWith("## "))  { flushPara(); flushList(); blocks.push({ type: "h2", text: line.slice(3) }); continue; }
    if (line.startsWith("# "))   { flushPara(); flushList(); blocks.push({ type: "h1", text: line.slice(2) }); continue; }
    if (line.startsWith("> "))   { flushPara(); flushList(); blocks.push({ type: "blockquote", text: line.slice(2) }); continue; }

    if (/^[-*+] /.test(line)) {
      flushPara();
      if (listType !== "ul") { flushList(); list = []; listType = "ul"; }
      list.push(line.slice(2));
      continue;
    }
    if (/^\d+\. /.test(line)) {
      flushPara();
      if (listType !== "ol") { flushList(); list = []; listType = "ol"; }
      list.push(line.replace(/^\d+\. /, ""));
      continue;
    }

    if (line.trim() === "") { flushPara(); flushList(); continue; }

    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

// ── Public API ────────────────────────────────────────────────────────────────

const H_STYLES = {
  h1: { fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 8, marginTop: 4 },
  h2: { fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 6, marginTop: 2 },
  h3: { fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 },
};

export function renderMarkdown(text) {
  if (!text?.trim()) return null;
  return parseBlocks(text).map((block, i) => {
    const il = (t) => inlineToJsx(parseInline(t));

    switch (block.type) {
      case "h1": return <div key={i} style={H_STYLES.h1}>{il(block.text)}</div>;
      case "h2": return <div key={i} style={H_STYLES.h2}>{il(block.text)}</div>;
      case "h3": return <div key={i} style={H_STYLES.h3}>{il(block.text)}</div>;

      case "p": return (
        <p key={i} style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, margin: "0 0 10px" }}>
          {block.lines.map((line, li) => (
            <React.Fragment key={li}>
              {il(line)}{li < block.lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );

      case "ul": return (
        <ul key={i} style={{ paddingLeft: 18, margin: "0 0 10px", listStyleType: "disc" }}>
          {block.items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 2 }}>{il(item)}</li>
          ))}
        </ul>
      );

      case "ol": return (
        <ol key={i} style={{ paddingLeft: 18, margin: "0 0 10px", listStyleType: "decimal" }}>
          {block.items.map((item, ii) => (
            <li key={ii} style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 2 }}>{il(item)}</li>
          ))}
        </ol>
      );

      case "pre": return (
        <pre key={i} style={{ fontFamily: "var(--mono)", background: "var(--surface-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "10px 12px", fontSize: 12, overflowX: "auto", margin: "0 0 10px", lineHeight: 1.5 }}>
          <code style={{ color: "var(--text-2)" }}>{block.text}</code>
        </pre>
      );

      case "blockquote": return (
        <blockquote key={i} style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12, margin: "0 0 10px", color: "var(--text-3)", fontStyle: "italic", fontSize: 13 }}>
          {il(block.text)}
        </blockquote>
      );

      default: return null;
    }
  });
}
