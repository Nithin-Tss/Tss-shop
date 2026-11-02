import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import AssistantMarkdown, { parseBlocks } from "@/components/AssistantMarkdown";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("parseBlocks", () => {
  it("splits paragraphs and collapses extra blank lines", () => {
    expect(parseBlocks("One.\n\n\n\n\nTwo.\nStill two.\n\n")).toEqual([
      { type: "p", text: "One." },
      { type: "p", text: "Two.\nStill two." },
    ]);
    expect(parseBlocks("")).toEqual([]);
    expect(parseBlocks(null)).toEqual([]);
  });

  it("reads numbered lists, keeping the start number across a blank line", () => {
    expect(parseBlocks("1. a\n2. b\n\n3. c")).toEqual([
      { type: "ol", start: 1, items: ["a", "b"] },
      { type: "ol", start: 3, items: ["c"] },
    ]);
    expect(parseBlocks("1) a\n2) b")[0].items).toEqual(["a", "b"]);
  });

  it("reads bullet lists with -, * and the bullet sign, and an indented line continues an item", () => {
    expect(parseBlocks("- a\n* b\n• c")).toEqual([{ type: "ul", items: ["a", "b", "c"] }]);
    expect(parseBlocks("- a\n   more of a\n- b")[0].items).toEqual(["a more of a", "b"]);
  });

  it("does not take **bold** at the start of a line for a bullet", () => {
    expect(parseBlocks("**Note** this")).toEqual([{ type: "p", text: "**Note** this" }]);
  });

  it("reads fenced code blocks, with or without a language, and an unclosed fence", () => {
    expect(parseBlocks("Before\n```liquid\n{% if x %}\n  y\n{% endif %}\n```\nAfter")).toEqual([
      { type: "p", text: "Before" },
      { type: "code", lang: "liquid", code: "{% if x %}\n  y\n{% endif %}" },
      { type: "p", text: "After" },
    ]);
    expect(parseBlocks("```\na\n```")[0]).toEqual({ type: "code", lang: "", code: "a" });
    expect(parseBlocks("```css\nbody {}")[0].code).toBe("body {}");
  });

  it("keeps list-like lines inside a code block as code", () => {
    const blocks = parseBlocks("```\n1. not a list\n- nor this\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code");
  });
});

describe("AssistantMarkdown", () => {
  it("renders paragraphs, lists, bold and inline code", () => {
    const { container } = render(
      <AssistantMarkdown text={"Do this:\n\n1. Open **Footer**\n2. Set `Phone number`\n\n- one\n- two"} />
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
    expect(container.querySelector("strong").textContent).toBe("Footer");
    expect(container.querySelector("li code").textContent).toBe("Phone number");
  });

  it("numbers a continued list from where it left off", () => {
    const { container } = render(<AssistantMarkdown text={"3. third\n4. fourth"} />);
    expect(container.querySelector("ol").getAttribute("start")).toBe("3");
  });

  it("shows HTML, scripts and images as text, never as elements", () => {
    const html = '<script>alert(1)</script><img src=x onerror="alert(2)"><b>bold?</b> <a href="javascript:alert(3)">x</a>';
    const { container } = render(<AssistantMarkdown text={html} />);
    expect(container.textContent).toBe(html);
    for (const tag of ["script", "img", "b", "a"]) expect(container.querySelector(tag)).toBeNull();
  });

  it("does not turn links or images in markdown into elements", () => {
    const { container } = render(<AssistantMarkdown text={"[click](http://evil.example) ![x](http://evil.example/a.png)"} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("[click](http://evil.example)");
  });

  it("leaves unmatched markers as plain text", () => {
    const { container } = render(<AssistantMarkdown text={"a ** b `c and *d*"} />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("code")).toBeNull();
    expect(container.textContent).toBe("a ** b `c and *d*");
  });

  it("puts HTML inside a code block in the code, as text", () => {
    const { container } = render(<AssistantMarkdown text={'```html\n<img src=x onerror="alert(1)">\n```'} />);
    expect(container.querySelector("pre code").textContent).toBe('<img src=x onerror="alert(1)">');
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a code block with a caption, a monospace scrolling area and a Copy button", () => {
    const { container } = render(<AssistantMarkdown text={"```liquid\n{{ s.utility_phone }}\n```"} />);
    expect(screen.getByText("Suggested code - review before using")).toBeTruthy();
    const pre = container.querySelector("pre");
    expect(pre.className).toContain("overflow-x-auto");
    expect(pre.querySelector("code").className).toContain("font-mono");
    expect(screen.getByRole("button", { name: "Copy code" }).textContent).toBe("Copy");
  });

  it("copies the code exactly and says Copied", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AssistantMarkdown text={"```\nline 1\n  line 2\n```"} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });
    expect(writeText).toHaveBeenCalledWith("line 1\n  line 2");
    expect(screen.getByRole("button", { name: "Copy code" }).textContent).toBe("Copied");
  });

  it("copes when there is no clipboard", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<AssistantMarkdown text={"```\nx\n```"} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code" }));
    });
    expect(screen.getByRole("button", { name: "Copy code" }).textContent).toBe("Copy");
  });

  it("never uses dangerouslySetInnerHTML", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    for (const file of ["./AssistantMarkdown.jsx", "./AssistantChat.jsx", "./AssistantPanel.jsx"]) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");
      expect(source).not.toContain("dangerouslySetInnerHTML");
      expect(source).not.toContain("innerHTML");
    }
  });
});
