import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest, apiUpload } from "@/lib/api";
import { listBlogPosts, listStorePages } from "@/lib/themeApi";
import Icon from "@/components/Icons";
import LinkField from "@/components/LinkField";

// Strip HTML tags for character counting and plain text preview
export const plainText = (html) =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// Lightweight, safe HTML sanitizer for descriptions
export function sanitizeHtml(html) {
  if (!html || typeof html !== "string") return "";
  if (typeof window === "undefined" || !window.DOMParser) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const DISALLOWED_TAGS = [
    "script",
    "style",
    "object",
    "embed",
    "applet",
    "form",
    "input",
    "textarea",
    "select",
    "button",
    "meta",
    "link",
    "base",
  ];

  const ALLOWED_IFRAME_HOSTS = [
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
  ];

  function clean(node) {
    const toRemove = [];
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();
        if (DISALLOWED_TAGS.includes(tag)) {
          toRemove.push(child);
          continue;
        }

        if (tag === "iframe") {
          try {
            const url = new URL(child.src, window.location.origin);
            if (
              !ALLOWED_IFRAME_HOSTS.some(
                (h) => url.hostname === h || url.hostname.endsWith("." + h)
              )
            ) {
              toRemove.push(child);
              continue;
            }
          } catch {
            toRemove.push(child);
            continue;
          }
        }

        // Strip inline on* handlers and dangerous protocols
        for (const attr of Array.from(child.attributes)) {
          const name = attr.name.toLowerCase();
          const val = attr.value.trim().toLowerCase();
          if (name.startsWith("on")) {
            child.removeAttribute(attr.name);
          } else if (
            (name === "href" || name === "src") &&
            (val.startsWith("javascript:") ||
              val.startsWith("data:text/html") ||
              val.startsWith("vbscript:"))
          ) {
            child.removeAttribute(attr.name);
          }
        }

        clean(child);
      }
    }
    toRemove.forEach((el) => el.remove());
  }

  clean(doc.body);
  return doc.body.innerHTML;
}

// Convert video URL into responsive embed iframe or video tag
function formatVideoEmbed(url) {
  if (!url) return null;
  const trimmed = url.trim();

  if (trimmed.startsWith("<iframe") && trimmed.endsWith("</iframe>")) {
    return `<div class="responsive-video my-3" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;">${trimmed}</div>`;
  }

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i
  );
  // YouTube / Vimeo: only the tag and attributes the storefront keeps (src, title, width, height), because it
  // removes style and class. The page's own CSS sizes the frame, so the editor and the storefront match.
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return `<p><iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" title="YouTube video" allowfullscreen></iframe></p>`;
  }

  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return `<p><iframe src="https://player.vimeo.com/video/${videoId}" width="560" height="315" title="Vimeo video" allowfullscreen></iframe></p>`;
  }

  if (/\.(mp4|webm|ogg)($|\?)/i.test(trimmed)) {
    return `<video controls src="${trimmed}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;"></video>`;
  }

  return `<div class="responsive-video my-3" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;"><iframe src="${trimmed}" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe></div>`;
}

// Generate styled HTML table
function generateTableHtml(rows = 3, cols = 3, hasHeader = true) {
  let html = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #cbd5e1;">`;
  if (hasHeader) {
    html += `<thead><tr>`;
    for (let c = 0; c < cols; c++) {
      html += `<th style="border: 1px solid #cbd5e1; padding: 8px 12px; background: #f8fafc; font-weight: 600; text-align: left;">Header ${c + 1}</th>`;
    }
    html += `</tr></thead>`;
  }
  html += `<tbody>`;
  const bodyRows = hasHeader ? Math.max(1, rows - 1) : rows;
  for (let r = 0; r < bodyRows; r++) {
    html += `<tr>`;
    for (let c = 0; c < cols; c++) {
      html += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 50px;"><br></td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table><p><br></p>`;
  return html;
}

// Give an existing table another size, keeping what is already typed in the cells that stay
function resizeTable(table, rows, cols) {
  const sample = table.querySelector("td") || table.rows[0]?.cells[0];
  const cellStyle = sample ? sample.style.cssText : "";

  Array.from(table.rows).forEach((tr) => {
    while (tr.cells.length > cols) tr.deleteCell(tr.cells.length - 1);
    while (tr.cells.length < cols) {
      const model = tr.cells[tr.cells.length - 1];
      const isHead = model?.nodeName === "TH";
      const cell = document.createElement(isHead ? "th" : "td");
      cell.style.cssText = model ? model.style.cssText : cellStyle;
      cell.innerHTML = isHead ? `Header ${tr.cells.length + 1}` : "<br>";
      tr.appendChild(cell);
    }
  });

  while (table.rows.length > rows && table.rows.length > 1) {
    table.deleteRow(table.rows.length - 1);
  }
  while (table.rows.length < rows) {
    const tbody = table.tBodies[0] || table.appendChild(document.createElement("tbody"));
    const tr = tbody.insertRow();
    for (let c = 0; c < cols; c++) {
      const td = tr.insertCell();
      td.style.cssText = cellStyle;
      td.innerHTML = "<br>";
    }
  }
}

// Helper to inspect current table context around cursor
function getTableContext(node) {
  let curr = node;
  while (curr && curr !== document.body) {
    if (curr.nodeName === "TD" || curr.nodeName === "TH") {
      const cell = curr;
      const row = cell.closest("tr");
      const table = cell.closest("table");
      return { cell, row, table };
    }
    curr = curr.parentNode;
  }
  return null;
}

// ---- "/" slash menu ----
// id is what runs; keys are extra words the typed text can match ("/h2", "/ul", "/youtube").
const SLASH_ITEMS = [
  { id: "h2", name: "Heading 2", hint: "Large section heading", keys: "heading h2 title" },
  { id: "h3", name: "Heading 3", hint: "Smaller heading", keys: "heading h3 subtitle" },
  { id: "p", name: "Paragraph", hint: "Plain text", keys: "text p body" },
  { id: "image", name: "Image", hint: "Upload or link a picture", keys: "image img picture photo" },
  { id: "button", name: "Button", hint: "Text with a link", keys: "button cta link" },
  { id: "ul", name: "Bulleted list", hint: "List with bullets", keys: "bullets ul list unordered" },
  { id: "ol", name: "Numbered list", hint: "List with numbers", keys: "ol list ordered numbers" },
  { id: "quote", name: "Quote", hint: "Highlighted quotation", keys: "quote blockquote citation" },
  {
    id: "divider",
    name: "Divider",
    hint: "A horizontal line",
    keys: "divider hr line rule separator",
  },
  { id: "table", name: "Table", hint: "Rows and columns", keys: "table grid" },
  { id: "video", name: "Video", hint: "YouTube or Vimeo link", keys: "video youtube vimeo embed" },
  { id: "spacer", name: "Spacer", hint: "Empty space", keys: "spacer space gap blank" },
];

function filterSlashItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.keys.split(" ").some((k) => k.startsWith(q))
  );
}

const BLOCK_TAGS = new Set([
  "P",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "BLOCKQUOTE",
  "TD",
  "TH",
  "PRE",
]);

// The line (block element) a node is in, or the editor itself when text sits straight in it
function blockOf(node, editor) {
  let n = node;
  while (n && n !== editor) {
    if (n.nodeType === 1 && BLOCK_TAGS.has(n.tagName)) return n;
    n = n.parentNode;
  }
  return editor;
}

// ---- Form controls in the content ----
// Inputs, textareas, selects and buttons that are part of the page content (a contact form) sit inside the page
// editor's own <form>, so the browser would check their `required` and submit them with Save. While they are in
// the editor they are cut loose from every form (form="..." pointing at nothing); the saved HTML gets its own
// markup back, byte for byte.
const CONTROL_SELECTOR = "input,textarea,select,button,fieldset,output";
const DETACHED = "data-tss-detached";

function detachControls(root) {
  if (!root) return;
  root.querySelectorAll(CONTROL_SELECTOR).forEach((el) => {
    if (el.hasAttribute(DETACHED)) return;
    el.setAttribute(DETACHED, el.hasAttribute("form") ? `=${el.getAttribute("form")}` : "-");
    el.setAttribute("form", "tss-content-controls-detached");
  });
}

// The editor's content as it is saved: controls back to their original markup
function readHtml(root) {
  if (!root) return "";
  if (!root.querySelector(`[${DETACHED}]`)) return root.innerHTML;
  const clone = root.cloneNode(true);
  clone.querySelectorAll(`[${DETACHED}]`).forEach((el) => {
    const original = el.getAttribute(DETACHED);
    if (original.startsWith("=")) el.setAttribute("form", original.slice(1));
    else el.removeAttribute("form");
    el.removeAttribute(DETACHED);
  });
  return clone.innerHTML;
}

// ---- Positions and inserted blocks ----
const nodeLength = (n) => (n.nodeType === 3 ? n.data.length : n.childNodes.length);

// Child indexes from root down to node (survives the editor's HTML being rewritten into the same shape)
function pathTo(node, root) {
  const path = [];
  let n = node;
  while (n && n !== root) {
    const p = n.parentNode;
    if (!p) return null;
    path.unshift(Array.prototype.indexOf.call(p.childNodes, n));
    n = p;
  }
  return n === root ? path : null;
}

function nodeAtPath(root, path) {
  let n = root;
  for (const i of path || []) {
    n = n?.childNodes[i];
    if (!n) return null;
  }
  return n;
}

const isBlank = (n) =>
  n.nodeType === 3 ? !n.data.replace(/[\s\u200b]/g, "") : n.nodeName === "BR";
const onlyChild = (parent, el) =>
  Array.from(parent.childNodes).every((n) => n === el || isBlank(n));
// A layout box (column, card): blocks inside it can be moved like blocks in the editor itself
const isLayoutBox = (n) => n.nodeName === "DIV" && !n.classList.contains("responsive-video");

function blockKind(el) {
  switch (el.nodeName) {
    case "A":
      return el.classList.contains("button") ? "button" : null;
    case "IMG":
      return "image";
    case "IFRAME":
    case "VIDEO":
      return "video";
    case "TABLE":
      return "table";
    case "HR":
      return "divider";
    default:
      return null;
  }
}

// What moves with a block: its own line when it is alone on it (<p><a class="button"></p>), else the element
function unitFor(el) {
  const p = el.parentNode;
  if (
    p &&
    (p.nodeName === "P" || (p.nodeName === "DIV" && p.classList.contains("responsive-video"))) &&
    onlyChild(p, el)
  ) {
    return p;
  }
  return el;
}

// The inserted block (button, image, video, table, divider) a node is in, if it sits on a line of its own
// in the editor or in a layout box
function findBlock(node, editor) {
  let n = node && node.nodeType === 3 ? node.parentNode : node;
  while (n && n !== editor && editor.contains(n)) {
    if (blockKind(n)) {
      const c = unitFor(n).parentNode;
      if (c === editor || (c && isLayoutBox(c) && editor.contains(c))) return n;
    }
    n = n.parentNode;
  }
  return null;
}

// The line (child of the editor or of a layout box) a node is in: where a dragged block can land beside
function lineAt(el, editor) {
  let n = el;
  while (n && n !== editor) {
    const p = n.parentNode;
    if (p === editor || (p && isLayoutBox(p) && editor.contains(p))) return n;
    n = p;
  }
  return null;
}

const isLineEdge = (n) => !n || n.nodeName === "BR" || BLOCK_TAGS.has(n.nodeName);

// "/" opens the menu only at the start of an empty line, or after a space, with nothing after the cursor
function slashAllowed(editor) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return false;
  const { startContainer: node, startOffset: offset } = sel.getRangeAt(0);
  if (!editor.contains(node)) return false;

  const block = blockOf(node, editor);
  if (block === editor) {
    // Text typed straight into the editor (no paragraph yet): judge by its own text node
    if (node === editor) return editor.textContent.trim() === "";
    if (node.nodeType !== 3) return false;
    const before = node.data.slice(0, offset);
    const startOk = before === "" ? isLineEdge(node.previousSibling) : /\s$/.test(before);
    return startOk && node.data.slice(offset) === "" && isLineEdge(node.nextSibling);
  }

  const head = document.createRange();
  head.setStart(block, 0);
  head.setEnd(node, offset);
  const tail = document.createRange();
  tail.setStart(node, offset);
  tail.setEnd(block, block.childNodes.length);
  const before = head.toString();
  return (before === "" || /\s$/.test(before)) && tail.toString() === "";
}

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// The storefront keeps only class="button" on a link (its theme styles it); the inline style is for this editor
const BUTTON_STYLE =
  "display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-weight:600;text-decoration:none;";

const PRESET_COLORS = [
  { name: "Default (Black)", color: "#111827" },
  { name: "Slate Gray", color: "#475569" },
  { name: "Muted Gray", color: "#94a3b8" },
  { name: "Ruby Red", color: "#dc2626" },
  { name: "Brand Orange", color: "#ea580c" },
  { name: "Warm Amber", color: "#d97706" },
  { name: "Emerald Green", color: "#16a34a" },
  { name: "Classic Blue", color: "#2563eb" },
  { name: "Indigo", color: "#4f46e5" },
  { name: "Royal Purple", color: "#9333ea" },
  { name: "Berry Pink", color: "#db2777" },
];

export default function RichTextEditor({
  id,
  value = "",
  onChange = () => {},
  placeholder = "Tell shoppers what it is, what it's made of and why they'll love it.",
  error,
}) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const lastEmittedRef = useRef(null);

  // View state
  const [isSourceView, setIsSourceView] = useState(false);

  // Active toolbar states
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
    alignment: "left",
    blockFormat: "p",
    color: "#111827",
    inLink: false,
    inTable: false,
  });

  // Dropdown & Popover toggles
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  // Dedicated refs for click-outside detection
  const styleMenuRef = useRef(null);
  const colorPickerRef = useRef(null);
  const alignMenuRef = useRef(null);
  const tableMenuRef = useRef(null);

  const closeAllDropdowns = useCallback(() => {
    setShowStyleMenu(false);
    setShowColorPicker(false);
    setShowAlignMenu(false);
    setShowTableMenu(false);
  }, []);

  // Close any open dropdown on click-outside or Escape key
  useEffect(() => {
    const isAnyMenuOpen = showStyleMenu || showColorPicker || showAlignMenu || showTableMenu;
    if (!isAnyMenuOpen) return undefined;

    const handlePointerDown = (e) => {
      if (showStyleMenu && styleMenuRef.current?.contains(e.target)) return;
      if (showColorPicker && colorPickerRef.current?.contains(e.target)) return;
      if (showAlignMenu && alignMenuRef.current?.contains(e.target)) return;
      if (showTableMenu && tableMenuRef.current?.contains(e.target)) return;

      closeAllDropdowns();
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showStyleMenu, showColorPicker, showAlignMenu, showTableMenu, closeAllDropdowns]);

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showInsertTableModal, setShowInsertTableModal] = useState(false);

  // Link form state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(true);

  // Image form state
  const [imageTab, setImageTab] = useState("url"); // "url" | "upload"
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  // Video form state
  const [videoUrl, setVideoUrl] = useState("");

  // "/" slash menu: { query, left, top | bottom } while open (slashRef holds the typed "/text" node and offset)
  const [slashMenu, setSlashMenu] = useState(null);
  const [slashActive, setSlashActive] = useState(0);
  const slashRef = useRef(null);
  const pendingSlashRef = useRef(false);
  const slashListId = useId();

  // Button form state (the "/" Button block)
  const [showButtonModal, setShowButtonModal] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonError, setButtonError] = useState("");
  const [linkData, setLinkData] = useState({ collections: [], products: [], pages: [], posts: [] });
  const linkDataLoadedRef = useRef(false);

  // The link being edited in the link dialog, so Update keeps it (and a button's look) instead of nesting a new one
  const linkAnchorRef = useRef(null);

  // Table form state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  // Where an inserted block goes while a dialog is open: the cursor (or selection) as it was when the dialog
  // opened, kept as nodes + child-index paths so it is not a live Range the browser can move to the top
  const insertPointRef = useRef(null);

  // Inserted blocks (button, image, video, table, divider): hover / caret shows a small toolbar on them
  const canvasRef = useRef(null);
  const blockBarRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [hoverBlock, setHoverBlock] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [blockTick, setBlockTick] = useState(0);
  const [barPos, setBarPos] = useState(null);
  const [dropLine, setDropLine] = useState(null);

  // Whether a dialog edits an existing block (Edit on the block toolbar) or inserts a new one; the block itself is in
  // editingElRef, so no state value is ever mutated
  const [editing, setEditing] = useState(false);
  const editingElRef = useRef(null);
  const clearEditing = () => {
    editingElRef.current = null;
    setEditing(false);
  };
  // Closing a dialog by any route puts the dialogs back to "insert" mode
  const closeLinkModal = () => {
    closeLinkModal();
    clearEditing();
  };
  const closeImageModal = () => {
    closeImageModal();
    clearEditing();
  };
  const closeVideoModal = () => {
    closeVideoModal();
    clearEditing();
  };
  const closeButtonModal = () => {
    closeButtonModal();
    clearEditing();
  };
  const closeTableModal = () => {
    closeTableModal();
    clearEditing();
  };

  // Undo history of the editor's HTML (typing is grouped); block moves, alignment and deletes are DOM changes the
  // browser's own undo does not track, so Ctrl+Z / Ctrl+Y use this instead
  const historyRef = useRef({ stack: [], index: -1, time: 0 });

  const resetHistory = () => {
    const ed = editorRef.current;
    historyRef.current = {
      stack: ed ? [{ html: readHtml(ed), caret: null, typing: false }] : [],
      index: ed ? 0 : -1,
      time: 0,
    };
  };

  // Synchronize incoming value into editor (only when value differs from what we emitted)
  useEffect(() => {
    if (editorRef.current && value !== lastEmittedRef.current) {
      if (readHtml(editorRef.current) !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
      detachControls(editorRef.current);
      lastEmittedRef.current = value;
      resetHistory();
    }
  }, [value]);

  // Clean up object preview urls on unmount
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Push the current HTML on the undo history (consecutive typing within a second is one step)
  const recordHistory = (typing) => {
    const ed = editorRef.current;
    if (!ed) return;
    const h = historyRef.current;
    const html = readHtml(ed);
    const current = h.stack[h.index];
    if (current && current.html === html) return;

    const sel = window.getSelection();
    const caret =
      sel && sel.anchorNode && ed.contains(sel.anchorNode)
        ? { path: pathTo(sel.anchorNode, ed), offset: sel.anchorOffset }
        : null;
    const entry = { html, caret, typing };
    const now = Date.now();

    if (typing && current?.typing && h.index === h.stack.length - 1 && now - h.time < 1000) {
      h.stack[h.index] = entry;
    } else {
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(entry);
      if (h.stack.length > 100) h.stack.shift();
      h.index = h.stack.length - 1;
    }
    h.time = now;
  };

  // Emit changes to parent
  const emit = useCallback(
    (typing = false) => {
      if (!editorRef.current) return;
      // Controls typed, pasted or inserted into the content are cut loose from the page form too
      detachControls(editorRef.current);
      const html = readHtml(editorRef.current);
      // Don't emit placeholder breaks
      const normalized = html === "<p><br></p>" || html === "<br>" ? "" : html;
      lastEmittedRef.current = normalized;
      recordHistory(typing === true);
      setBlockTick((t) => t + 1);
      onChange(normalized);
    },
    [onChange]
  );

  const stepHistory = (dir) => {
    const ed = editorRef.current;
    const h = historyRef.current;
    const next = h.index + dir;
    if (!ed || next < 0 || next >= h.stack.length) return;
    const entry = h.stack[next];
    h.index = next;
    ed.innerHTML = entry.html;
    detachControls(ed);

    const sel = window.getSelection();
    const range = document.createRange();
    const node = entry.caret ? nodeAtPath(ed, entry.caret.path) : null;
    if (node) {
      range.setStart(node, Math.min(entry.caret.offset, nodeLength(node)));
      range.collapse(true);
    } else {
      range.selectNodeContents(ed);
      range.collapse(false);
    }
    ed.focus();
    sel.removeAllRanges();
    sel.addRange(range);

    const normalized = entry.html === "<p><br></p>" || entry.html === "<br>" ? "" : entry.html;
    lastEmittedRef.current = normalized;
    setHoverBlock(null);
    setSelectedBlock(null);
    setBlockTick((t) => t + 1);
    onChange(normalized);
  };

  // Right-click / menu / browser Undo and Redo go through the same history
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return undefined;
    const onBeforeInput = (e) => {
      if (e.inputType === "historyUndo") {
        e.preventDefault();
        stepHistory(-1);
      } else if (e.inputType === "historyRedo") {
        e.preventDefault();
        stepHistory(1);
      }
    };
    ed.addEventListener("beforeinput", onBeforeInput);
    return () => ed.removeEventListener("beforeinput", onBeforeInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSourceView, onChange]);

  // Save selection before opening any dialog or clicking buttons
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore previously saved selection
  const restoreSelection = useCallback(() => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }, []);

  // Query formatting states around cursor
  const updateActiveStates = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUnderline = document.queryCommandState("underline");
      const isUl = document.queryCommandState("insertUnorderedList");
      const isOl = document.queryCommandState("insertOrderedList");

      let alignment = "left";
      if (document.queryCommandState("justifyCenter")) alignment = "center";
      else if (document.queryCommandState("justifyRight")) alignment = "right";
      else if (document.queryCommandState("justifyFull")) alignment = "justify";

      let block = document.queryCommandValue("formatBlock") || "p";
      block = block.toLowerCase().replace(/[<>]/g, "");

      const colorVal = document.queryCommandValue("foreColor") || "#111827";

      // Check if cursor is in link or table
      const sel = window.getSelection();
      let inLink = false;
      let inTable = false;
      if (sel && sel.anchorNode) {
        let parent = sel.anchorNode;
        while (parent && parent !== editorRef.current && parent !== document.body) {
          if (parent.nodeName === "A") inLink = true;
          if (parent.nodeName === "TD" || parent.nodeName === "TH" || parent.nodeName === "TABLE") {
            inTable = true;
          }
          parent = parent.parentNode;
        }
      }

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        unorderedList: isUl,
        orderedList: isOl,
        alignment,
        blockFormat: block,
        color: colorVal,
        inLink,
        inTable,
      });
    } catch {
      // Ignore queryCommand errors if editor is detached
    }
  }, []);

  // Keep saved range up to date whenever cursor moves
  const handleSelectionChange = useCallback(() => {
    saveSelection();
    updateActiveStates();

    // The block the caret is in (or the one selected) gets the block toolbar; focus elsewhere keeps it
    const ed = editorRef.current;
    const sel = window.getSelection();
    if (ed && sel && sel.anchorNode && ed.contains(sel.anchorNode)) {
      let target = sel.anchorNode;
      if (!sel.isCollapsed && target.nodeType === 1) {
        const child = target.childNodes[sel.anchorOffset];
        if (child && child.nodeType === 1) target = child;
      }
      setSelectedBlock(findBlock(target, ed));
    }
  }, [saveSelection, updateActiveStates]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Execute standard document command without collapsing selection
  const exec = (command, arg = null) => {
    if (isSourceView) return;
    closeAllDropdowns();

    if (command === "undo" || command === "redo") {
      stepHistory(command === "undo" ? -1 : 1);
      return;
    }

    const sel = window.getSelection();
    const hasFocusInEditor =
      sel &&
      sel.rangeCount > 0 &&
      editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);

    if (!hasFocusInEditor && savedRangeRef.current) {
      editorRef.current?.focus();
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }

    document.execCommand(command, false, arg);
    emit();
    saveSelection();
    updateActiveStates();
  };

  // Remember where a dialog's content goes: the current cursor / selection in the editor (or the last saved
  // one). Nodes and paths, not a live Range, so the browser cannot move it to the top meanwhile.
  const captureInsertPoint = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    let range = null;
    if (sel && sel.rangeCount > 0 && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else if (
      savedRangeRef.current &&
      ed.contains(savedRangeRef.current.commonAncestorContainer)
    ) {
      range = savedRangeRef.current;
    }
    insertPointRef.current = range
      ? {
          node: range.startContainer,
          offset: range.startOffset,
          path: pathTo(range.startContainer, ed),
          endNode: range.endContainer,
          endOffset: range.endOffset,
          endPath: pathTo(range.endContainer, ed),
        }
      : null;
  };

  // The saved position as a Range. If its nodes are gone and the same place cannot be found, the end of the
  // content (never the top).
  const resolveInsertRange = () => {
    const ed = editorRef.current;
    const p = insertPointRef.current;
    const range = document.createRange();
    const place = (node, path, offset) => {
      const n = node && node.isConnected && ed.contains(node) ? node : nodeAtPath(ed, path);
      return n ? { n, o: Math.min(offset, nodeLength(n)) } : null;
    };
    const start = p ? place(p.node, p.path, p.offset) : null;
    if (!start) {
      range.selectNodeContents(ed);
      range.collapse(false);
      return range;
    }
    range.setStart(start.n, start.o);
    const end = place(p.endNode, p.endPath, p.endOffset);
    if (end) {
      try {
        range.setEnd(end.n, end.o);
      } catch {
        range.collapse(true);
      }
    } else {
      range.collapse(true);
    }
    return range;
  };

  // Insert arbitrary HTML at the current selection, or, while a dialog is open, at the position saved when
  // the dialog opened
  const insertHtml = (html) => {
    if (isSourceView) return;
    closeAllDropdowns();

    const ed = editorRef.current;
    const sel = window.getSelection();
    const dialogOpen =
      showLinkModal || showImageModal || showVideoModal || showButtonModal || showInsertTableModal;

    if (dialogOpen && ed) {
      ed.focus();
      sel.removeAllRanges();
      sel.addRange(resolveInsertRange());
    } else {
      const hasFocusInEditor =
        sel && sel.rangeCount > 0 && ed?.contains(sel.getRangeAt(0).commonAncestorContainer);

      if (
        !hasFocusInEditor &&
        savedRangeRef.current &&
        ed?.contains(savedRangeRef.current.commonAncestorContainer)
      ) {
        ed.focus();
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } else if (!hasFocusInEditor && ed) {
        // No usable position: the end of the content
        ed.focus();
        const range = document.createRange();
        range.selectNodeContents(ed);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    let done = false;
    if (document.queryCommandSupported("insertHTML")) {
      done = document.execCommand("insertHTML", false, html);
    }
    if (!done) {
      const currentSel = window.getSelection();
      if (currentSel && currentSel.rangeCount > 0) {
        const range = currentSel.getRangeAt(0);
        range.deleteContents();
        const el = document.createElement("div");
        el.innerHTML = html;
        const frag = document.createDocumentFragment();
        let child;
        while ((child = el.firstChild)) {
          frag.appendChild(child);
        }
        range.insertNode(frag);
      }
    }
    emit();
    saveSelection();
    updateActiveStates();
  };

  const closeSlash = useCallback(() => {
    slashRef.current = null;
    pendingSlashRef.current = false;
    setSlashMenu(null);
    setSlashActive(0);
  }, []);

  // The menu sits at the cursor; it opens upward when there is no room below
  const slashPosition = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0).cloneRange();
    let rect = range.getClientRects()[0];
    if (!rect || (!rect.width && !rect.height && !rect.top)) {
      const el =
        range.startContainer.nodeType === 1
          ? range.startContainer
          : range.startContainer.parentElement;
      rect = el?.getBoundingClientRect();
    }
    if (!rect) return null;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 256));
    return rect.bottom + 280 > window.innerHeight && rect.top > 280
      ? { left, bottom: window.innerHeight - rect.top + 4 }
      : { left, top: rect.bottom + 4 };
  };

  // After each input: open the menu on a fresh "/", then follow what is typed after it
  const syncSlash = () => {
    const sel = window.getSelection();

    if (pendingSlashRef.current) {
      pendingSlashRef.current = false;
      const node = sel?.anchorNode;
      if (
        sel.isCollapsed &&
        node?.nodeType === 3 &&
        sel.anchorOffset > 0 &&
        node.data[sel.anchorOffset - 1] === "/"
      ) {
        const pos = slashPosition();
        if (pos) {
          slashRef.current = {
            node,
            start: sel.anchorOffset - 1,
            path: pathTo(node, editorRef.current),
          };
          setSlashActive(0);
          setSlashMenu({ query: "", ...pos });
        }
      }
      return;
    }

    const info = slashRef.current;
    if (!info) return;
    const node = sel?.anchorNode;
    if (
      !info.node.isConnected ||
      node !== info.node ||
      sel.anchorOffset <= info.start ||
      info.node.data[info.start] !== "/"
    ) {
      closeSlash();
      return;
    }
    const typed = info.node.data.slice(info.start + 1, sel.anchorOffset);
    if (/\s/.test(typed)) {
      closeSlash();
      return;
    }
    setSlashActive(0);
    setSlashMenu((m) => (m ? { ...m, query: typed } : m));
  };

  const handleInput = (e) => {
    const type = e?.nativeEvent?.inputType || "";
    emit(
      type === "insertText" || type === "deleteContentBackward" || type === "deleteContentForward"
    );
    syncSlash();
  };

  // An empty line to put the block on: the line the "/" was on if it is now empty, else a new one after it
  const prepareEmptyLine = () => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || !sel.rangeCount) return;

    let block = blockOf(sel.anchorNode, editor);
    if (block === editor) {
      if (editor.textContent.trim() === "" && !editor.querySelector("img,iframe,hr,table")) {
        editor.innerHTML = "<p><br></p>";
        const range = document.createRange();
        range.setStart(editor.firstChild, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      document.execCommand("formatBlock", false, "p");
      block = blockOf(window.getSelection().anchorNode, editor);
    }
    const empty =
      block !== editor &&
      block.textContent.replace(/[\s\u200b]/g, "") === "" &&
      !block.querySelector("img,iframe,hr,table");
    if (!empty) document.execCommand("insertParagraph");
  };

  // Load what the button's link picker lists (once, when first needed)
  const loadLinkData = () => {
    if (linkDataLoadedRef.current) return;
    linkDataLoadedRef.current = true;
    const safe = (promise) => promise.catch(() => []);
    Promise.all([
      safe(apiRequest("/api/v1/catalog/collections/")),
      safe(apiRequest("/api/v1/catalog/products/")),
      safe(listStorePages()),
      safe(listBlogPosts()),
    ]).then(([collections, products, pages, posts]) =>
      setLinkData({
        collections: Array.isArray(collections) ? collections : [],
        products: Array.isArray(products) ? products : [],
        pages: (Array.isArray(pages) ? pages : []).filter((p) => p.status === "visible"),
        posts: (Array.isArray(posts) ? posts : []).filter((p) => p.status === "published"),
      })
    );
  };

  const openButtonDialog = () => {
    closeAllDropdowns();
    saveSelection();
    captureInsertPoint();
    clearEditing();
    setButtonText("Shop now");
    setButtonUrl("");
    setButtonError("");
    loadLinkData();
    setShowButtonModal(true);
  };

  const applyButton = (e) => {
    e?.preventDefault();
    const text = buttonText.trim();
    const url = buttonUrl.trim();
    if (!text) {
      setButtonError("Enter the button text.");
      return;
    }
    // The storefront only keeps links that start like this
    if (!/^(https?:\/\/|mailto:|\/(?!\/))/i.test(url)) {
      setButtonError(
        "Pick a page, product or collection, or paste a link starting with https://, / or mailto:"
      );
      return;
    }
    const editedEl = editingElRef.current;
    if (editing && editedEl && editedEl.isConnected) {
      editedEl.setAttribute("href", url);
      editedEl.textContent = text;
      closeButtonModal();
      commitBlock();
      return;
    }
    insertHtml(
      `<p><a href="${escapeHtml(url)}" class="button" style="${BUTTON_STYLE}">${escapeHtml(text)}</a></p><p><br></p>`
    );
    closeButtonModal();
  };

  const openInsertTableDialog = () => {
    closeAllDropdowns();
    saveSelection();
    captureInsertPoint();
    clearEditing();
    setShowInsertTableModal(true);
  };

  // Insert the chosen block: remove the typed "/text", then put the block on that line
  const runSlash = (item) => {
    const info = slashRef.current;
    closeSlash();
    const editor = editorRef.current;
    if (!editor || isSourceView) return;
    editor.focus();

    const sel = window.getSelection();
    if (info?.node?.isConnected && sel) {
      const length = info.node.data.length;
      const end = sel.anchorNode === info.node ? sel.anchorOffset : length;
      const range = document.createRange();
      range.setStart(info.node, info.start);
      range.setEnd(info.node, Math.min(Math.max(end, info.start + 1), length));
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete");
    } else if (sel) {
      // The typed "/text" node was replaced (e.g. the editor's HTML was rewritten): go back to where the "/" was,
      // by path; if that place is gone too, the end of the content (never the top)
      const range = document.createRange();
      const n = info?.path ? nodeAtPath(editor, info.path) : null;
      if (n) {
        range.setStart(n, Math.min(info.start, nodeLength(n)));
        range.collapse(true);
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }

    prepareEmptyLine();

    switch (item.id) {
      case "h2":
        exec("formatBlock", "<h2>");
        break;
      case "h3":
        exec("formatBlock", "<h3>");
        break;
      case "p":
        exec("formatBlock", "<p>");
        break;
      case "ul":
        exec("insertUnorderedList");
        break;
      case "ol":
        exec("insertOrderedList");
        break;
      case "quote":
        exec("formatBlock", "<blockquote>");
        break;
      case "divider":
        insertHtml("<hr><p><br></p>");
        break;
      case "spacer":
        insertHtml("<p>&nbsp;</p><p><br></p>");
        break;
      case "image":
        openImageDialog();
        break;
      case "button":
        openButtonDialog();
        break;
      case "table":
        openInsertTableDialog();
        break;
      case "video":
        openVideoDialog();
        break;
      default:
        break;
    }
  };

  // Keyboard shortcut handler
  const handleKeyDown = (e) => {
    if (slashMenu) {
      const list = filterSlashItems(slashMenu.query);
      const current = Math.min(slashActive, Math.max(list.length - 1, 0));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.length) {
          const delta = e.key === "ArrowDown" ? 1 : -1;
          setSlashActive((current + delta + list.length) % list.length);
        }
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (list[current]) runSlash(list[current]);
        else closeSlash();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeSlash();
        return;
      }
      // Backspace on the "/" itself deletes it as usual, and the menu goes with it
      if (e.key === "Backspace" && slashMenu.query === "") closeSlash();
      else if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(e.key))
        closeSlash();
    } else if (
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.nativeEvent?.isComposing &&
      !isSourceView
    ) {
      pendingSlashRef.current = Boolean(editorRef.current && slashAllowed(editorRef.current));
    }

    // Alt+Up / Alt+Down move the block the caret is in (a button, picture, video, table or divider)
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      if (selectedBlock?.isConnected) {
        e.preventDefault();
        moveBlock(e.key === "ArrowUp" ? -1 : 1, selectedBlock);
      }
      return;
    }
    // Tab on a selected block goes to its toolbar (anywhere else it indents, as before)
    if (e.key === "Tab" && !e.shiftKey && !e.altKey && selectedBlock?.isConnected && barPos) {
      e.preventDefault();
      blockBarRef.current?.querySelector("button")?.focus();
      return;
    }

    const isMeta = e.ctrlKey || e.metaKey;
    if (isMeta && !e.shiftKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      exec("bold");
    } else if (isMeta && !e.shiftKey && e.key.toLowerCase() === "i") {
      e.preventDefault();
      exec("italic");
    } else if (isMeta && !e.shiftKey && e.key.toLowerCase() === "u") {
      e.preventDefault();
      exec("underline");
    } else if (isMeta && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      exec("undo");
    } else if (
      isMeta &&
      (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))
    ) {
      e.preventDefault();
      exec("redo");
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        exec("outdent");
      } else {
        exec("indent");
      }
    }
  };

  // Clean pasted content so it doesn't break editor layout
  const handlePaste = (e) => {
    e.preventDefault();
    closeSlash();
    const clipboardData = e.clipboardData || window.clipboardData;
    const html = clipboardData?.getData("text/html");
    const text = clipboardData?.getData("text/plain");

    if (html) {
      const cleaned = sanitizeHtml(html);
      insertHtml(cleaned);
    } else if (text) {
      const textHtml = text
        .split(/\r?\n\r?\n/)
        .map((para) => `<p>${para.replace(/\r?\n/g, "<br>")}</p>`)
        .join("");
      insertHtml(textHtml);
    }
  };

  // Style block format
  const handleFormatBlock = (tag) => {
    closeAllDropdowns();
    restoreSelection();
    try {
      document.execCommand("formatBlock", false, `<${tag}>`);
    } catch {
      document.execCommand("formatBlock", false, tag);
    }
    emit();
    saveSelection();
    updateActiveStates();
  };

  // Alignment handler
  const handleAlign = (alignType) => {
    closeAllDropdowns();
    restoreSelection();
    if (alignType === "left") exec("justifyLeft");
    else if (alignType === "center") exec("justifyCenter");
    else if (alignType === "right") exec("justifyRight");
    else if (alignType === "justify") exec("justifyFull");
  };

  // Open link dialog
  const openLinkDialog = () => {
    closeAllDropdowns();
    saveSelection();
    captureInsertPoint();
    clearEditing();
    const sel = window.getSelection();
    let selectedText = "";
    let existingUrl = "";
    let existingTarget = true;
    linkAnchorRef.current = null;

    if (sel && sel.rangeCount > 0) {
      selectedText = sel.toString();
      let parent = sel.anchorNode;
      while (parent && parent !== editorRef.current && parent !== document.body) {
        if (parent.nodeName === "A") {
          linkAnchorRef.current = parent;
          existingUrl = parent.getAttribute("href") || "";
          existingTarget = parent.getAttribute("target") === "_blank";
          if (!selectedText) selectedText = parent.textContent || "";
          break;
        }
        parent = parent.parentNode;
      }
    }

    setLinkUrl(existingUrl);
    setLinkText(selectedText);
    setLinkNewTab(existingTarget);
    setShowLinkModal(true);
  };

  // The dialogs below sit inside the page editor's own <form>, so they are plain divs (never a nested <form>):
  // a submit there would also submit the outer page form. Enter in a text field runs the dialog's action.
  const submitOnEnter = (action, e) => {
    if (e.key !== "Enter" || e.defaultPrevented || e.nativeEvent?.isComposing) return;
    const t = e.target;
    if (t.tagName !== "INPUT" || ["checkbox", "file", "button", "radio"].includes(t.type)) return;
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  // Apply or update link
  const applyLink = (e) => {
    e?.preventDefault();
    if (!linkUrl.trim()) return;

    // Editing a link that is already there: change it in place (a button keeps its look)
    const anchor = linkAnchorRef.current;
    if (anchor && anchor.isConnected && editorRef.current?.contains(anchor)) {
      anchor.setAttribute("href", linkUrl.trim());
      if (linkNewTab) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      } else {
        anchor.removeAttribute("target");
      }
      const newText = linkText.trim();
      if (newText && newText !== anchor.textContent) anchor.textContent = newText;
      linkAnchorRef.current = null;
      emit();
      closeLinkModal();
      return;
    }

    restoreSelection();
    const targetAttr = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    const cleanUrl = linkUrl.trim();
    const textToShow = linkText.trim() || cleanUrl;

    const linkHtml = `<a href="${cleanUrl}"${targetAttr} class="text-blue-600 underline hover:text-blue-800">${textToShow}</a>`;
    insertHtml(linkHtml);
    closeLinkModal();
  };

  // Remove existing link
  const removeLink = () => {
    restoreSelection();
    document.execCommand("unlink", false, null);
    emit();
    saveSelection();
    updateActiveStates();
    closeLinkModal();
  };

  // Open image modal
  const openImageDialog = () => {
    closeAllDropdowns();
    saveSelection();
    captureInsertPoint();
    clearEditing();
    setImageTab("url");
    setImageUrl("");
    setImageAlt("");
    setImageFile(null);
    setImagePreview("");
    setImageError("");
    setShowImageModal(true);
  };

  // Handle image file selection
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }
    setImageFile(file);
    setImageError("");
    const prev = URL.createObjectURL(file);
    setImagePreview(prev);
  };

  // Insert image
  const applyImage = async (e) => {
    e?.preventDefault();
    setImageError("");

    if (imageTab === "upload") {
      if (!imageFile) {
        setImageError("Please select an image file to upload.");
        return;
      }
      setImageUploading(true);
      try {
        const res = await apiUpload("/api/v1/catalog/products/images/", "image", imageFile);
        setImageUploading(false);
        if (res?.ok && res?.data?.url) {
          placeImage(res.data.url);
        } else {
          // Fallback to Data URL if upload endpoint is unavailable
          const reader = new FileReader();
          reader.onload = () => placeImage(reader.result);
          reader.readAsDataURL(imageFile);
        }
      } catch {
        setImageUploading(false);
        setImageError("Failed to upload image. Please try again.");
      }
    } else {
      if (!imageUrl.trim()) {
        setImageError("Please enter an image URL.");
        return;
      }
      placeImage(imageUrl.trim());
    }
  };

  // Put the picked picture in: change the image being edited, or insert a new one at the saved position
  const placeImage = (src) => {
    const editedEl = editingElRef.current;
    if (editing && editedEl && editedEl.isConnected) {
      editedEl.setAttribute("src", src);
      editedEl.setAttribute("alt", imageAlt.trim());
      closeImageModal();
      commitBlock();
      return;
    }
    insertHtml(
      `<img src="${escapeHtml(src)}" alt="${escapeHtml(imageAlt.trim())}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0;" />`
    );
    closeImageModal();
  };

  // Open video modal
  const openVideoDialog = () => {
    closeAllDropdowns();
    saveSelection();
    captureInsertPoint();
    clearEditing();
    setVideoUrl("");
    setShowVideoModal(true);
  };

  // Apply video embed
  const applyVideo = (e) => {
    e?.preventDefault();
    if (!videoUrl.trim()) return;

    const embedHtml = formatVideoEmbed(videoUrl);
    const editedEl = editingElRef.current;
    if (embedHtml && editing && editedEl && editedEl.isConnected) {
      // Swap the old video (and its wrapping line) for the new one, in the same place
      const unit = unitFor(editedEl);
      const tmp = document.createElement("div");
      tmp.innerHTML = embedHtml;
      unit.replaceWith(...Array.from(tmp.childNodes));
      closeVideoModal();
      commitBlock();
      return;
    }
    if (embedHtml) {
      insertHtml(embedHtml);
    }
    closeVideoModal();
  };

  // Table actions
  const applyInsertTable = () => {
    const editedEl = editingElRef.current;
    if (editing && editedEl && editedEl.isConnected) {
      resizeTable(
        editedEl,
        Math.max(1, Number(tableRows) || 1),
        Math.max(1, Number(tableCols) || 1)
      );
      closeTableModal();
      commitBlock();
      return;
    }
    const tableHtml = generateTableHtml(
      Number(tableRows) || 3,
      Number(tableCols) || 3,
      tableHasHeader
    );
    insertHtml(tableHtml);
    closeTableModal();
  };

  const handleTableOperation = (operation) => {
    closeAllDropdowns();
    restoreSelection();

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const ctx = getTableContext(sel.anchorNode);
    if (!ctx) return;

    const { cell, row, table } = ctx;

    if (operation === "insertRowAbove") {
      const newRow = row.cloneNode(true);
      Array.from(newRow.children).forEach((c) => (c.innerHTML = "<br>"));
      row.parentNode?.insertBefore(newRow, row);
    } else if (operation === "insertRowBelow") {
      const newRow = row.cloneNode(true);
      Array.from(newRow.children).forEach((c) => (c.innerHTML = "<br>"));
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    } else if (operation === "insertColLeft") {
      const cellIndex = Array.from(row.children).indexOf(cell);
      Array.from(table.rows).forEach((r) => {
        const tag = r.children[cellIndex]?.nodeName || "td";
        const newCell = document.createElement(tag);
        newCell.style.cssText = cell.style.cssText;
        newCell.innerHTML = "<br>";
        r.insertBefore(newCell, r.children[cellIndex]);
      });
    } else if (operation === "insertColRight") {
      const cellIndex = Array.from(row.children).indexOf(cell);
      Array.from(table.rows).forEach((r) => {
        const tag = r.children[cellIndex]?.nodeName || "td";
        const newCell = document.createElement(tag);
        newCell.style.cssText = cell.style.cssText;
        newCell.innerHTML = "<br>";
        r.insertBefore(newCell, r.children[cellIndex + 1]);
      });
    } else if (operation === "deleteRow") {
      if (table.rows.length <= 1) {
        table.remove();
      } else {
        row.remove();
      }
    } else if (operation === "deleteCol") {
      const cellIndex = Array.from(row.children).indexOf(cell);
      if (row.children.length <= 1) {
        table.remove();
      } else {
        Array.from(table.rows).forEach((r) => r.children[cellIndex]?.remove());
      }
    } else if (operation === "deleteTable") {
      table.remove();
    }

    emit();
    saveSelection();
    updateActiveStates();
  };

  // ---- Block toolbar (button, image, video, table, divider) ----
  const toolbarBlock = hoverBlock?.isConnected
    ? hoverBlock
    : selectedBlock?.isConnected
      ? selectedBlock
      : null;
  const toolbarKind = toolbarBlock ? blockKind(toolbarBlock) : null;
  const toolbarAlign = toolbarBlock
    ? unitFor(toolbarBlock).getAttribute("align") || "left"
    : "left";

  const cancelHide = () => clearTimeout(hideTimerRef.current);
  const scheduleHide = () => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHoverBlock(null), 300);
  };
  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  // A change made straight on the DOM (move, align, edit, delete): save it, undo step included
  function commitBlock() {
    emit();
    setBlockTick((t) => t + 1);
  }

  // Select a block (a caret inside a button, the picture / table itself) so keys and the toolbar keep working on it
  const selectBlock = (el) => {
    const sel = window.getSelection();
    if (!sel || !el.isConnected) return;
    const range = document.createRange();
    if (blockKind(el) === "button") {
      range.selectNodeContents(el);
      range.collapse(false);
    } else {
      range.selectNode(el);
    }
    sel.removeAllRanges();
    sel.addRange(range);
    setSelectedBlock(el);
  };

  const moveBlock = (dir, block = toolbarBlock) => {
    if (!block || !block.isConnected) return;
    const unit = unitFor(block);
    const sibling = dir < 0 ? unit.previousElementSibling : unit.nextElementSibling;
    if (!sibling) return;
    unit.parentNode.insertBefore(unit, dir < 0 ? sibling : sibling.nextSibling);
    commitBlock();
    selectBlock(block);
  };

  const alignBlock = (value) => {
    const block = toolbarBlock;
    if (!block || (toolbarKind !== "button" && toolbarKind !== "image")) return;
    // The storefront keeps only a few attributes, and `align` on the line's <p> is one of them (not style)
    let unit = unitFor(block);
    if (unit.nodeName !== "P") {
      const p = document.createElement("p");
      unit.parentNode.insertBefore(p, unit);
      p.appendChild(unit);
      unit = p;
    }
    if (value === "left") unit.removeAttribute("align");
    else unit.setAttribute("align", value);
    unit.style.textAlign = "";
    if (!unit.getAttribute("style")) unit.removeAttribute("style");
    commitBlock();
    selectBlock(block);
  };

  const onAlignClick = (e) => alignBlock(e.currentTarget.dataset.align);

  const deleteBlock = () => {
    const block = toolbarBlock;
    if (!block || !block.isConnected) return;
    const ed = editorRef.current;
    unitFor(block).remove();
    if (ed && !ed.firstChild) ed.innerHTML = "<p><br></p>";
    setHoverBlock(null);
    setSelectedBlock(null);
    commitBlock();
    ed?.focus();
  };

  const editBlock = () => {
    const block = toolbarBlock;
    if (!block || !block.isConnected) return;
    closeAllDropdowns();
    editingElRef.current = block;
    setEditing(true);
    if (toolbarKind === "button") {
      setButtonText(block.textContent || "");
      setButtonUrl(block.getAttribute("href") || "");
      setButtonError("");
      loadLinkData();
      setShowButtonModal(true);
    } else if (toolbarKind === "image") {
      setImageTab("url");
      setImageUrl(block.getAttribute("src") || "");
      setImageAlt(block.getAttribute("alt") || "");
      setImageFile(null);
      setImagePreview("");
      setImageError("");
      setShowImageModal(true);
    } else if (toolbarKind === "video") {
      setVideoUrl(block.getAttribute("src") || "");
      setShowVideoModal(true);
    } else if (toolbarKind === "table") {
      setTableRows(block.rows.length);
      setTableCols(block.rows[0]?.cells.length || 1);
      setShowInsertTableModal(true);
    }
  };

  // Drag a block by its handle: a line shows where it will land (between any two lines, also inside layout boxes)
  const startBlockDrag = (e) => {
    const ed = editorRef.current;
    const canvas = canvasRef.current;
    const block = toolbarBlock;
    if (!ed || !canvas || !block) return;
    e.preventDefault();
    e.stopPropagation();
    cancelHide();
    const unit = unitFor(block);
    let drop = null;

    const onMove = (ev) => {
      const box = ed.getBoundingClientRect();
      if (ev.clientY < box.top + 24) ed.scrollTop -= 12;
      else if (ev.clientY > box.bottom - 24) ed.scrollTop += 12;

      const over = document.elementFromPoint(ev.clientX, ev.clientY);
      let line = over && ed.contains(over) ? lineAt(over, ed) : null;
      let before = true;

      if (!line && over && (over === ed || ed.contains(over))) {
        // On the editor's padding: above the first line or below the last one
        const first = ed.firstElementChild;
        const last = ed.lastElementChild;
        if (first && ev.clientY < first.getBoundingClientRect().top) line = first;
        else if (last) {
          line = last;
          before = false;
        }
      } else if (line) {
        const r = line.getBoundingClientRect();
        before = ev.clientY < r.top + r.height / 2;
      }

      if (!line || unit === line || unit.contains(line)) {
        drop = null;
        setDropLine(null);
        return;
      }
      drop = { line, before };
      const r = line.getBoundingClientRect();
      const c = canvas.getBoundingClientRect();
      setDropLine({
        top: (before ? r.top : r.bottom) - c.top,
        left: r.left - c.left,
        width: r.width,
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDropLine(null);
      if (drop && drop.line.isConnected) {
        drop.line.parentNode.insertBefore(unit, drop.before ? drop.line : drop.line.nextSibling);
        commitBlock();
        selectBlock(block);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  // Hovering a block shows its toolbar; leaving hides it after a moment
  const handleEditorHover = (e) => {
    const ed = editorRef.current;
    if (!ed) return;
    const block = findBlock(e.target, ed);
    if (block) {
      cancelHide();
      if (block !== hoverBlock) setHoverBlock(block);
    } else if (hoverBlock) {
      scheduleHide();
    }
  };

  // Where the toolbar and the outline sit (relative to the editor area); follows scrolling and edits
  useEffect(() => {
    const canvas = canvasRef.current;
    const ed = editorRef.current;
    if (!toolbarBlock || !canvas || !ed) {
      setBarPos(null);
      return;
    }
    const unit = unitFor(toolbarBlock);
    const r = unit.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    const e = ed.getBoundingClientRect();
    if (r.bottom < e.top + 4 || r.top > e.bottom - 4) {
      setBarPos(null);
      return;
    }
    // Never above the block (that hides the line of text over it): to the right of the block when there is room,
    // else inside the block's top-right corner. Always inside the editor area.
    const barWidth =
      blockBarRef.current?.offsetWidth ||
      (toolbarKind === "button" || toolbarKind === "image" ? 310 : 240);
    const barHeight = blockBarRef.current?.offsetHeight || 32;
    const roomRight = e.right - r.right - 8;
    const wantLeft = roomRight >= barWidth ? r.right + 8 : r.right - barWidth - 4;
    const left = Math.max(e.left + 4, Math.min(wantLeft, e.right - barWidth - 4)) - c.left;
    const top = Math.max(e.top + 2, Math.min(r.top + 2, e.bottom - barHeight - 2)) - c.top;
    setBarPos({
      top,
      left,
      outline: { top: r.top - c.top, left: r.left - c.left, width: r.width, height: r.height },
    });
  }, [toolbarBlock, toolbarKind, blockTick, toolbarAlign]);

  useEffect(() => {
    const onResize = () => setBlockTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Toggle Source view
  const toggleSourceView = () => {
    if (isSourceView) {
      setIsSourceView(false);
      setHoverBlock(null);
      setSelectedBlock(null);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = value || "";
          detachControls(editorRef.current);
          lastEmittedRef.current = value;
          resetHistory();
          editorRef.current.focus();
        }
        updateActiveStates();
      }, 0);
    } else {
      setIsSourceView(true);
    }
  };

  const styleLabels = {
    p: "Paragraph",
    h1: "Heading 1",
    h2: "Heading 2",
    h3: "Heading 3",
    h4: "Heading 4",
    h5: "Heading 5",
    h6: "Heading 6",
    blockquote: "Blockquote",
  };

  const currentStyleLabel = styleLabels[activeFormats.blockFormat] || "Paragraph";

  const slashItems = slashMenu ? filterSlashItems(slashMenu.query) : [];
  const slashIndex = Math.min(slashActive, Math.max(slashItems.length - 1, 0));

  const withErrorBorder = error
    ? "border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
    : "border-slate-300 focus-within:border-[#B08D57] focus-within:ring-2 focus-within:ring-[#B08D57]/20";

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-2xs transition ${withErrorBorder}`}
      onClick={(e) => {
        // Prevent click events from bubbling up to any potential ancestor <label>
        e.stopPropagation();
      }}
    >
      {/* 1. TOOLBAR */}
      <div
        className={`flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-2 py-1.5 text-slate-700 transition-colors ${
          isSourceView ? "bg-slate-100/70" : "bg-[#FAFBFD]"
        }`}
        role="toolbar"
        aria-label="Rich text editor toolbar"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* 1. Formatting Dropdown (Shopify style) */}
        <div className="relative" ref={styleMenuRef}>
          <button
            type="button"
            title="Formatting"
            disabled={isSourceView}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveSelection();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowStyleMenu((v) => !v);
              setShowAlignMenu(false);
              setShowColorPicker(false);
              setShowTableMenu(false);
            }}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-transparent px-2.5 text-xs font-medium transition hover:bg-slate-200/60 disabled:opacity-40 ${
              showStyleMenu ? "bg-slate-200 text-slate-900" : ""
            }`}
          >
            <span>{currentStyleLabel}</span>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-60">
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
            </svg>
          </button>

          {showStyleMenu && (
            <div
              className="absolute left-0 top-full z-40 mt-1 min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("p");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-50 ${
                  activeFormats.blockFormat === "p"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                Paragraph
                {activeFormats.blockFormat === "p" && <Icon name="check" className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("h1");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-base font-bold hover:bg-slate-50 ${
                  activeFormats.blockFormat === "h1"
                    ? "font-semibold text-orange-600"
                    : "text-slate-800"
                }`}
              >
                Heading 1
                {activeFormats.blockFormat === "h1" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("h2");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm font-semibold hover:bg-slate-50 ${
                  activeFormats.blockFormat === "h2"
                    ? "font-semibold text-orange-600"
                    : "text-slate-800"
                }`}
              >
                Heading 2
                {activeFormats.blockFormat === "h2" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("h3");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 ${
                  activeFormats.blockFormat === "h3"
                    ? "font-semibold text-orange-600"
                    : "text-slate-800"
                }`}
              >
                Heading 3
                {activeFormats.blockFormat === "h3" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("h4");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-medium hover:bg-slate-50 ${
                  activeFormats.blockFormat === "h4"
                    ? "font-semibold text-orange-600"
                    : "text-slate-800"
                }`}
              >
                Heading 4
                {activeFormats.blockFormat === "h4" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleFormatBlock("blockquote");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs italic hover:bg-slate-50 ${
                  activeFormats.blockFormat === "blockquote"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                Blockquote
                {activeFormats.blockFormat === "blockquote" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        {/* 2. Bold */}
        <button
          type="button"
          title="Bold (Ctrl+B)"
          aria-label="Bold"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("bold");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.bold ? "bg-slate-200 text-slate-950 font-extrabold" : ""
          }`}
        >
          B
        </button>

        {/* 3. Italic */}
        <button
          type="button"
          title="Italic (Ctrl+I)"
          aria-label="Italic"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("italic");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm italic transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.italic ? "bg-slate-200 text-slate-950 font-bold" : ""
          }`}
        >
          I
        </button>

        {/* 4. Underline */}
        <button
          type="button"
          title="Underline (Ctrl+U)"
          aria-label="Underline"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("underline");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm underline transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.underline ? "bg-slate-200 text-slate-950 font-bold" : ""
          }`}
        >
          U
        </button>

        {/* 5. Text Color */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            title="Color"
            aria-label="Color"
            disabled={isSourceView}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveSelection();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
              setShowStyleMenu(false);
              setShowAlignMenu(false);
              setShowTableMenu(false);
            }}
            className={`flex h-8 w-8 flex-col items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40 ${
              showColorPicker ? "bg-slate-200" : ""
            }`}
          >
            <span className="text-xs font-bold leading-none">A</span>
            <span
              className="mt-0.5 h-1 w-4 rounded-full"
              style={{ backgroundColor: activeFormats.color || "#111827" }}
            />
          </button>

          {showColorPicker && (
            <div
              className="absolute left-0 top-full z-40 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Text color
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    title={c.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAllDropdowns();
                      exec("foreColor", c.color);
                    }}
                    className="h-6 w-6 rounded-md border border-slate-200 transition hover:scale-110"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                  Custom:
                  <input
                    type="color"
                    value={activeFormats.color?.startsWith("#") ? activeFormats.color : "#111827"}
                    onChange={(e) => {
                      closeAllDropdowns();
                      exec("foreColor", e.target.value);
                    }}
                    className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeAllDropdowns();
                    exec("foreColor", "#111827");
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        {/* 6. Alignment Dropdown (Shopify style) */}
        <div className="relative" ref={alignMenuRef}>
          <button
            type="button"
            title="Alignment"
            aria-label="Alignment"
            disabled={isSourceView}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveSelection();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowAlignMenu((v) => !v);
              setShowStyleMenu(false);
              setShowColorPicker(false);
              setShowTableMenu(false);
            }}
            className={`inline-flex h-8 items-center gap-1 rounded-lg border border-transparent px-2 text-xs transition hover:bg-slate-200/60 disabled:opacity-40 ${
              showAlignMenu ? "bg-slate-200 text-slate-900" : ""
            }`}
          >
            {activeFormats.alignment === "center" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M3 4.75A.75.75 0 013.75 4h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 4.75zm2 3.5A.75.75 0 015.75 7.5h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 8.25zm-2 3.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm2 3.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            ) : activeFormats.alignment === "right" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M3 4.75A.75.75 0 013.75 4h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 4.75zm4 3.5A.75.75 0 017.75 7.5h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 017 8.25zm-4 3.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm4 3.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            ) : activeFormats.alignment === "justify" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M3 4.75A.75.75 0 013.75 4h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 4.75zm0 3.5A.75.75 0 013.75 7.5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8.25zm0 3.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M3 4.75A.75.75 0 013.75 4h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 4.75zm0 3.5A.75.75 0 013.75 7.5h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 013 8.25zm0 3.5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 opacity-60">
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
            </svg>
          </button>

          {showAlignMenu && (
            <div
              className="absolute left-0 top-full z-40 mt-1 min-w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlign("left");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  activeFormats.alignment === "left"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                <span>Left align</span>
                {activeFormats.alignment === "left" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlign("center");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  activeFormats.alignment === "center"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                <span>Center align</span>
                {activeFormats.alignment === "center" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlign("right");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  activeFormats.alignment === "right"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                <span>Right align</span>
                {activeFormats.alignment === "right" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAlign("justify");
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-slate-50 ${
                  activeFormats.alignment === "justify"
                    ? "font-semibold text-orange-600"
                    : "text-slate-700"
                }`}
              >
                <span>Justify</span>
                {activeFormats.alignment === "justify" && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        {/* 11. Bullet List */}
        <button
          type="button"
          title="Bulleted list"
          aria-label="Bulleted list"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("insertUnorderedList");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.unorderedList ? "bg-slate-200 text-slate-950 font-bold" : ""
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M6 4.75A.75.75 0 016.75 4h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 4.75zM6 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 10zm0 5.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM3 4.75a1 1 0 112 0 1 1 0 01-2 0zm0 5.25a1 1 0 112 0 1 1 0 01-2 0zm0 5.25a1 1 0 112 0 1 1 0 01-2 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* 12. Numbered List */}
        <button
          type="button"
          title="Numbered list"
          aria-label="Numbered list"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("insertOrderedList");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.orderedList ? "bg-slate-200 text-slate-950 font-bold" : ""
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M7 4.75A.75.75 0 017.75 4h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 017 4.75zM7 10a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5A.75.75 0 017 10zm0 5.25a.75.75 0 01.75-.75h9.5a.75.75 0 010 1.5h-9.5a.75.75 0 01-.75-.75zM3.5 3.5h1v3h-1v-2H3v-1h.5zm-1 6.5h2v.5H3v.5h1.5v.5h-2v.5h2.5V9H2.5zm.5 4h1.5a.5.5 0 01.5.5v.5a.5.5 0 01-.5.5h-1v.5h1.5v.5H2.5V15h2v-.5h-1.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* 13. Decrease Indent (Outdent) */}
        <button
          type="button"
          title="Decrease indent"
          aria-label="Decrease indent"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("outdent");
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M2.75 4a.75.75 0 010 1.5h14.5a.75.75 0 010-1.5H2.75zm5 4a.75.75 0 010 1.5h9.5a.75.75 0 010-1.5h-9.5zm0 4a.75.75 0 010 1.5h9.5a.75.75 0 010-1.5h-9.5zm-5 4a.75.75 0 010 1.5h14.5a.75.75 0 010-1.5H2.75zM5.53 11.28a.75.75 0 000-1.06L3.56 8.25l1.97-1.97a.75.75 0 00-1.06-1.06l-2.5 2.5a.75.75 0 000 1.06l2.5 2.5a.75.75 0 001.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* 14. Increase Indent (Indent) */}
        <button
          type="button"
          title="Increase indent"
          aria-label="Increase indent"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("indent");
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M2.75 4a.75.75 0 010 1.5h14.5a.75.75 0 010-1.5H2.75zm5 4a.75.75 0 010 1.5h9.5a.75.75 0 010-1.5h-9.5zm0 4a.75.75 0 010 1.5h9.5a.75.75 0 010-1.5h-9.5zm-5 4a.75.75 0 010 1.5h14.5a.75.75 0 010-1.5H2.75zM2.47 6.22a.75.75 0 000 1.06l1.97 1.97-1.97 1.97a.75.75 0 101.06 1.06l2.5-2.5a.75.75 0 000-1.06l-2.5-2.5a.75.75 0 00-1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        {/* 7. Insert Hyperlink */}
        <button
          type="button"
          title={activeFormats.inLink ? "Edit link" : "Insert link"}
          aria-label="Insert link"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            openLinkDialog();
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40 ${
            activeFormats.inLink ? "bg-slate-200 text-orange-600 font-bold" : ""
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
          </svg>
        </button>

        {/* 8. Insert Image */}
        <button
          type="button"
          title="Insert image"
          aria-label="Insert image"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            openImageDialog();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.22a.75.75 0 00-1.06 0l-1.91 1.91-4.72-4.72a.75.75 0 00-1.06 0L2.5 11.06zm10.75-4.31a1.25 1.25 0 112.5 0 1.25 1.25 0 01-2.5 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* 9. Insert Video */}
        <button
          type="button"
          title="Insert video"
          aria-label="Insert video"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            openVideoDialog();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h8.5A2.25 2.25 0 0014 13.75v-7.5A2.25 2.25 0 0011.75 4h-8.5zM15.5 7.697l2.81-1.874A.75.75 0 0119.5 6.47v7.06a.75.75 0 01-1.19.647L15.5 12.303V7.697z" />
          </svg>
        </button>

        {/* 10. Insert / Manage Table */}
        <div className="relative" ref={tableMenuRef}>
          <button
            type="button"
            title={activeFormats.inTable ? "Table options" : "Insert table"}
            aria-label="Table"
            disabled={isSourceView}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              saveSelection();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (activeFormats.inTable) {
                setShowTableMenu((v) => !v);
                setShowStyleMenu(false);
                setShowAlignMenu(false);
                setShowColorPicker(false);
              } else {
                closeAllDropdowns();
                clearEditing();
                setShowInsertTableModal(true);
              }
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40 ${
              activeFormats.inTable ? "bg-slate-200 text-orange-600 font-bold" : ""
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm2.25-.75a.75.75 0 00-.75.75v3.25h5.5V3.5h-4.75zm6.25 0v4h6v-3.25a.75.75 0 00-.75-.75h-5.25zm6 5.5h-6v4h6v-4zm-7.5 4h-5.5v-4h5.5v4zm-5.5 1.5v3.25c0 .414.336.75.75.75h4.75v-4h-5.5zm7 4h5.25a.75.75 0 00.75-.75V14.5h-6v4z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {showTableMenu && (
            <div
              className="absolute left-0 top-full z-40 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("insertRowAbove");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" /> Insert row above
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("insertRowBelow");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" /> Insert row below
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("insertColLeft");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" /> Insert column left
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("insertColRight");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Icon name="plus" className="h-3.5 w-3.5" /> Insert column right
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("deleteRow");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> Delete row
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("deleteCol");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> Delete column
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTableOperation("deleteTable");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> Delete table
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  closeAllDropdowns();
                  clearEditing();
                  setShowInsertTableModal(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <Icon name="table" className="h-3.5 w-3.5" /> Insert new table...
              </button>
            </div>
          )}
        </div>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        {/* 15. Clear Formatting */}
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("removeFormat");
            handleFormatBlock("p");
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M13.28 14.78a.75.75 0 001.06-1.06l-4.5-4.5 4.5-4.5a.75.75 0 00-1.06-1.06l-4.5 4.5-4.5-4.5a.75.75 0 00-1.06 1.06l4.5 4.5-4.5 4.5a.75.75 0 001.06 1.06l4.5-4.5 4.5 4.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Undo */}
        <button
          type="button"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("undo");
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H13a5 5 0 015 5 1 1 0 11-2 0 3 3 0 00-3-3H5.414l2.293 2.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Redo */}
        <button
          type="button"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          disabled={isSourceView}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exec("redo");
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-slate-200/60 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M12.293 14.707a1 1 0 001.414 0l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 1.414L14.586 9H7a5 5 0 00-5 5 1 1 0 102 0 3 3 0 013-3h7.586l-2.293 2.293a1 1 0 000 1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {isSourceView && (
          <span className="mr-2 hidden items-center gap-1.5 text-[11px] font-medium text-slate-500 sm:inline-flex">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#B08D57]" />
            HTML Source Mode
          </span>
        )}

        {/* 16. HTML / Source Code View Toggle */}
        <button
          type="button"
          title={isSourceView ? "Show visual editor" : "Show HTML source code"}
          aria-label="HTML code view"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
            toggleSourceView();
          }}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition ${
            isSourceView
              ? "border-[#B08D57] bg-[#B08D57]/10 text-[#8F6B32] shadow-2xs hover:bg-[#B08D57]/15"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06l-4.25-4.25a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.378 3.036a.75.75 0 01.586.886l-3 13a.75.75 0 01-1.464-.338l3-13a.75.75 0 01.878-.548z"
              clipRule="evenodd"
            />
          </svg>
          <span>{isSourceView ? "Show Visual" : "Show HTML"}</span>
        </button>
      </div>

      {/* 2. EDITOR CANVAS */}
      {isSourceView ? (
        <div className="relative bg-[#FAFAFA]">
          <textarea
            value={value || ""}
            onChange={(e) => {
              const html = e.target.value;
              lastEmittedRef.current = html;
              onChange(html);
            }}
            placeholder="<p>Enter HTML source code here...</p>"
            rows={12}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="block w-full min-h-[260px] max-h-[600px] resize-y border-0 bg-[#FAFAFA] px-4 py-3.5 font-mono text-xs sm:text-[13px] leading-relaxed text-[#1F2937] placeholder:text-slate-400 caret-[#B08D57] selection:bg-[#B08D57]/20 selection:text-[#1F2937] outline-none focus:outline-none focus:ring-0"
          />
        </div>
      ) : (
        <div ref={canvasRef} className="relative">
          <div
            id={id}
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={closeSlash}
            aria-haspopup="listbox"
            aria-controls={slashMenu ? slashListId : undefined}
            aria-activedescendant={
              slashMenu && slashItems.length
                ? `${slashListId}-${slashItems[slashIndex].id}`
                : undefined
            }
            onPaste={handlePaste}
            onKeyUp={handleSelectionChange}
            onMouseUp={(e) => {
              e.stopPropagation();
              handleSelectionChange();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              closeAllDropdowns();
              closeSlash();
            }}
            onClick={(e) => {
              e.stopPropagation();
              closeAllDropdowns();
              const block = editorRef.current ? findBlock(e.target, editorRef.current) : null;
              if (block) setSelectedBlock(block);
            }}
            onMouseMove={handleEditorHover}
            onMouseLeave={() => hoverBlock && scheduleHide()}
            onScroll={() => setBlockTick((t) => t + 1)}
            onFocus={() => {
              closeAllDropdowns();
              document.execCommand("defaultParagraphSeparator", false, "p");
              handleSelectionChange();
            }}
            className="min-h-[240px] max-h-[600px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1.5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_hr]:my-4 [&_hr]:border-slate-300 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:max-w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_table]:my-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_th]:font-semibold"
          />
          {barPos && toolbarBlock && (
            <>
              {/* Outline of the hovered / selected block */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-10 rounded border-2 border-orange-400/70"
                style={{
                  top: barPos.outline.top,
                  left: barPos.outline.left,
                  width: barPos.outline.width,
                  height: barPos.outline.height,
                }}
              />

              <div
                ref={blockBarRef}
                role="toolbar"
                aria-label="Block tools"
                className="absolute z-20 flex items-center gap-0.5 rounded-md border border-slate-300 bg-white p-0.5 shadow-md"
                style={{ top: barPos.top, left: barPos.left }}
                onMouseEnter={cancelHide}
                onMouseLeave={scheduleHide}
                // Keep the caret in the editor while the mouse is used on the toolbar
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                    e.preventDefault();
                    moveBlock(e.key === "ArrowUp" ? -1 : 1);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    editorRef.current?.focus();
                  }
                }}
              >
                <button
                  type="button"
                  title="Drag to move"
                  aria-label="Drag to move (or Alt + Up / Down arrow)"
                  onPointerDown={startBlockDrag}
                  className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-500 hover:bg-slate-100 active:cursor-grabbing"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <circle cx="7" cy="5" r="1.4" />
                    <circle cx="13" cy="5" r="1.4" />
                    <circle cx="7" cy="10" r="1.4" />
                    <circle cx="13" cy="10" r="1.4" />
                    <circle cx="7" cy="15" r="1.4" />
                    <circle cx="13" cy="15" r="1.4" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Move up (Alt + Up arrow)"
                  aria-label="Move up"
                  onClick={() => moveBlock(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M5 12l5-5 5 5" />
                  </svg>
                </button>
                <button
                  type="button"
                  title="Move down (Alt + Down arrow)"
                  aria-label="Move down"
                  onClick={() => moveBlock(1)}
                  className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path d="M5 8l5 5 5-5" />
                  </svg>
                </button>

                {(toolbarKind === "button" || toolbarKind === "image") &&
                  [
                    ["left", "Align left", "M3 5h14M3 9h9M3 13h14M3 17h9"],
                    ["center", "Align center", "M3 5h14M6 9h8M3 13h14M6 17h8"],
                    ["right", "Align right", "M3 5h14M8 9h9M3 13h14M8 17h9"],
                  ].map(([value, label, path]) => (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={toolbarAlign === value}
                      data-align={value}
                      onClick={onAlignClick}
                      className={`flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 ${
                        toolbarAlign === value ? "bg-slate-200 text-slate-900" : "text-slate-600"
                      }`}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4"
                      >
                        <path d={path} />
                      </svg>
                    </button>
                  ))}

                {toolbarKind !== "divider" && (
                  <button
                    type="button"
                    title="Edit"
                    aria-label="Edit"
                    onClick={editBlock}
                    className="flex h-7 items-center rounded px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  title="Delete"
                  aria-label="Delete block"
                  onClick={deleteBlock}
                  className="flex h-7 items-center rounded px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}

          {dropLine && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-30 h-0.5 rounded bg-orange-500"
              style={{ top: dropLine.top - 1, left: dropLine.left, width: dropLine.width }}
            />
          )}
        </div>
      )}

      {/* 3. MODALS */}

      {/* LINK MODAL */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeLinkModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {activeFormats.inLink ? "Edit link" : "Insert link"}
              </h3>
              <button
                type="button"
                onClick={() => closeLinkModal()}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div onKeyDown={(e) => submitOnEnter(applyLink, e)} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Link URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="https://example.com or /collections/all"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Text to display
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shop the collection"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkNewTab}
                  onChange={(e) => setLinkNewTab(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Open link in a new tab
              </label>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                {activeFormats.inLink ? (
                  <button
                    type="button"
                    onClick={removeLink}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove link
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => closeLinkModal()}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyLink}
                    className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                  >
                    {activeFormats.inLink ? "Update link" : "Insert link"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeImageModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Edit image" : "Insert image"}
              </h3>
              <button
                type="button"
                onClick={() => closeImageModal()}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setImageTab("url")}
                className={`flex-1 border-b-2 py-2 text-xs font-semibold transition ${
                  imageTab === "url"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setImageTab("upload")}
                className={`flex-1 border-b-2 py-2 text-xs font-semibold transition ${
                  imageTab === "upload"
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Upload image
              </button>
            </div>

            <div onKeyDown={(e) => submitOnEnter(applyImage, e)} className="space-y-3.5">
              {imageTab === "url" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Image URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    autoFocus
                    required
                    placeholder="https://example.com/photo.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Select image file <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {imagePreview && (
                    <div className="mt-2.5 flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-36 rounded object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Alt text <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Short description of the image"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              {imageError && <p className="text-xs text-red-600">{imageError}</p>}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => closeImageModal()}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyImage}
                  disabled={imageUploading}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {imageUploading ? "Uploading..." : editing ? "Update image" : "Insert image"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeVideoModal()}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Edit video" : "Insert video"}
              </h3>
              <button
                type="button"
                onClick={() => closeVideoModal()}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div onKeyDown={(e) => submitOnEnter(applyVideo, e)} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Video URL or embed snippet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Supports YouTube, Vimeo, direct MP4 links, or iframe embed code.
                </p>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => closeVideoModal()}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyVideo}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  {editing ? "Update video" : "Insert video"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* "/" SLASH MENU */}
      <p role="status" aria-live="polite" className="sr-only">
        {slashMenu ? `${slashItems.length} blocks available` : ""}
      </p>
      {slashMenu &&
        createPortal(
          <div
            id={slashListId}
            role="listbox"
            aria-label="Insert a block"
            style={{
              position: "fixed",
              zIndex: 60,
              width: 240,
              left: slashMenu.left,
              top: slashMenu.top,
              bottom: slashMenu.bottom,
            }}
            className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
            // Keep the cursor in the editor while the menu is used with the mouse
            onMouseDown={(e) => e.preventDefault()}
          >
            {slashItems.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">
                No block matches "{slashMenu.query}".
              </p>
            ) : (
              slashItems.map((item, i) => (
                <div
                  key={item.id}
                  id={`${slashListId}-${item.id}`}
                  role="option"
                  aria-selected={i === slashIndex}
                  onMouseEnter={() => setSlashActive(i)}
                  onClick={() => runSlash(item)}
                  className={`cursor-pointer px-3 py-1.5 ${i === slashIndex ? "bg-slate-100" : ""}`}
                >
                  <div className="text-xs font-semibold text-slate-800">{item.name}</div>
                  <div className="text-[11px] text-slate-500">{item.hint}</div>
                </div>
              ))
            )}
          </div>,
          document.body
        )}

      {/* BUTTON MODAL (the "/" Button block) */}
      {showButtonModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeButtonModal()}
          onKeyDown={(e) => e.key === "Escape" && closeButtonModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Insert button"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Edit button" : "Insert button"}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => closeButtonModal()}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div onKeyDown={(e) => submitOnEnter(applyButton, e)} className="space-y-3.5">
              <div>
                <label
                  htmlFor={`${slashListId}-button-text`}
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Button text <span className="text-red-500">*</span>
                </label>
                <input
                  id={`${slashListId}-button-text`}
                  type="text"
                  autoFocus
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-700">
                  Link <span className="text-red-500">*</span>
                </span>
                <LinkField
                  value={buttonUrl}
                  onChange={setButtonUrl}
                  collections={linkData.collections}
                  products={linkData.products}
                  pages={linkData.pages}
                  posts={linkData.posts}
                  label="Button link"
                  placeholder="Search pages, products, collections or paste a link"
                />
              </div>

              {buttonError && <p className="text-xs text-red-600">{buttonError}</p>}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => closeButtonModal()}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyButton}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  {editing ? "Update button" : "Insert button"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSERT TABLE MODAL */}
      {showInsertTableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => closeTableModal()}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editing ? "Edit table" : "Insert table"}
              </h3>
              <button
                type="button"
                onClick={() => closeTableModal()}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Rows</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tableRows}
                    onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Columns</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableCols}
                    onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {!editing && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tableHasHeader}
                    onChange={(e) => setTableHasHeader(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  Include header row
                </label>
              )}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => closeTableModal()}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyInsertTable}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  {editing ? "Update table" : "Insert table"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
