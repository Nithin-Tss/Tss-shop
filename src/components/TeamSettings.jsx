import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { can, getActiveStore, setStores, useSession } from "@/lib/auth";

/*
 * Settings → Users and Settings → Roles, modelled on Shopify's staff permissions:
 * - a role is a bundle of permissions; a person can hold several and gets all of them
 * - system roles are managed by the platform and can't be changed
 * - predefined roles come with every store and can be customized; custom roles are the store's own
 * - the store owner isn't a role: owners can do everything
 * Everything here comes from the backend (apps/core/rbac.py, /api/v1/roles/, /api/v1/members/).
 */

const KIND_INFO = {
  system: {
    label: "System roles",
    note: "Managed by the platform. They can't be changed or deleted.",
  },
  predefined: {
    label: "Predefined roles",
    note: "Come with every store. You can customize or delete them.",
  },
  custom: { label: "Custom roles", note: "Roles your store created." },
};

const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300";
const primaryButton =
  "rounded-lg bg-[#14130F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1A1916] disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const dangerButton =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
        <div>
          <h2 className="text-base font-semibold text-[#14130F]">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

function Chip({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    dark: "bg-[#14130F] text-white",
    amber: "bg-amber-50 text-amber-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

// apiPost / apiPatch results: the message to show (DRF may send a bare list, which lands in fieldErrors as "0")
const formMessage = (res, fallback) =>
  res.formError || Object.values(res.fieldErrors)[0] || fallback;

// The signed-in user's own access changed: re-read their stores so the session's
// permissions (sidebar, page guards) match the backend again.
function refreshMyStores() {
  apiGet("/api/v1/stores/").then((res) => {
    if (res.ok && Array.isArray(res.data)) setStores(res.data);
  });
}

// The signed-in user's access to the active store
function useMyAccess() {
  const session = useSession();
  const store = getActiveStore(session);

  return useMemo(
    () => ({
      session,
      userId: session?.user?.id,
      isOwner: store?.role === "owner",
      roleNames: store?.roles || [],
      permissions: new Set(store?.permissions || []),
    }),
    [session, store]
  );
}

// Non-owners can only hand out access they have themselves (the backend checks this too)
const withinMyAccess = (me, permissions) =>
  me.isOwner || permissions.every((p) => me.permissions.has(p));

/* ------------------------------------------------------------------ */
/* Shared list-view pieces                                              */
/* ------------------------------------------------------------------ */

const checkboxClass = "h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#14130F]";

function Icon({ name, className = "h-4 w-4" }) {
  const paths = {
    search: "M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z",
    close: "M6 6l12 12M18 6L6 18",
    sort: "M7 4v16m0 0l-3-3m3 3l3-3M17 20V4m0 0l-3 3m3-3l3 3",
    chevron: "M9 6l6 6-6 6",
    shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z",
    lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z",
    mail: "M4 6h16v12H4zM4 7l8 6 8-6",
    crown: "M4 18h16M5 8l4 4 3-6 3 6 4-4-1.5 10h-11z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const AVATAR_TONES = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function Avatar({ name, size = "h-9 w-9", dashed = false }) {
  const letter = (name || "?").charAt(0).toUpperCase();
  const tone = AVATAR_TONES[(letter.charCodeAt(0) || 0) % AVATAR_TONES.length];
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        dashed ? "border border-dashed border-slate-300 bg-white text-slate-400" : tone
      }`}
    >
      {letter}
    </span>
  );
}

function StatusPill({ tone, children }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

// Tabs + search + sort above a table
function ListToolbar({ tabs, tab, onTab, query, onQuery, searchLabel, sortDir, onSort }) {
  const [searching, setSearching] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
      <div role="tablist" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-slate-100 text-[#14130F]"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs font-normal text-slate-400">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {searching ? (
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className="w-56 rounded-lg border border-slate-300 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
            />
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQuery("");
                setSearching(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Search"
            onClick={() => setSearching(true)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <Icon name="search" />
          </button>
        )}
        <button
          type="button"
          aria-label={`Sort by name, ${sortDir === "asc" ? "A to Z" : "Z to A"}`}
          title={sortDir === "asc" ? "Name A–Z" : "Name Z–A"}
          onClick={onSort}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        >
          <Icon name="sort" />
        </button>
      </div>
    </div>
  );
}

// Replaces the column headings while rows are ticked
function BulkBar({ count, noun, children, onClear }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-800">
        {count} {noun}
        {count === 1 ? "" : "s"} selected
      </span>
      {children}
      <button type="button" onClick={onClear} className="text-sm text-slate-500 hover:underline">
        Clear
      </button>
    </div>
  );
}

function EmptyRows({ children }) {
  return <div className="px-5 py-14 text-center text-sm text-slate-500">{children}</div>;
}

// Right-hand slide-over used to edit a user or a role
function Drawer({ title, subtitle, onClose, footer, wide = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />
      <aside
        className={`relative flex h-full w-full flex-col bg-white shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#14130F]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Modal({ title, description, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/30"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#14130F]">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </header>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const sortByName = (dir) => (a, b) =>
  a.sortName.localeCompare(b.sortName, undefined, { sensitivity: "base" }) *
  (dir === "asc" ? 1 : -1);

function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Users                                                                */
/* ------------------------------------------------------------------ */

const USER_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "owners", label: "Owners" },
];

const ACTION_LABELS = {
  "role.created": "Role created",
  "role.updated": "Role changed",
  "role.deleted": "Role deleted",
  "member.added": "User added",
  "member.invited": "User invited",
  "member.updated": "Access changed",
  "member.removed": "User removed",
  "invitation.accepted": "Invitation accepted",
  "invitation.revoked": "Invitation withdrawn",
};

const memberName = (m) => `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email;

export function UsersSettings() {
  const me = useMyAccess();
  const canView = can(me.session, "members.view");
  const canManage = can(me.session, "members.manage");

  const [members, setMembers] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [activity, setActivity] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [rowError, setRowError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(() => new Set());
  const [openKey, setOpenKey] = useState(null);
  const [adding, setAdding] = useState(false);

  const loadActivity = useCallback(async () => {
    const res = await apiGet("/api/v1/members/activity/");
    if (res.ok) setActivity(res.data);
  }, []);

  // Both loaders only set state after their request resolves
  useEffect(() => {
    if (!canView) return;
    Promise.all([
      apiGet("/api/v1/members/"),
      apiGet("/api/v1/roles/"),
      apiGet("/api/v1/members/invitations/"),
    ]).then(([m, r, inv]) => {
      if (m.ok) setMembers(m.data);
      else setLoadError(m.error);
      if (r.ok) setRoles(r.data);
      if (inv.ok) setInvitations(inv.data);
    });
  }, [canView]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canManage) loadActivity();
  }, [canManage, loadActivity]);

  // Members and pending invitations as one list
  const rows = useMemo(() => {
    const people = (members || []).map((m) => ({
      key: `m${m.membershipId}`,
      kind: "member",
      name: memberName(m),
      sortName: memberName(m),
      email: m.email,
      isOwner: m.isOwner,
      roles: m.roles,
      member: m,
    }));
    const invited = invitations.map((i) => ({
      key: `i${i.invitationId}`,
      kind: "invite",
      name: i.email,
      sortName: i.email,
      email: i.email,
      isOwner: i.isOwner,
      roles: i.roles,
      invitation: i,
    }));
    return [...people, ...invited];
  }, [members, invitations]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      active: rows.filter((r) => r.kind === "member").length,
      pending: rows.filter((r) => r.kind === "invite").length,
      owners: rows.filter((r) => r.isOwner).length,
    }),
    [rows]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (tab === "active" && r.kind !== "member") return false;
        if (tab === "pending" && r.kind !== "invite") return false;
        if (tab === "owners" && !r.isOwner) return false;
        if (!q) return true;
        return [r.name, r.email, r.isOwner ? "store owner" : "", ...r.roles.map((x) => x.name)]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort(sortByName(sortDir));
  }, [rows, tab, query, sortDir]);

  // Owners are changed only by owners; others only if all their access is within the caller's
  const mayChange = (member) =>
    canManage && (member.isOwner ? me.isOwner : withinMyAccess(me, member.permissions));
  const mayWithdraw = canManage;
  const rowEditable = (r) => (r.kind === "member" ? mayChange(r.member) : mayWithdraw);

  const selectableRows = visible.filter(rowEditable);
  const selectedRows = visible.filter((r) => selected.has(r.key));
  const allTicked = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.key));

  const toggleOne = (key) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () =>
    setSelected(allTicked ? new Set() : new Set(selectableRows.map((r) => r.key)));

  const saveAccess = async (member, body) => {
    setRowError("");
    setBusy(true);
    const res = await apiPatch(`/api/v1/members/${member.membershipId}/`, body);
    setBusy(false);

    if (!res.ok) {
      setRowError(formMessage(res, "Couldn't change this person's access."));
      return;
    }
    setMembers((list) => list.map((m) => (m.membershipId === member.membershipId ? res.data : m)));
    setOpenKey(null);
    loadActivity();
    if (member.userId === me.userId) refreshMyStores();
  };

  const removeMember = async (member, confirm = true) => {
    const who = member.userId === me.userId ? "yourself" : member.email;
    if (
      confirm &&
      !window.confirm(`Remove ${who} from this store? They will lose access straight away.`)
    )
      return false;

    const res = await apiDelete(`/api/v1/members/${member.membershipId}/`);
    if (!res.ok) {
      setRowError(res.error);
      return false;
    }
    setMembers((list) => list.filter((m) => m.membershipId !== member.membershipId));
    if (member.userId === me.userId) refreshMyStores();
    return true;
  };

  const withdraw = async (invitation) => {
    const res = await apiDelete(`/api/v1/members/invitations/${invitation.invitationId}/`);
    if (!res.ok) {
      setRowError(res.error);
      return false;
    }
    setInvitations((list) => list.filter((i) => i.invitationId !== invitation.invitationId));
    return true;
  };

  const removeRow = async (row) => {
    setRowError("");
    setBusy(true);
    const ok =
      row.kind === "member" ? await removeMember(row.member) : await withdraw(row.invitation);
    setBusy(false);
    if (ok) {
      setOpenKey(null);
      loadActivity();
    }
  };

  const removeSelected = async () => {
    const mine = selectedRows.some((r) => r.kind === "member" && r.member.userId === me.userId);
    if (
      !window.confirm(
        `Remove or withdraw ${selectedRows.length} ${selectedRows.length === 1 ? "person" : "people"}? They will lose access straight away.${
          mine ? " This includes you." : ""
        }`
      )
    )
      return;

    setRowError("");
    setBusy(true);
    for (const row of selectedRows) {
      if (row.kind === "member") await removeMember(row.member, false);
      else await withdraw(row.invitation);
    }
    setBusy(false);
    setSelected(new Set());
    loadActivity();
  };

  const exportCsv = () =>
    downloadCsv("users.csv", [
      ["Name", "Email", "Status", "Roles"],
      ...visible.map((r) => [
        r.name === r.email ? "" : r.name,
        r.email,
        r.kind === "member" ? "Active" : "Pending",
        [r.isOwner ? "Store owner" : "", ...r.roles.map((x) => x.name)].filter(Boolean).join("; "),
      ]),
    ]);

  if (!canView) {
    return (
      <Section title="Users" description="People who can sign in to this store's admin.">
        <div className="space-y-3 p-5 text-sm text-slate-500">
          <p>You need the "View users and their roles" permission to see who has access.</p>
          <p className="flex flex-wrap items-center gap-1.5">
            Your access:
            {me.isOwner ? (
              <Chip tone="dark">Store owner</Chip>
            ) : me.roleNames.length ? (
              me.roleNames.map((name) => <Chip key={name}>{name}</Chip>)
            ) : (
              <Chip tone="amber">No roles</Chip>
            )}
          </p>
        </div>
      </Section>
    );
  }

  const open = rows.find((r) => r.key === openKey);
  const loading = members === null && !loadError;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          Everyone who can sign in to this store's admin. Each person gets every permission of every
          role they hold; store owners can do everything.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!visible.length}
            className={secondaryButton}
          >
            Export
          </button>
          {canManage && (
            <button type="button" onClick={() => setAdding(true)} className={primaryButton}>
              Add users
            </button>
          )}
        </div>
      </div>

      <ErrorNote>{loadError || rowError}</ErrorNote>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ListToolbar
          tabs={USER_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
          tab={tab}
          onTab={(id) => {
            setTab(id);
            setSelected(new Set());
          }}
          query={query}
          onQuery={setQuery}
          searchLabel="Search name, email or role"
          sortDir={sortDir}
          onSort={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />

        <div role="table" aria-label="Users">
          <div
            role="row"
            className="grid grid-cols-[28px_minmax(0,2fr)_110px_minmax(0,2fr)_20px] items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-500"
          >
            <input
              type="checkbox"
              aria-label="Select all"
              className={checkboxClass}
              checked={allTicked}
              disabled={!selectableRows.length}
              onChange={toggleAll}
            />
            {selectedRows.length ? (
              <div className="col-span-4">
                <BulkBar
                  count={selectedRows.length}
                  noun="user"
                  onClear={() => setSelected(new Set())}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={removeSelected}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Remove access
                  </button>
                </BulkBar>
              </div>
            ) : (
              <>
                <span>User</span>
                <span>Status</span>
                <span>Role</span>
                <span />
              </>
            )}
          </div>

          {loading && <EmptyRows>Loading…</EmptyRows>}
          {!loading && !visible.length && (
            <EmptyRows>{query ? `No users match "${query}".` : "No users in this view."}</EmptyRows>
          )}

          {visible.map((r) => {
            const editable = rowEditable(r);
            const isMe = r.kind === "member" && r.member.userId === me.userId;
            return (
              <div
                key={r.key}
                role="row"
                onClick={() => setOpenKey(r.key)}
                className={`grid cursor-pointer grid-cols-[28px_minmax(0,2fr)_110px_minmax(0,2fr)_20px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 hover:bg-slate-50 ${
                  selected.has(r.key) ? "bg-slate-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${r.name}`}
                  className={checkboxClass}
                  checked={selected.has(r.key)}
                  disabled={!editable}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleOne(r.key)}
                />
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={r.name} dashed={r.kind === "invite"} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {r.name}
                      {isMe && <span className="ml-2 text-xs font-normal text-slate-500">you</span>}
                    </p>
                    {r.name !== r.email && (
                      <p className="truncate text-xs text-slate-500">{r.email}</p>
                    )}
                  </div>
                </div>
                <div>
                  {r.kind === "invite" ? (
                    <StatusPill tone="amber">Invited</StatusPill>
                  ) : (
                    <StatusPill tone="green">Active</StatusPill>
                  )}
                </div>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {r.isOwner && <Chip tone="dark">Store owner</Chip>}
                  {r.roles.map((role) => (
                    <Chip key={role.id}>{role.name}</Chip>
                  ))}
                  {!r.isOwner && !r.roles.length && <Chip tone="amber">No access</Chip>}
                </div>
                <Icon name="chevron" className="h-4 w-4 text-slate-300" />
              </div>
            );
          })}
        </div>
      </section>

      {canManage && activity && activity.length > 0 && (
        <Section title="Recent changes" description="Who changed roles or access, newest first.">
          <ul className="divide-y divide-slate-200 px-5 py-2 text-sm">
            {activity.slice(0, 10).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="font-medium text-slate-800">
                  {ACTION_LABELS[entry.action] || entry.action}
                </span>
                <span className="text-slate-600">{entry.subject}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {entry.actor || "System"} · {new Date(entry.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {open && (
        <UserDrawer
          key={open.key}
          me={me}
          row={open}
          roles={roles}
          busy={busy}
          canChange={rowEditable(open)}
          onClose={() => setOpenKey(null)}
          onSave={saveAccess}
          onRemove={() => removeRow(open)}
        />
      )}

      {adding && (
        <Modal
          title="Add users"
          description="Give someone access with one or more roles. If they don't have an account yet, they're invited by email and get access once they sign up and verify it."
          onClose={() => setAdding(false)}
        >
          <AddUserForm
            me={me}
            roles={roles}
            onCancel={() => setAdding(false)}
            onAdded={(result) => {
              if (result.invited) setInvitations((list) => [result, ...list]);
              else setMembers((list) => [...(list || []), result]);
              loadActivity();
              setAdding(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function UserDrawer({ me, row, roles, busy, canChange, onClose, onSave, onRemove }) {
  const isInvite = row.kind === "invite";
  const member = row.member;
  const [roleIds, setRoleIds] = useState(row.roles.map((r) => r.id));
  const [isOwner, setIsOwner] = useState(row.isOwner);

  const dirty =
    isOwner !== row.isOwner ||
    roleIds.length !== row.roles.length ||
    roleIds.some((id) => !row.roles.some((r) => r.id === id));

  return (
    <Drawer
      title={row.name}
      subtitle={isInvite ? "Invitation pending" : row.email}
      onClose={onClose}
      footer={
        canChange ? (
          <>
            <button type="button" disabled={busy} onClick={onRemove} className={dangerButton}>
              {isInvite ? "Withdraw invitation" : "Remove from store"}
            </button>
            {!isInvite && (
              <button
                type="button"
                disabled={busy || !dirty}
                onClick={() => onSave(member, me.isOwner ? { roleIds, isOwner } : { roleIds })}
                className={primaryButton}
              >
                {busy ? "Saving…" : "Save access"}
              </button>
            )}
          </>
        ) : (
          <button type="button" onClick={onClose} className={`${secondaryButton} ml-auto`}>
            Close
          </button>
        )
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <Avatar name={row.name} size="h-11 w-11" dashed={isInvite} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
          <p className="truncate text-sm text-slate-500">{row.email}</p>
        </div>
        {isInvite ? (
          <StatusPill tone="amber">Invited</StatusPill>
        ) : (
          <StatusPill tone="green">Active</StatusPill>
        )}
      </div>

      {isInvite ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            This person doesn't have an account yet. They get the access below once they sign up and
            verify this email address.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.isOwner && <Chip tone="dark">Store owner</Chip>}
            {row.roles.map((role) => (
              <Chip key={role.id}>{role.name}</Chip>
            ))}
          </div>
        </div>
      ) : canChange ? (
        <RolePicker
          me={me}
          roles={roles}
          roleIds={roleIds}
          setRoleIds={setRoleIds}
          isOwner={isOwner}
          setIsOwner={setIsOwner}
        />
      ) : (
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            {me && !can(me.session, "members.manage")
              ? 'You need the "Add, change and remove users" permission to change access.'
              : "This person has permissions you don't have, so you can't change their access."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {row.isOwner && <Chip tone="dark">Store owner</Chip>}
            {row.roles.map((role) => (
              <Chip key={role.id}>{role.name}</Chip>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  );
}

// Role checkboxes grouped by kind, plus "Store owner" for owners
function RolePicker({ me, roles, roleIds, setRoleIds, isOwner, setIsOwner }) {
  const toggle = (id) =>
    setRoleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="space-y-5">
      {me.isOwner && (
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${
            isOwner ? "border-[#14130F] bg-slate-50" : "border-slate-200 hover:border-slate-400"
          }`}
        >
          <input
            type="checkbox"
            checked={isOwner}
            onChange={(e) => setIsOwner(e.target.checked)}
            className={`mt-0.5 ${checkboxClass}`}
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">Store owner</span>
            <span className="block text-xs text-slate-500">
              Can do everything, including closing the store and managing other owners. Roles don't
              apply to owners.
            </span>
          </span>
        </label>
      )}

      {!me.isOwner && (
        <p className="text-xs text-slate-500">
          You can only give roles whose permissions you have yourself. Greyed-out roles go beyond
          your own access.
        </p>
      )}

      {Object.entries(KIND_INFO).map(([kind, info]) => {
        const ofKind = roles.filter((r) => r.kind === kind);
        if (!ofKind.length) return null;

        return (
          <fieldset key={kind} disabled={isOwner}>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {info.label}
            </legend>
            <div className="space-y-2">
              {ofKind.map((role) => {
                const allowed = withinMyAccess(me, role.permissions);
                const checked = roleIds.includes(role.id);

                return (
                  <label
                    key={role.id}
                    title={
                      allowed
                        ? undefined
                        : "This role has permissions you don't have, so you can't give it."
                    }
                    className={`flex items-start gap-3 rounded-xl border p-3 ${
                      checked && !isOwner ? "border-[#14130F] bg-slate-50" : "border-slate-200"
                    } ${!allowed || isOwner ? "opacity-50" : "cursor-pointer hover:border-slate-400"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!allowed}
                      onChange={() => toggle(role.id)}
                      className={`mt-0.5 ${checkboxClass}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{role.name}</span>
                      <span className="block text-xs text-slate-500">
                        {role.description || `${role.permissions.length} permissions`}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

function AddUserForm({ me, roles, onAdded, onCancel }) {
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await apiPost("/api/v1/members/", {
      email: email.trim(),
      roleIds,
      ...(me.isOwner ? { isOwner } : {}),
    });
    setSaving(false);

    if (!res.ok) {
      setError(formMessage(res, "Couldn't add this user."));
      return;
    }
    onAdded(res.data);
  };

  return (
    <form onSubmit={submit}>
      <div className="space-y-5 px-6 py-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email address</span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={`${inputClass} w-full`}
          />
        </label>
        <RolePicker
          me={me}
          roles={roles}
          roleIds={roleIds}
          setRoleIds={setRoleIds}
          isOwner={isOwner}
          setIsOwner={setIsOwner}
        />
        <ErrorNote>{error}</ErrorNote>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button type="submit" disabled={saving || !email.trim()} className={primaryButton}>
          {saving ? "Adding…" : "Add user"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Roles                                                                */
/* ------------------------------------------------------------------ */

const NEW = "new";

const ROLE_TABS = [
  { id: "all", label: "All" },
  { id: "system", label: "System" },
  { id: "predefined", label: "Predefined" },
  { id: "custom", label: "Custom" },
];

const KIND_LABEL = { system: "System", predefined: "Predefined", custom: "Custom" };

export function RolesSettings() {
  const me = useMyAccess();
  const canManageRoles = can(me.session, "roles.manage");

  const [roles, setRoles] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);

  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([apiGet("/api/v1/roles/"), apiGet("/api/v1/roles/permissions/")]).then(([r, p]) => {
      if (r.ok) setRoles(r.data);
      else setError(r.error);
      if (p.ok) setGroups(p.data);
    });
  }, []);

  const withKey = useMemo(() => (roles || []).map((r) => ({ ...r, sortName: r.name })), [roles]);

  const counts = useMemo(
    () => ({
      all: withKey.length,
      system: withKey.filter((r) => r.kind === "system").length,
      predefined: withKey.filter((r) => r.kind === "predefined").length,
      custom: withKey.filter((r) => r.kind === "custom").length,
    }),
    [withKey]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withKey
      .filter(
        (r) =>
          (tab === "all" || r.kind === tab) &&
          (!q || `${r.name} ${r.description || ""} ${KIND_LABEL[r.kind]}`.toLowerCase().includes(q))
      )
      .sort(sortByName(sortDir));
  }, [withKey, tab, query, sortDir]);

  const deletable = (r) => canManageRoles && r.editable && withinMyAccess(me, r.permissions);
  const selectableRows = visible.filter(deletable);
  const selectedRows = visible.filter((r) => selected.has(r.id));
  const allTicked = selectableRows.length > 0 && selectableRows.every((r) => selected.has(r.id));

  const toggleOne = (id) =>
    setSelected((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saved = (role, created) => {
    setRoles((list) =>
      created ? [...list, role] : list.map((r) => (r.id === role.id ? role : r))
    );
    setOpenId(null);
    if (me.roleNames.includes(role.name)) refreshMyStores();
  };

  const deleted = (role) => {
    setRoles((list) => list.filter((r) => r.id !== role.id));
    setOpenId(null);
    if (me.roleNames.includes(role.name)) refreshMyStores();
  };

  const deleteSelected = async () => {
    const people = selectedRows.reduce((n, r) => n + r.memberCount, 0);
    if (
      !window.confirm(
        `Delete ${selectedRows.length} ${selectedRows.length === 1 ? "role" : "roles"}?${
          people
            ? ` ${people} ${people === 1 ? "person loses" : "people lose"} their permissions.`
            : ""
        }`
      )
    )
      return;

    setBusy(true);
    setError("");
    for (const role of selectedRows) {
      const res = await apiDelete(`/api/v1/roles/${role.id}/`);
      if (res.ok) deleted(role);
      else setError(res.error);
    }
    setBusy(false);
    setSelected(new Set());
  };

  if (error && !roles) return <ErrorNote>{error}</ErrorNote>;

  const open = openId === NEW ? null : (roles || []).find((r) => r.id === openId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-slate-500">
          A role is a bundle of permissions. Give a person one or more roles to control what they
          can see and change in the admin.
        </p>
        {canManageRoles && (
          <button type="button" onClick={() => setOpenId(NEW)} className={primaryButton}>
            Add role
          </button>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ListToolbar
          tabs={ROLE_TABS.map((t) => ({ ...t, count: counts[t.id] }))}
          tab={tab}
          onTab={(id) => {
            setTab(id);
            setSelected(new Set());
          }}
          query={query}
          onQuery={setQuery}
          searchLabel="Search roles"
          sortDir={sortDir}
          onSort={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />

        <div role="table" aria-label="Roles">
          <div
            role="row"
            className="grid grid-cols-[28px_minmax(0,2.4fr)_120px_100px_70px_20px] items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-500"
          >
            <input
              type="checkbox"
              aria-label="Select all"
              className={checkboxClass}
              checked={allTicked}
              disabled={!selectableRows.length}
              onChange={() =>
                setSelected(allTicked ? new Set() : new Set(selectableRows.map((r) => r.id)))
              }
            />
            {selectedRows.length ? (
              <div className="col-span-5">
                <BulkBar
                  count={selectedRows.length}
                  noun="role"
                  onClear={() => setSelected(new Set())}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={deleteSelected}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </BulkBar>
              </div>
            ) : (
              <>
                <span>Name</span>
                <span>Category</span>
                <span>Permissions</span>
                <span className="text-right">Users</span>
                <span />
              </>
            )}
          </div>

          {!roles && <EmptyRows>Loading…</EmptyRows>}
          {roles && !visible.length && (
            <EmptyRows>
              {query ? `No roles match "${query}".` : "No roles in this view yet."}
            </EmptyRows>
          )}

          {visible.map((role) => (
            <div
              key={role.id}
              role="row"
              onClick={() => setOpenId(role.id)}
              className={`grid cursor-pointer grid-cols-[28px_minmax(0,2.4fr)_120px_100px_70px_20px] items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 hover:bg-slate-50 ${
                selected.has(role.id) ? "bg-slate-50" : ""
              }`}
            >
              <input
                type="checkbox"
                aria-label={`Select ${role.name}`}
                className={checkboxClass}
                checked={selected.has(role.id)}
                disabled={!deletable(role)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleOne(role.id)}
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">
                  {role.name}
                  {me.roleNames.includes(role.name) && (
                    <span className="ml-2 text-xs font-normal text-slate-500">yours</span>
                  )}
                </p>
                {role.description && (
                  <p className="truncate text-xs text-slate-500">{role.description}</p>
                )}
              </div>
              <span className="flex items-center gap-1.5 text-slate-600">
                {role.kind === "system" && (
                  <Icon name="lock" className="h-3.5 w-3.5 text-slate-400" />
                )}
                {KIND_LABEL[role.kind]}
              </span>
              <span className="text-slate-600">{role.permissions.length}</span>
              <span className="text-right tabular-nums text-slate-600">{role.memberCount}</span>
              <Icon name="chevron" className="h-4 w-4 text-slate-300" />
            </div>
          ))}
        </div>
      </section>

      {(open || openId === NEW) && (
        <RoleDrawer
          key={openId}
          me={me}
          role={open}
          groups={groups}
          canManageRoles={canManageRoles}
          onClose={() => setOpenId(null)}
          onSaved={saved}
          onDeleted={deleted}
        />
      )}
    </div>
  );
}

function RoleDrawer({ me, role, groups, canManageRoles, onClose, onSaved, onDeleted }) {
  const isNew = !role;
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [permissions, setPermissions] = useState(() => new Set(role?.permissions || []));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Why the role can't be edited, if it can't
  const lockedReason = !canManageRoles
    ? 'You need the "Create, edit and delete roles" permission to change roles.'
    : role && !role.editable
      ? "System roles are managed by the platform and can't be changed."
      : role && !withinMyAccess(me, role.permissions)
        ? "This role has permissions you don't have, so you can't change it."
        : "";
  const locked = Boolean(lockedReason);
  const mayGrant = (key) => me.isOwner || me.permissions.has(key);

  const toggle = (key) =>
    setPermissions((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleGroup = (group, on) =>
    setPermissions((set) => {
      const next = new Set(set);
      group.permissions.forEach(({ key }) => {
        if (!mayGrant(key)) return;
        if (on) next.add(key);
        else next.delete(key);
      });
      return next;
    });

  const save = async () => {
    setError("");
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      permissions: [...permissions],
    };
    const res = isNew
      ? await apiPost("/api/v1/roles/", body)
      : await apiPatch(`/api/v1/roles/${role.id}/`, body);
    setSaving(false);

    if (!res.ok) {
      setError(formMessage(res, "Couldn't save this role."));
      return;
    }
    onSaved(res.data, isNew);
  };

  const remove = async () => {
    const users = role.memberCount
      ? ` ${role.memberCount} ${role.memberCount === 1 ? "person loses" : "people lose"} its permissions.`
      : "";
    if (!window.confirm(`Delete the role "${role.name}"?${users}`)) return;

    setSaving(true);
    const res = await apiDelete(`/api/v1/roles/${role.id}/`);
    setSaving(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDeleted(role);
  };

  const kindLabel = role ? `${KIND_LABEL[role.kind]} role` : "Custom role";

  return (
    <Drawer
      wide
      title={isNew ? "Add role" : role.name}
      subtitle={`${kindLabel} · ${permissions.size} permission${permissions.size === 1 ? "" : "s"}${
        !isNew ? ` · ${role.memberCount} ${role.memberCount === 1 ? "user" : "users"}` : ""
      }`}
      onClose={onClose}
      footer={
        locked ? (
          <button type="button" onClick={onClose} className={`${secondaryButton} ml-auto`}>
            Close
          </button>
        ) : (
          <>
            {isNew ? (
              <button type="button" onClick={onClose} className={secondaryButton}>
                Cancel
              </button>
            ) : (
              <button type="button" disabled={saving} onClick={remove} className={dangerButton}>
                Delete role
              </button>
            )}
            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={save}
              className={primaryButton}
            >
              {saving ? "Saving…" : isNew ? "Create role" : "Save role"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {locked && (
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            {lockedReason}
          </p>
        )}

        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={locked}
              placeholder="e.g. Warehouse lead"
              className={`${inputClass} w-full disabled:bg-slate-50`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={locked}
              placeholder="What this role is for"
              className={`${inputClass} w-full disabled:bg-slate-50`}
            />
          </label>
        </div>

        {permissions.size === 0 && (
          <p className="text-xs text-amber-700">
            With no permissions, people who only have this role can't do anything.
          </p>
        )}

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {groups.map((group) => {
            const keys = group.permissions.map((p) => p.key);
            const on = keys.filter((k) => permissions.has(k)).length;

            return (
              <fieldset key={group.area} className="p-4" disabled={locked}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={on === keys.length}
                      ref={(el) => {
                        if (el) el.indeterminate = on > 0 && on < keys.length;
                      }}
                      onChange={(e) => toggleGroup(group, e.target.checked)}
                    />
                    {group.label}
                  </label>
                  <span className="text-xs text-slate-400">
                    {on} of {keys.length}
                  </span>
                </div>
                <div className="grid gap-1.5 pl-6 sm:grid-cols-2">
                  {group.permissions.map(({ key, label }) => (
                    <label
                      key={key}
                      title={
                        mayGrant(key)
                          ? undefined
                          : "You don't have this permission, so you can't give it."
                      }
                      className={`flex items-start gap-2 text-sm ${mayGrant(key) ? "text-slate-700" : "text-slate-400"}`}
                    >
                      <input
                        type="checkbox"
                        checked={permissions.has(key)}
                        disabled={!mayGrant(key)}
                        onChange={() => toggle(key)}
                        className={`mt-0.5 ${checkboxClass}`}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>

        <ErrorNote>{error}</ErrorNote>
      </div>
    </Drawer>
  );
}
