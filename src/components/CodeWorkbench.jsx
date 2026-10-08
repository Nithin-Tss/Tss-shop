
import { useEffect, useMemo, useState } from "react";
import CodeEditor from "./CodeEditor";
import {
  deleteThemePath,
  listThemeFiles,
  renameThemePath,
  saveThemeFile,
} from "@/lib/themeApi";

const KEEP = ".keep";

// Theme code is Liquid only: the server rejects any other file type.
const EXT = ".liquid";
const languageOf = () => "liquid";

// "product-card" -> "product-card.liquid"; "theme.css" -> null (not allowed)
function toLiquidName(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().endsWith(EXT)) return trimmed;
  return trimmed.includes(".") ? null : trimmed + EXT;
}

const baseName = (path) => path.split("/").pop();
const parentOf = (path) => {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
};

function buildTree(files, folders) {
  const all = new Set(folders.filter(Boolean));
  Object.keys(files).forEach((p) => {
    let parent = parentOf(p);
    while (parent) {
      all.add(parent);
      parent = parentOf(parent);
    }
  });

  return (dir) => {
    const dirs = [...all]
      .filter((f) => parentOf(f) === dir)
      .sort((a, b) => baseName(a).localeCompare(baseName(b)))
      .map((f) => ({ type: "folder", path: f }));
    const fs = Object.keys(files)
      .filter((f) => parentOf(f) === dir)
      .sort((a, b) => baseName(a).localeCompare(baseName(b)))
      .map((f) => ({ type: "file", path: f }));
    return [...dirs, ...fs];
  };
}

/* ---------- small inline icons (VS Code codicon look) ---------- */
const svgProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1,
};
const Chevron = ({ open }) => (
  <svg {...svgProps} width={14} height={14} style={{ transform: open ? "rotate(90deg)" : "none" }}>
    <path d="M6 3.5l4.5 4.5L6 12.5" strokeWidth="1.3" />
  </svg>
);
const NewFileIcon = () => (
  <svg {...svgProps}><path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5L9.5 1.5zM9.5 1.5V5H13M8 7.5v4M6 9.5h4" /></svg>
);
const NewFolderIcon = () => (
  <svg {...svgProps}><path d="M1.5 3.5h4l1 1.5h8v8h-13zM8 7.5v4M6 9.5h4" /></svg>
);
const CollapseIcon = () => (
  <svg {...svgProps}><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M5.5 8h5" /></svg>
);
const ExplorerIcon = () => (
  <svg {...svgProps} width={24} height={24}><path d="M9.5 2.5h-5a1 1 0 00-1 1v10a1 1 0 001 1h7a1 1 0 001-1v-8l-3-3zM9.5 2.5v3h3M6 8.5h4M6 10.5h3" /></svg>
);
const SearchIcon = () => (
  <svg {...svgProps} width={24} height={24}><circle cx="9.5" cy="6.5" r="3.5" /><path d="M7 9l-4.5 4.5" /></svg>
);
const CloseIcon = () => (
  <svg {...svgProps} width={14} height={14}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" strokeWidth="1.3" /></svg>
);

export default function CodeWorkbench({ height = "640px", fullscreen = false }) {
  const [project, setProject] = useState({ files: {}, folders: [], storeId: null, storefrontUrl: "" });
  const [drafts, setDrafts] = useState({});
  const [openTabs, setOpenTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState({ type: "root", path: "" });
  const [rootOpen, setRootOpen] = useState(true);
  const [panel, setPanel] = useState("explorer");
  const [query, setQuery] = useState("");
  const [sections, setSections] = useState({ outline: false, timeline: true, references: false, dependencies: false });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const data = await listThemeFiles();
      const files = {};
      const folders = [];
      data.files.forEach((f) => {
        if (baseName(f.path) === KEEP) folders.push(parentOf(f.path));
        else files[f.path] = f.content;
      });
      setProject({ files, folders, storeId: data.store, storefrontUrl: data.storefrontUrl });
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const children = useMemo(() => buildTree(project.files, project.folders), [project]);
  const contentOf = (path) => (path in drafts ? drafts[path] : project.files[path] ?? "");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out = [];
    Object.entries(project.files).forEach(([path, text]) => {
      const current = path in drafts ? drafts[path] : text;
      current.split("\n").forEach((line, i) => {
        if (line.toLowerCase().includes(q)) out.push({ path, line: i + 1, text: line.trim() });
      });
    });
    return out.slice(0, 200);
  }, [query, project, drafts]);

  function openFile(path) {
    setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    setActivePath(path);
    setSelected({ type: "file", path });
  }

  function closeTab(path) {
    if (path in drafts && !window.confirm(`Discard unsaved changes to ${baseName(path)}?`)) return;
    setDrafts((d) => {
      const next = { ...d };
      delete next[path];
      return next;
    });
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => t !== path);
      if (activePath === path) {
        const idx = tabs.indexOf(path);
        setActivePath(next[idx] ?? next[idx - 1] ?? null);
      }
      return next;
    });
  }

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveActive() {
    if (!activePath || !(activePath in drafts)) return;
    const path = activePath;
    const content = drafts[path];
    const saved = await run(() => saveThemeFile(path, content));
    if (!saved) return;
    setProject((p) => ({ ...p, files: { ...p.files, [path]: content } }));
    setDrafts((d) => {
      const next = { ...d };
      if (next[path] === content) delete next[path];
      return next;
    });
    setPreviewKey((k) => k + 1);
  }

  const targetFolder = () =>
    selected.type === "folder" ? selected.path : selected.type === "file" ? parentOf(selected.path) : "";

  async function newFile() {
    const input = window.prompt("New Liquid file name (e.g. product-card.liquid)");
    if (!input) return;
    const name = toLiquidName(input);
    if (!name) return window.alert("Only Liquid files (.liquid) are allowed.");
    const dir = targetFolder();
    const path = dir ? `${dir}/${name}` : name;
    if (path in project.files) return window.alert("A file with that name already exists.");
    const saved = await run(() => saveThemeFile(path, ""));
    if (!saved) return;
    setProject((p) => ({ ...p, files: { ...p.files, [path]: "" } }));
    if (dir) setExpanded((e) => new Set(e).add(dir));
    openFile(path);
  }

  async function newFolder() {
    const name = window.prompt("New folder name");
    if (!name) return;
    const dir = targetFolder();
    const path = dir ? `${dir}/${name}` : name;
    // Empty folders are stored as a hidden ".keep" file so they survive a reload.
    const saved = await run(() => saveThemeFile(`${path}/${KEEP}`, ""));
    if (!saved) return;
    setProject((p) => ({ ...p, folders: [...new Set([...p.folders, path])] }));
    setExpanded((e) => new Set(e).add(path).add(dir || path));
  }

  async function renameItem(item) {
    const current = baseName(item.path);
    const input = window.prompt("Rename to", current);
    if (!input || input === current) return;
    const name = item.type === "file" ? toLiquidName(input) : input.trim();
    if (!name) return window.alert("Liquid files must keep the .liquid extension.");
    if (name === current) return;
    const dir = parentOf(item.path);
    const newPath = dir ? `${dir}/${name}` : name;
    const moved = await run(() => renameThemePath(item.path, newPath));
    if (!moved) return;
    const remap = (p) =>
      p === item.path ? newPath : p.startsWith(item.path + "/") ? newPath + p.slice(item.path.length) : p;
    setProject((p) => ({
      ...p,
      files: Object.fromEntries(Object.entries(p.files).map(([k, v]) => [remap(k), v])),
      folders: p.folders.map(remap),
    }));
    setDrafts((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [remap(k), v])));
    setOpenTabs((t) => t.map(remap));
    setActivePath((a) => (a ? remap(a) : a));
    setSelected({ type: item.type, path: newPath });
    setPreviewKey((k) => k + 1);
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete ${baseName(item.path)}?`)) return;
    const removed = await run(() => deleteThemePath(item.path));
    if (!removed) return;
    const gone = (p) => p === item.path || p.startsWith(item.path + "/");
    setProject((p) => ({
      ...p,
      files: Object.fromEntries(Object.entries(p.files).filter(([k]) => !gone(k))),
      folders: p.folders.filter((f) => !gone(f)),
    }));
    setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([k]) => !gone(k))));
    setOpenTabs((tabs) => {
      const next = tabs.filter((t) => !gone(t));
      if (activePath && gone(activePath)) setActivePath(next[next.length - 1] ?? null);
      return next;
    });
    setSelected({ type: "root", path: "" });
    setPreviewKey((k) => k + 1);
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveActive();
    }
  }

  function renderNode(item, depth) {
    const isSelected = selected.path === item.path && selected.type === item.type;
    const rowClass = `group flex cursor-pointer items-center gap-1 py-[3px] pr-2 text-[14px] text-[#3b3b3b] ${
      isSelected ? "border border-[#005fb8] bg-[#e4e6f1]" : "border border-transparent hover:bg-[#e8e8e8]"
    }`;

    if (item.type === "folder") {
      const open = expanded.has(item.path);
      return (
        <div key={item.path}>
          <div
            className={rowClass}
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => {
              setSelected({ type: "folder", path: item.path });
              setExpanded((e) => {
                const next = new Set(e);
                next.has(item.path) ? next.delete(item.path) : next.add(item.path);
                return next;
              });
            }}
          >
            <Chevron open={open} />
            <span>{baseName(item.path)}</span>
            <RowActions item={item} onRename={renameItem} onDelete={deleteItem} />
          </div>
          {open && children(item.path).map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={item.path}
        className={rowClass}
        style={{ paddingLeft: 8 + depth * 12 + 16 }}
        onClick={() => openFile(item.path)}
      >
        <span className="truncate">{baseName(item.path)}</span>
        {item.path in drafts && <span className="text-[10px] text-[#005fb8]">●</span>}
        <RowActions item={item} onRename={renameItem} onDelete={deleteItem} />
      </div>
    );
  }

  const toggleSection = (key) => setSections((s) => ({ ...s, [key]: !s[key] }));

  if (status !== "ready") {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[#d4d4d4] bg-[#f8f8f8] text-sm text-[#3b3b3b]"
        style={{ height }}
      >
        {status === "loading" ? (
          "Loading theme files..."
        ) : (
          <>
            <p className="text-red-600">{error}</p>
            <button
              onClick={load}
              className="rounded border border-[#161C2C] px-4 py-1.5 hover:bg-[#161C2C] hover:text-white"
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={`flex flex-col overflow-hidden bg-white text-[#3b3b3b] ${
        fullscreen ? "" : "rounded-lg border border-[#d4d4d4]"
      }`}
      style={{ height }}
    >
      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-[#e5e5e5] bg-[#f8f8f8] pt-2">
          {[
            { id: "explorer", icon: <ExplorerIcon />, title: "Explorer" },
            { id: "search", icon: <SearchIcon />, title: "Search" },
          ].map((b) => (
            <button
              key={b.id}
              title={b.title}
              onClick={() => setPanel(b.id)}
              className={`flex h-12 w-12 items-center justify-center border-l-2 ${
                panel === b.id ? "border-[#005fb8] text-[#3b3b3b]" : "border-transparent text-[#616161]"
              }`}
            >
              {b.icon}
            </button>
          ))}
        </nav>

        {/* Side panel */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-[#e5e5e5] bg-[#f8f8f8]">
          {panel === "explorer" ? (
            <>
              <div className="px-5 py-2.5 text-[11px] uppercase tracking-wide text-[#3b3b3b]">Explorer</div>

              <div className="flex items-center justify-between px-2 py-1">
                <button
                  className="flex items-center gap-1 text-[11px] font-bold uppercase text-[#3b3b3b]"
                  onClick={() => {
                    setRootOpen((o) => !o);
                    setSelected({ type: "root", path: "" });
                  }}
                >
                  <Chevron open={rootOpen} />
                  Tss-gg
                </button>
                <div className="flex gap-1 text-[#424242]">
                  <IconButton title="New File" onClick={newFile}><NewFileIcon /></IconButton>
                  <IconButton title="New Folder" onClick={newFolder}><NewFolderIcon /></IconButton>
                  <IconButton title="Collapse Folders" onClick={() => setExpanded(new Set())}><CollapseIcon /></IconButton>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pb-2">
                {rootOpen && children("").map((c) => renderNode(c, 0))}
              </div>

              {[
                ["outline", "Outline"],
                ["timeline", "Timeline"],
                ["references", "References"],
                ["dependencies", "Dependencies"],
              ].map(([key, label]) => (
                <div key={key} className="border-t border-[#e5e5e5]">
                  <button
                    className="flex w-full items-center gap-1 px-1 py-1 text-[11px] font-bold uppercase text-[#3b3b3b]"
                    onClick={() => toggleSection(key)}
                  >
                    <Chevron open={sections[key]} />
                    {label}
                  </button>
                  {sections[key] && (
                    <p className="px-6 pb-3 text-[13px] text-[#6b6b6b]">
                      {key === "outline" || key === "timeline"
                        ? `The active editor cannot provide ${key} information.`
                        : "Nothing to show."}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="px-5 py-2.5 text-[11px] uppercase tracking-wide text-[#3b3b3b]">Search</div>
              <div className="px-3 pb-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full rounded border border-[#cecece] bg-white px-2 py-1 text-[13px] outline-none focus:border-[#005fb8]"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 text-[13px]">
                {query && results.length === 0 && <p className="text-[#6b6b6b]">No results found.</p>}
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => openFile(r.path)}
                    className="block w-full truncate py-0.5 text-left hover:bg-[#e8e8e8]"
                    title={`${r.path}:${r.line}`}
                  >
                    <span className="font-medium">{baseName(r.path)}</span>
                    <span className="text-[#6b6b6b]"> :{r.line} </span>
                    <span className="text-[#6b6b6b]">{r.text}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* Editor area */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-stretch bg-[#f8f8f8]">
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {openTabs.map((path) => {
              const active = path === activePath;
              return (
                <div
                  key={path}
                  onClick={() => {
                    setActivePath(path);
                    setSelected({ type: "file", path });
                  }}
                  className={`flex cursor-pointer items-center gap-2 border-r border-[#e5e5e5] px-3 py-2 text-[13px] ${
                    active
                      ? "border-t-2 border-t-[#005fb8] bg-white text-[#3b3b3b]"
                      : "border-t-2 border-t-transparent text-[#6b6b6b]"
                  }`}
                >
                  <span className="whitespace-nowrap">{baseName(path)}</span>
                  {path in drafts ? (
                    <span className="text-[#005fb8]">●</span>
                  ) : (
                    <button
                      className="rounded text-[#6b6b6b] hover:bg-[#e8e8e8]"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(path);
                      }}
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2 px-3 text-[12px]">
            <button
              onClick={saveActive}
              disabled={busy || !activePath || !(activePath in drafts)}
              className="rounded border border-[#cecece] px-2.5 py-1 hover:bg-[#e8e8e8] disabled:opacity-40"
            >
              Save
            </button>
            <button
              onClick={() => setPreviewOpen((o) => !o)}
              className={`rounded border px-2.5 py-1 ${
                previewOpen
                  ? "border-[#161C2C] bg-[#161C2C] text-white"
                  : "border-[#cecece] hover:bg-[#e8e8e8]"
              }`}
            >
              Preview
            </button>
          </div>
          </div>

          {activePath && (
            <div className="flex items-center gap-1 border-b border-[#e5e5e5] bg-white px-3 py-1 text-[13px] text-[#6b6b6b]">
              {activePath.split("/").map((seg, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span>›</span>}
                  <span className={i === arr.length - 1 ? "text-[#3b3b3b]" : ""}>{seg}</span>
                </span>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1">
            {activePath ? (
              <CodeEditor
                path={activePath}
                language={languageOf(activePath)}
                theme="vs"
                value={contentOf(activePath)}
                onChange={(v) =>
                  setDrafts((d) => {
                    if (v === project.files[activePath]) {
                      const next = { ...d };
                      delete next[activePath];
                      return next;
                    }
                    return { ...d, [activePath]: v };
                  })
                }
                height="100%"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#6b6b6b]">
                Open a file from the Explorer to start editing.
              </div>
            )}
          </div>
        </section>

        {previewOpen && (
          <aside className="flex w-[40%] shrink-0 flex-col border-l border-[#e5e5e5]">
            <div className="flex items-center justify-between bg-[#f8f8f8] px-3 py-2 text-[12px]">
              <span className="font-bold uppercase text-[#3b3b3b]">Theme preview</span>
              <span className="flex gap-3">
                <button className="hover:text-[#005fb8]" onClick={() => setPreviewKey((k) => k + 1)}>
                  Refresh
                </button>
                <a
                  className="hover:text-[#005fb8]"
                  href={project.storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </span>
            </div>
            {/* sandbox: theme code is user-written, so it must not get our origin's access */}
            <iframe
              key={previewKey}
              title="Theme preview"
              src={project.storefrontUrl}
              sandbox="allow-scripts allow-forms allow-popups"
              className="min-h-0 flex-1 bg-white"
            />
          </aside>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[#e5e5e5] bg-[#f8f8f8] px-3 py-1 text-[12px] text-[#3b3b3b]">
        <span className={error ? "text-red-600" : ""}>
          {busy ? "Saving..." : error || "Connected to server"}
        </span>
        <span>
          {activePath && activePath in drafts ? "Unsaved (Cmd/Ctrl+S to save)  •  " : ""}
          {activePath ? languageOf(activePath) : ""}
        </span>
      </div>
    </div>
  );
}

function IconButton({ title, onClick, children }) {
  return (
    <button title={title} onClick={onClick} className="rounded p-0.5 hover:bg-[#e0e0e0]">
      {children}
    </button>
  );
}

function RowActions({ item, onRename, onDelete }) {
  return (
    <span className="ml-auto hidden gap-2 text-[11px] text-[#6b6b6b] group-hover:flex">
      <button
        title="Rename"
        className="hover:text-[#005fb8]"
        onClick={(e) => {
          e.stopPropagation();
          onRename(item);
        }}
      >
        Rename
      </button>
      <button
        title="Delete"
        className="hover:text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
        }}
      >
        Delete
      </button>
    </span>
  );
}
