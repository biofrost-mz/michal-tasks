// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderMarkdown, sanitizeHtml, parseYMD } from "./utils.js";

describe("renderMarkdown — odkazy a bezpečnost atributů", () => {
  it("neescapuje dvojitě & v URL (query stringy zůstanou platné)", () => {
    const html = renderMarkdown("[odkaz](https://example.com/?a=1&b=2)");
    // vstup je escapovaný na úrovni řádku → v atributu má být JEDNO &amp;
    expect(html).toContain("a=1&amp;b=2");
    expect(html).not.toContain("&amp;amp;");
  });

  it("neescapuje dvojitě & v textu odkazu", () => {
    const html = renderMarkdown("viz [A & B](https://example.com)");
    expect(html).toContain(">A &amp; B</a>");
    expect(html).not.toContain("&amp;amp;");
  });

  it("uvozovku v URL escapuje (žádné vylomení z href atributu)", () => {
    const html = renderMarkdown('[x](https://example.com/" onmouseover="alert(1))');
    expect(html).toContain("&quot;");
    // literální uvozovka následovaná handlerem by znamenala breakout
    expect(html).not.toContain('onmouseover="');
  });

  it("uvozovku v alt textu obrázku escapuje", () => {
    const html = renderMarkdown('![a" onerror="alert(1)](https://example.com/i.png)');
    expect(html).toContain("&quot;");
    expect(html).not.toContain('onerror="');
  });

  it("blokuje javascript: URL (nahradí za #)", () => {
    const html = renderMarkdown("[klikni](javascript:alert(1))");
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });

  it("běžný markdown pořád funguje", () => {
    const html = renderMarkdown("**tučně** a *kurzíva*");
    expect(html).toContain("<strong>tučně</strong>");
    expect(html).toContain("<em>kurzíva</em>");
  });
});

describe("sanitizeHtml — DOMPurify vrstva", () => {
  it("zachová povolené tagy", () => {
    expect(sanitizeHtml("<strong>ahoj</strong>")).toContain("<strong>");
  });

  it("odstraní <script>", () => {
    expect(sanitizeHtml("<script>alert(1)</script>")).not.toContain("<script");
  });

  it("odstraní inline event handlery", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain("onerror");
  });

  it("odstraní javascript: v href", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });
});

describe("parseYMD — lokální datum bez timezone posunu", () => {
  it("parsuje YYYY-MM-DD na lokální půlnoc", () => {
    const d = parseYMD("2026-07-02");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // červenec = index 6
    expect(d.getDate()).toBe(2);
    expect(d.getHours()).toBe(0);
  });

  it("vrací null pro neplatný vstup", () => {
    expect(parseYMD("")).toBeNull();
    expect(parseYMD("nesmysl")).toBeNull();
  });
});
