import { useCallback, useEffect, useRef, useState } from "react";
import { apiUpload } from "@/lib/api";

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
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return `<div class="responsive-video my-3" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe></div>`;
  }

  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[3]) {
    const videoId = vimeoMatch[3];
    return `<div class="responsive-video my-3" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"></iframe></div>`;
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

  // Table form state
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);

  // Synchronize incoming value into editor (only when value differs from what we emitted)
  useEffect(() => {
    if (editorRef.current && value !== lastEmittedRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
      lastEmittedRef.current = value;
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

  // Emit changes to parent
  const emit = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // Don't emit placeholder breaks
    const normalized = html === "<p><br></p>" || html === "<br>" ? "" : html;
    lastEmittedRef.current = normalized;
    onChange(normalized);
  }, [onChange]);

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

  // Insert arbitrary HTML at the saved or current selection
  const insertHtml = (html) => {
    if (isSourceView) return;
    closeAllDropdowns();

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

    if (document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, html);
    } else {
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

  // Keyboard shortcut handler
  const handleKeyDown = (e) => {
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
    const sel = window.getSelection();
    let selectedText = "";
    let existingUrl = "";
    let existingTarget = true;

    if (sel && sel.rangeCount > 0) {
      selectedText = sel.toString();
      let parent = sel.anchorNode;
      while (parent && parent !== editorRef.current && parent !== document.body) {
        if (parent.nodeName === "A") {
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

  // Apply or update link
  const applyLink = (e) => {
    e?.preventDefault();
    if (!linkUrl.trim()) return;

    restoreSelection();
    const targetAttr = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    const cleanUrl = linkUrl.trim();
    const textToShow = linkText.trim() || cleanUrl;

    const linkHtml = `<a href="${cleanUrl}"${targetAttr} class="text-blue-600 underline hover:text-blue-800">${textToShow}</a>`;
    insertHtml(linkHtml);
    setShowLinkModal(false);
  };

  // Remove existing link
  const removeLink = () => {
    restoreSelection();
    document.execCommand("unlink", false, null);
    emit();
    saveSelection();
    updateActiveStates();
    setShowLinkModal(false);
  };

  // Open image modal
  const openImageDialog = () => {
    closeAllDropdowns();
    saveSelection();
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
          const imgHtml = `<img src="${res.data.url}" alt="${imageAlt.trim()}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0;" />`;
          insertHtml(imgHtml);
          setShowImageModal(false);
        } else {
          // Fallback to Data URL if upload endpoint is unavailable
          const reader = new FileReader();
          reader.onload = () => {
            const imgHtml = `<img src="${reader.result}" alt="${imageAlt.trim()}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0;" />`;
            insertHtml(imgHtml);
            setShowImageModal(false);
          };
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
      const imgHtml = `<img src="${imageUrl.trim()}" alt="${imageAlt.trim()}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px 0;" />`;
      insertHtml(imgHtml);
      setShowImageModal(false);
    }
  };

  // Open video modal
  const openVideoDialog = () => {
    closeAllDropdowns();
    saveSelection();
    setVideoUrl("");
    setShowVideoModal(true);
  };

  // Apply video embed
  const applyVideo = (e) => {
    e?.preventDefault();
    if (!videoUrl.trim()) return;

    const embedHtml = formatVideoEmbed(videoUrl);
    if (embedHtml) {
      insertHtml(embedHtml);
    }
    setShowVideoModal(false);
  };

  // Table actions
  const applyInsertTable = () => {
    const tableHtml = generateTableHtml(
      Number(tableRows) || 3,
      Number(tableCols) || 3,
      tableHasHeader
    );
    insertHtml(tableHtml);
    setShowInsertTableModal(false);
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

  // Toggle Source view
  const toggleSourceView = () => {
    if (isSourceView) {
      setIsSourceView(false);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = value || "";
          lastEmittedRef.current = value;
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

  const withErrorBorder = error
    ? "border-red-400 focus-within:border-red-500"
    : "border-slate-300 focus-within:border-slate-500";

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-2xs transition focus-within:ring-2 focus-within:ring-slate-900/10 ${withErrorBorder}`}
      onClick={(e) => {
        // Prevent click events from bubbling up to any potential ancestor <label>
        e.stopPropagation();
      }}
    >
      {/* 1. TOOLBAR */}
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-[#FAFBFD] px-2 py-1.5 text-slate-700"
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
                {activeFormats.blockFormat === "p" && <span>✓</span>}
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
                Heading 1{activeFormats.blockFormat === "h1" && <span>✓</span>}
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
                Heading 2{activeFormats.blockFormat === "h2" && <span>✓</span>}
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
                Heading 3{activeFormats.blockFormat === "h3" && <span>✓</span>}
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
                Heading 4{activeFormats.blockFormat === "h4" && <span>✓</span>}
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
                {activeFormats.blockFormat === "blockquote" && <span>✓</span>}
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
                {activeFormats.alignment === "left" && <span>✓</span>}
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
                {activeFormats.alignment === "center" && <span>✓</span>}
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
                {activeFormats.alignment === "right" && <span>✓</span>}
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
                {activeFormats.alignment === "justify" && <span>✓</span>}
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
                <span>➕</span> Insert row above
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
                <span>➕</span> Insert row below
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
                <span>➕</span> Insert column left
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
                <span>➕</span> Insert column right
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
                <span>🗑️</span> Delete row
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
                <span>🗑️</span> Delete column
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
                <span>❌</span> Delete table
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
                  setShowInsertTableModal(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
              >
                <span>📊</span> Insert new table...
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
              ? "border-orange-600 bg-orange-50 text-orange-700 shadow-2xs"
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
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => {
              const html = e.target.value;
              lastEmittedRef.current = html;
              onChange(html);
            }}
            placeholder="<p>Enter HTML source code here...</p>"
            rows={10}
            className="w-full min-h-[240px] max-h-[600px] resize-y bg-[#111827] px-4 py-3 font-mono text-xs leading-relaxed text-slate-100 outline-none"
          />
        </div>
      ) : (
        <div
          id={id}
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={emit}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onKeyUp={handleSelectionChange}
          onMouseUp={(e) => {
            e.stopPropagation();
            handleSelectionChange();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
          }}
          onClick={(e) => {
            e.stopPropagation();
            closeAllDropdowns();
          }}
          onFocus={() => {
            closeAllDropdowns();
            document.execCommand("defaultParagraphSeparator", false, "p");
            handleSelectionChange();
          }}
          className="min-h-[240px] max-h-[600px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1.5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_table]:my-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-50 [&_th]:font-semibold"
        />
      )}

      {/* 3. MODALS */}

      {/* LINK MODAL */}
      {showLinkModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowLinkModal(false)}
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
                onClick={() => setShowLinkModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={applyLink} className="space-y-3.5">
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
                    onClick={() => setShowLinkModal(false)}
                    className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                  >
                    {activeFormats.inLink ? "Update link" : "Insert link"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE MODAL */}
      {showImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Insert image</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
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

            <form onSubmit={applyImage} className="space-y-3.5">
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
                  onClick={() => setShowImageModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={imageUploading}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {imageUploading ? "Uploading..." : "Insert image"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO MODAL */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Insert video</h3>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={applyVideo} className="space-y-3.5">
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
                  onClick={() => setShowVideoModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  Insert video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSERT TABLE MODAL */}
      {showInsertTableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowInsertTableModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Insert table</h3>
              <button
                type="button"
                onClick={() => setShowInsertTableModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
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

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tableHasHeader}
                  onChange={(e) => setTableHasHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Include header row
              </label>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInsertTableModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyInsertTable}
                  className="rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-90"
                >
                  Insert table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
