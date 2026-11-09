import { useEffect, useMemo, useState } from "react";
import { getStoreId } from "@/lib/auth";

const TYPES = [
  ["single_line_text", "Single line text"],
  ["multi_line_text", "Multi-line text"],
  ["integer", "Integer"],
  ["decimal", "Decimal"],
  ["boolean", "True or false"],
  ["date", "Date"],
  ["url", "URL"],
  ["color", "Color"],
];

const OWNERS = [
  ["product", "Products"],
  ["variant", "Variants"],
  ["collection", "Collections"],
  ["customer", "Customers"],
  ["order", "Orders"],
];

const slug = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const uid = () => Math.random().toString(36).slice(2, 10);

// Persisted per store in this browser until a backend endpoint exists.
const key = (kind) => `tss.${kind}.${getStoreId() || "default"}`;

function load(kind) {
  try {
    const v = JSON.parse(localStorage.getItem(key(kind)) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(kind, value) {
  try {
    localStorage.setItem(key(kind), JSON.stringify(value));
  } catch {
    /* storage unavailable: changes last for this session only */
  }
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600";
const btnPrimary =
  "rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600/90 disabled:opacity-60";
const btnGhost =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Empty({ title, text, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}

/* ------------------------- Metafield definitions ------------------------- */

function DefinitionForm({ initial, existing, onCancel, onSave }) {
  const [owner, setOwner] = useState(initial?.owner || "product");
  const [name, setName] = useState(initial?.name || "");
  const [namespace, setNamespace] = useState(initial?.namespace || "custom");
  const [k, setK] = useState(initial?.key || "");
  const [keyTouched, setKeyTouched] = useState(!!initial);
  const [type, setType] = useState(initial?.type || "single_line_text");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const finalKey = slug(k || name);
    const ns = slug(namespace) || "custom";
    if (!name.trim()) return setError("Name is required.");
    if (!finalKey) return setError("Key is required.");
    const dup = existing.some(
      (d) => d.id !== initial?.id && d.owner === owner && d.namespace === ns && d.key === finalKey
    );
    if (dup) return setError(`${ns}.${finalKey} already exists for this resource.`);
    onSave({
      id: initial?.id || uid(),
      owner,
      name: name.trim(),
      namespace: ns,
      key: finalKey,
      type,
      description: description.trim(),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-b border-slate-200 bg-slate-50 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Resource">
          <select
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            disabled={!!initial}
            className={inputCls}
          >
            {OWNERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!!initial}
            className={inputCls}
          >
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!keyTouched) setK(slug(e.target.value));
            }}
            placeholder="e.g. Care instructions"
            className={inputCls}
            autoFocus
          />
        </Field>
        <Field label="Namespace and key" hint="Used in themes and the Storefront API.">
          <div className="flex items-center gap-2">
            <input
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              disabled={!!initial}
              className={inputCls}
              aria-label="Namespace"
            />
            <span className="text-slate-400">.</span>
            <input
              value={k}
              onChange={(e) => {
                setK(e.target.value);
                setKeyTouched(true);
              }}
              disabled={!!initial}
              className={inputCls}
              aria-label="Key"
            />
          </div>
        </Field>
      </div>
      <Field label="Description (optional)">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initial ? "Save" : "Add definition"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Definitions() {
  const [defs, setDefs] = useState(() => load("metafield_defs"));
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | definition

  useEffect(() => save("metafield_defs", defs), [defs]);

  const visible = defs.filter((d) => filter === "all" || d.owner === filter);

  const onSave = (def) => {
    setDefs((cur) =>
      cur.some((d) => d.id === def.id) ? cur.map((d) => (d.id === def.id ? def : d)) : [...cur, def]
    );
    setEditing(null);
  };

  const remove = (d) => {
    if (window.confirm(`Delete the definition "${d.name}"?`)) {
      setDefs((cur) => cur.filter((x) => x.id !== d.id));
    }
  };

  const addBtn = (
    <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
      Add definition
    </button>
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Metafield definitions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add custom fields to products, variants, collections, customers and orders.
          </p>
        </div>
        {defs.length > 0 && !editing && addBtn}
      </div>

      {editing && (
        <DefinitionForm
          initial={editing === "new" ? null : editing}
          existing={defs}
          onCancel={() => setEditing(null)}
          onSave={onSave}
        />
      )}

      {defs.length === 0 && !editing ? (
        <Empty
          title="No metafield definitions yet"
          text="Define a field once, then fill it in on each product, collection or customer."
          action={addBtn}
        />
      ) : (
        defs.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
              {[["all", "All"], ...OWNERS].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFilter(v)}
                  aria-pressed={filter === v}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    filter === v
                      ? "bg-ink text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-slate-200">
              {visible.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{d.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {d.namespace}.{d.key} · {OWNERS.find(([v]) => v === d.owner)?.[1]} ·{" "}
                      {TYPES.find(([v]) => v === d.type)?.[1]}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setEditing(d)} className={btnGhost}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(d)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {visible.length === 0 && (
                <li className="px-5 py-8 text-center text-sm text-slate-500">
                  No definitions for this resource.
                </li>
              )}
            </ul>
          </>
        )
      )}
    </section>
  );
}

/* ----------------------------- Metaobjects ------------------------------ */

function ObjectTypeForm({ initial, existing, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [fields, setFields] = useState(
    initial?.fields?.length ? initial.fields : [{ id: uid(), name: "", type: "single_line_text" }]
  );
  const [error, setError] = useState("");

  const setField = (id, patch) =>
    setFields((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const submit = (e) => {
    e.preventDefault();
    const handle = initial?.handle || slug(name);
    if (!name.trim() || !handle) return setError("Name is required.");
    if (!initial && existing.some((t) => t.handle === handle))
      return setError("A metaobject type with this name already exists.");
    const clean = fields
      .filter((f) => f.name.trim())
      .map((f) => ({ ...f, name: f.name.trim(), key: slug(f.name) }));
    if (clean.length === 0) return setError("Add at least one field.");
    if (new Set(clean.map((f) => f.key)).size !== clean.length)
      return setError("Field names must be unique.");
    onSave({ id: initial?.id || uid(), handle, name: name.trim(), fields: clean });
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-b border-slate-200 bg-slate-50 p-5">
      <Field label="Type name" hint="e.g. Size guide, Designer, FAQ">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          autoFocus
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Fields</p>
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.id} className="flex gap-2">
              <input
                value={f.name}
                onChange={(e) => setField(f.id, { name: e.target.value })}
                placeholder="Field name"
                className={inputCls}
                aria-label="Field name"
              />
              <select
                value={f.type}
                onChange={(e) => setField(f.id, { type: e.target.value })}
                className={`${inputCls} max-w-[11rem]`}
                aria-label="Field type"
              >
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFields((cur) => cur.filter((x) => x.id !== f.id))}
                disabled={fields.length === 1}
                className="px-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                aria-label="Remove field"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setFields((cur) => [...cur, { id: uid(), name: "", type: "single_line_text" }])
          }
          className="mt-2 text-sm font-medium text-ink underline"
        >
          + Add field
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initial ? "Save" : "Create type"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function EntryInput({ field, value, onChange }) {
  const common = { className: inputCls, "aria-label": field.name };
  switch (field.type) {
    case "multi_line_text":
      return (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      );
    case "boolean":
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} {...common}>
          <option value="">—</option>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    case "integer":
      return (
        <input
          type="number"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );
    case "decimal":
      return (
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...common}
        />
      );
    case "date":
      return (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} {...common} />
      );
    case "url":
      return (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://"
          {...common}
        />
      );
    case "color":
      return (
        <input
          type="color"
          value={value || "#111827"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-20 rounded border border-slate-300"
          aria-label={field.name}
        />
      );
    default:
      return <input value={value} onChange={(e) => onChange(e.target.value)} {...common} />;
  }
}

function EntryForm({ type, initial, onCancel, onSave }) {
  const [values, setValues] = useState(initial?.values || {});
  const submit = (e) => {
    e.preventDefault();
    onSave({ id: initial?.id || uid(), typeId: type.id, values });
  };
  return (
    <form onSubmit={submit} className="space-y-4 border-b border-slate-200 bg-slate-50 p-5">
      {type.fields.map((f) => (
        <Field key={f.id} label={f.name}>
          <EntryInput
            field={f}
            value={values[f.key] ?? ""}
            onChange={(v) => setValues((cur) => ({ ...cur, [f.key]: v }))}
          />
        </Field>
      ))}
      <div className="flex gap-2">
        <button type="submit" className={btnPrimary}>
          {initial ? "Save" : "Add entry"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Metaobjects() {
  const [types, setTypes] = useState(() => load("metaobject_types"));
  const [entries, setEntries] = useState(() => load("metaobject_entries"));
  const [typeForm, setTypeForm] = useState(null); // null | "new" | type
  const [openId, setOpenId] = useState(null);
  const [entryForm, setEntryForm] = useState(null); // null | "new" | entry

  useEffect(() => save("metaobject_types", types), [types]);
  useEffect(() => save("metaobject_entries", entries), [entries]);

  const open = useMemo(() => types.find((t) => t.id === openId) || null, [types, openId]);
  const openEntries = entries.filter((e) => e.typeId === openId);

  const saveType = (t) => {
    setTypes((cur) =>
      cur.some((x) => x.id === t.id) ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t]
    );
    setTypeForm(null);
  };

  const removeType = (t) => {
    if (window.confirm(`Delete "${t.name}" and all its entries?`)) {
      setTypes((cur) => cur.filter((x) => x.id !== t.id));
      setEntries((cur) => cur.filter((e) => e.typeId !== t.id));
      if (openId === t.id) setOpenId(null);
    }
  };

  const saveEntry = (entry) => {
    setEntries((cur) =>
      cur.some((x) => x.id === entry.id)
        ? cur.map((x) => (x.id === entry.id ? entry : x))
        : [...cur, entry]
    );
    setEntryForm(null);
  };

  const addTypeBtn = (
    <button type="button" onClick={() => setTypeForm("new")} className={btnPrimary}>
      Add metaobject type
    </button>
  );

  /* entries view */
  if (open) {
    const [primary] = open.fields;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <button
              type="button"
              onClick={() => {
                setOpenId(null);
                setEntryForm(null);
              }}
              className="text-sm text-slate-500 hover:text-orange-600"
            >
              ← Metaobjects
            </button>
            <h2 className="mt-1 text-lg font-semibold text-ink">{open.name}</h2>
          </div>
          {!entryForm && (
            <button type="button" onClick={() => setEntryForm("new")} className={btnPrimary}>
              Add entry
            </button>
          )}
        </div>
        {entryForm && (
          <EntryForm
            type={open}
            initial={entryForm === "new" ? null : entryForm}
            onCancel={() => setEntryForm(null)}
            onSave={saveEntry}
          />
        )}
        {openEntries.length === 0 && !entryForm ? (
          <Empty title="No entries yet" text={`Add the first ${open.name.toLowerCase()} entry.`} />
        ) : (
          <ul className="divide-y divide-slate-200">
            {openEntries.map((en) => (
              <li key={en.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {en.values[primary.key] || "(untitled)"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {open.fields
                      .slice(1, 3)
                      .map((f) => en.values[f.key])
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => setEntryForm(en)} className={btnGhost}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this entry?"))
                        setEntries((cur) => cur.filter((x) => x.id !== en.id));
                    }}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  /* types view */
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Metaobjects</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reusable structured content such as size guides, designers or FAQs.
          </p>
        </div>
        {types.length > 0 && !typeForm && addTypeBtn}
      </div>
      {typeForm && (
        <ObjectTypeForm
          initial={typeForm === "new" ? null : typeForm}
          existing={types}
          onCancel={() => setTypeForm(null)}
          onSave={saveType}
        />
      )}
      {types.length === 0 && !typeForm ? (
        <Empty
          title="No metaobject types yet"
          text="Create a type with its own fields, then add entries to it."
          action={addTypeBtn}
        />
      ) : (
        <ul className="divide-y divide-slate-200">
          {types.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <button type="button" onClick={() => setOpenId(t.id)} className="min-w-0 text-left">
                <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                <p className="text-xs text-slate-500">
                  {t.fields.length} field{t.fields.length === 1 ? "" : "s"} ·{" "}
                  {entries.filter((e) => e.typeId === t.id).length} entries
                </p>
              </button>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setOpenId(t.id)} className={btnGhost}>
                  Entries
                </button>
                <button type="button" onClick={() => setTypeForm(t)} className={btnGhost}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeType(t)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function MetafieldsSettings() {
  const [tab, setTab] = useState("definitions");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-200/60 p-1 text-sm font-medium w-fit">
        {[
          ["definitions", "Metafields"],
          ["objects", "Metaobjects"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            aria-pressed={tab === v}
            className={`rounded-md px-4 py-1.5 ${
              tab === v ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-orange-600"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "definitions" ? <Definitions /> : <Metaobjects />}
    </div>
  );
}
