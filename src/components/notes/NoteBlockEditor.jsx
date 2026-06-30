import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import DOMPurify from "dompurify";

function mdToHtml(md = "") {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const inline = (s) => {
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  };
  const lines = md.split("\n");
  let html = "";
  let inUl = false;
  let inOl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  const closeOl = () => { if (inOl) { html += "</ol>"; inOl = false; } };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const e = esc(raw);
    if (/^- \[x\] /i.test(raw)) { closeUl(); closeOl(); html += `<div data-type="todo" class="done"><input type="checkbox" checked><span>${inline(esc(raw.replace(/^- \[x\] /i, "")))}</span></div>`; continue; }
    if (/^- \[ \] /.test(raw)) { closeUl(); closeOl(); html += `<div data-type="todo"><input type="checkbox"><span>${inline(esc(raw.replace(/^- \[ \] /, "")))}</span></div>`; continue; }
    if (raw.trim().startsWith("```")) {
      closeUl(); closeOl(); i++;
      let code = "";
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code += esc(lines[i]) + "\n"; i++; }
      html += `<pre><code>${code.trimEnd()}</code></pre>`;
      continue;
    }
    if (e.startsWith("# ")) { closeUl(); closeOl(); html += `<h1>${inline(esc(raw.slice(2)))}</h1>`; }
    else if (e.startsWith("## ")) { closeUl(); closeOl(); html += `<h2>${inline(esc(raw.slice(3)))}</h2>`; }
    else if (e.startsWith("### ")) { closeUl(); closeOl(); html += `<h3>${inline(esc(raw.slice(4)))}</h3>`; }
    else if (e.trim() === "---") { closeUl(); closeOl(); html += "<hr>"; }
    else if (/^> /.test(raw)) { closeUl(); closeOl(); html += `<blockquote><p>${inline(esc(raw.slice(2)))}</p></blockquote>`; }
    else if (/^- /.test(raw)) { closeOl(); if (!inUl) { html += "<ul>"; inUl = true; } html += `<li>${inline(esc(raw.slice(2)))}</li>`; }
    else if (/^\d+\. /.test(raw)) { closeUl(); if (!inOl) { html += "<ol>"; inOl = true; } html += `<li>${inline(esc(raw.replace(/^\d+\. /, "")))}</li>`; }
    else if (e.trim() === "") { closeUl(); closeOl(); html += "<p><br></p>"; }
    else { closeUl(); closeOl(); html += `<p>${inline(e)}</p>`; }
  }

  closeUl();
  closeOl();
  return html;
}

function initEditorContent(content) {
  if (!content) return "";
  const html = /<[a-z]/i.test(content) ? content : mdToHtml(content);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "del", "s", "code", "pre", "blockquote",
      "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "hr", "div", "span",
      "table", "thead", "tbody", "tr", "th", "td", "input",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "class", "style", "data-type", "data-noteid",
      "type", "checked", "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
}

function focusAtEnd(element) {
  element.focus();
  const selection = window.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

const NoteBlockEditor = forwardRef(function NoteBlockEditor({ noteId, content, onContentChange }, ref) {
  const editorRef = useRef(null);
  const contentPropRef = useRef(content);
  const latestContentRef = useRef(initEditorContent(content));

  const serializeEditor = useCallback(() => {
    return initEditorContent(editorRef.current?.innerHTML || "");
  }, []);

  const emitChange = useCallback(() => {
    const nextContent = serializeEditor();
    latestContentRef.current = nextContent;
    onContentChange(nextContent);
  }, [onContentChange, serializeEditor]);

  useEffect(() => {
    contentPropRef.current = content;
  }, [content]);

  useEffect(() => {
    const nextContent = initEditorContent(contentPropRef.current);
    latestContentRef.current = nextContent;
    if (editorRef.current) editorRef.current.innerHTML = nextContent;
  }, [noteId]);

  const appendParagraphs = useCallback((text) => {
    const editorEl = editorRef.current;
    if (!editorEl) return;
    const html = String(text)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${DOMPurify.sanitize(line, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })}</p>`)
      .join("");
    if (!html) return;

    if (!editorEl.textContent?.trim()) editorEl.innerHTML = "";
    const holder = document.createElement("div");
    holder.innerHTML = initEditorContent(html);
    editorEl.append(...Array.from(holder.childNodes));
    latestContentRef.current = serializeEditor();
    focusAtEnd(editorEl);
  }, [serializeEditor]);

  const handlePaste = useCallback((event) => {
    event.preventDefault();
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain") || "";
    const safeHtml = initEditorContent(html || mdToHtml(text));
    document.execCommand("insertHTML", false, safeHtml);
    window.requestAnimationFrame(emitChange);
  }, [emitChange]);

  useImperativeHandle(ref, () => ({
    appendParagraphs,
    getContent: () => latestContentRef.current,
    getText: () => editorRef.current?.innerText?.trim() || "",
  }), [appendParagraphs]);

  return (
    <div
      ref={editorRef}
      className="note-ce"
      contentEditable
      data-placeholder="Začni psát..."
      onInput={emitChange}
      onBlur={emitChange}
      onPaste={handlePaste}
      suppressContentEditableWarning
    />
  );
});

export default NoteBlockEditor;
