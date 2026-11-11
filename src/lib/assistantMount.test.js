import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The customizer and the code editor don't render AdminSidebar, so each mounts the assistant itself. These
// pages are too big to render in a test, so check by reading the source that every page mounts it exactly once.
const source = (relative) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
// Comments may name AdminSidebar (to say the page has none); only code counts
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const count = (text, needle) => text.split(needle).length - 1;

describe("where the assistant is mounted", () => {
  it("AdminSidebar (every page that has the sidebar) mounts one panel and its two buttons", () => {
    const text = source("../components/AdminSidebar.jsx");
    expect(count(text, "<AssistantPanel")).toBe(1);
    expect(count(text, "<AssistantButton")).toBe(2);
  });

  it.each([
    ["the customizer", "../pages/AdminCustomize.jsx", "dark"],
    ["the code editor", "../components/CodeWorkbench.jsx", "light"],
  ])("%s mounts one panel and one button of its own tone, and has no AdminSidebar", (_name, file, tone) => {
    const text = code(source(file));
    expect(count(text, "<AssistantPanel")).toBe(1);
    expect(count(text, `<AssistantButton tone="${tone}"`)).toBe(1);
    expect(count(text, "<AssistantButton")).toBe(1);
    expect(text).not.toMatch(/AdminSidebar|AdminHeader/);
  });

  it("the code editor mounts it only in fullscreen mode, outside the editor's key handler", () => {
    const text = source("../components/CodeWorkbench.jsx");
    expect(text).toContain("{fullscreen && <AssistantPanel />}");
    expect(text).toContain('{fullscreen && <AssistantButton tone="light" />}');
    // The panel comes after the editor's root element closes, not inside it
    expect(text.indexOf("<AssistantPanel")).toBeGreaterThan(text.indexOf("onKeyDown={onKeyDown}"));
  });

  it("only the code editor page uses the fullscreen workbench", () => {
    expect(source("../pages/EditorDemo.jsx")).toContain("fullscreen");
  });

  it("index.css pads the body by the panel's width while html is marked, and only then", () => {
    const css = source("../index.css");
    expect(css).toMatch(/html\[data-assistant-push="true"\]\s+body\s*\{\s*padding-right:\s*400px;/);
    expect(css).toMatch(/body\s*\{\s*transition:\s*padding-right 200ms/);
    expect(css).toMatch(/prefers-reduced-motion/);
  });

  it("no page the panel squeezes is sized in viewport widths, which body padding can't shrink", () => {
    expect(source("../pages/EditorDemo.jsx")).not.toContain("w-screen");
    expect(source("../pages/EditorDemo.jsx")).toContain("w-full");
  });

  it("the backdrop and the push switch over at the same width", () => {
    const panel = source("../components/AssistantPanel.jsx");
    expect(panel).toContain("export const PUSH_MIN_WIDTH = 1280;");
    expect(panel).toContain("xl:hidden"); // Tailwind's xl is 1280px
    expect(panel).not.toContain("lg:hidden");
  });
});
