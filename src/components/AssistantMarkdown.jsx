import { useEffect, useRef, useState } from "react";

// A tiny, safe renderer for what the assistant writes. It understands paragraphs, numbered and bullet lists,
// **bold**, `inline code` and ``` fenced code blocks, and nothing else: no links, images or HTML. Every piece
// of text goes into the page as a React text node, so whatever the model writes is shown as text and is never
// parsed as HTML (nothing here inserts raw markup).

const FENCE = /^\s*```+\s*([A-Za-z0-9_+-]*)\s*$/;
const FENCE_END = /^\s*```+\s*$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;

// Text -> blocks: { type: "p", text } | { type: "ol", start, items } | { type: "ul", items } | { type: "code", lang, code }
// Blank lines only separate blocks, so any number of them collapses to nothing.
export function parseBlocks(source) {
  const lines = String(source ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(FENCE);
    if (fence) {
      flushParagraph();
      flushList();
      const code = [];
      i += 1;
      while (i < lines.length && !FENCE_END.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // the closing fence (an unclosed fence runs to the end)
      blocks.push({ type: "code", lang: fence[1], code: code.join("\n").replace(/\n+$/, "") });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      i += 1;
      continue;
    }

    const ordered = line.match(ORDERED);
    const bullet = ordered ? null : line.match(BULLET);
    if (ordered || bullet) {
      const type = ordered ? "ol" : "ul";
      if (!list || list.type !== type) {
        flushParagraph();
        flushList();
        list = { type, items: [], ...(ordered ? { start: Number(ordered[1]) } : {}) };
      }
      list.items.push((ordered ? ordered[2] : bullet[1]).trim());
    } else if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`; // an indented line continues the item
    } else {
      flushList();
      paragraph.push(line);
    }
    i += 1;
  }
  flushParagraph();
  flushList();
  return blocks;
}

function Inline({ text }) {
  const parts = [];
  text.split(/(`[^`\n]+`)/g).forEach((piece, i) => {
    if (piece.length > 2 && piece.startsWith("`") && piece.endsWith("`")) {
      parts.push(
        <code
          key={`c${i}`}
          className="rounded bg-[#ECEEF1] px-1 py-px font-mono text-[12px] text-[#1F2433]"
        >
          {piece.slice(1, -1)}
        </code>
      );
      return;
    }
    piece.split(/(\*\*[^*\n]+\*\*)/g).forEach((segment, j) => {
      if (/^\*\*[^*\n]+\*\*$/.test(segment)) {
        parts.push(
          <strong key={`b${i}-${j}`} className="font-semibold">
            {segment.slice(2, -2)}
          </strong>
        );
      } else if (segment) {
        parts.push(segment);
      }
    });
  });
  return <>{parts}</>;
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false); // no clipboard (or refused): the text can still be selected by hand
    }
  };

  return (
    <figure className="overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F3F4F6]">
      <figcaption className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] px-2.5 py-1">
        <span className="text-[11px] text-[#6B7280]">Suggested code - review before using</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#E5E7EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre className="m-0 overflow-x-auto px-2.5 py-2 text-[12px] leading-5 text-[#1F2433]">
        <code className="font-mono">{code}</code>
      </pre>
    </figure>
  );
}

export default function AssistantMarkdown({ text }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === "code") return <CodeBlock key={index} code={block.code} />;
        if (block.type === "ol" || block.type === "ul") {
          const List = block.type;
          return (
            <List
              key={index}
              start={block.type === "ol" ? block.start : undefined}
              className={`space-y-1 pl-5 marker:text-[#9CA3AF] ${block.type === "ol" ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item, n) => (
                <li key={n} className="pl-0.5">
                  <Inline text={item} />
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line">
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
