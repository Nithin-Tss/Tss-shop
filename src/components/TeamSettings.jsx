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
  "rounded-lg bg-[#161c2c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#252e45] disabled:opacity-60";
const secondaryButton =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const dangerButton =
  "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60";

function Section({ title, description, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
        <div>
          <h2 className="text-base font-semibold text-[#161c2c]">{title}</h2>
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
    dark: "bg-[#161c2c] text-white",
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
/* Users                                                                */
/* ------------------------------------------------------------------ */

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
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [m, r] = await Promise.all([apiGet("/api/v1/members/"), apiGet("/api/v1/roles/")]);
    if (m.ok) setMembers(m.data);
    else setLoadError(m.error);
    if (r.ok) setRoles(r.data);
    const inv = await apiGet("/api/v1/members/invitations/");
    if (inv.ok) setInvitations(inv.data);
  }, []);

  const loadActivity = useCallback(async () => {
    const res = await apiGet("/api/v1/members/activity/");
    if (res.ok) setActivity(res.data);
  }, []);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  useEffect(() => {
    if (canManage) loadActivity();
  }, [canManage, loadActivity]);

  const withdraw = async (invitation) => {
    setRowError("");
    const res = await apiDelete(`/api/v1/members/invitations/${invitation.invitationId}/`);
    if (!res.ok) {
      setRowError(res.error);
      return;
    }
    setInvitations((list) => list.filter((i) => i.invitationId !== invitation.invitationId));
    loadActivity();
  };

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

  // Owners are changed only by owners; others only if all their access is within the caller's
  const mayChange = (member) =>
    canManage && (member.isOwner ? me.isOwner : withinMyAccess(me, member.permissions));

  const saveAccess = async (member, body) => {
    setRowError("");
    setBusyId(member.membershipId);
    const res = await apiPatch(`/api/v1/members/${member.membershipId}/`, body);
    setBusyId(null);

    if (!res.ok) {
      setRowError(formMessage(res, "Couldn't change this person's access."));
      return;
    }
    setMembers((list) => list.map((m) => (m.membershipId === member.membershipId ? res.data : m)));
    setEditingId(null);
    if (member.userId === me.userId) refreshMyStores();
  };

  const remove = async (member) => {
    const who = member.userId === me.userId ? "yourself" : member.email;
    if (!window.confirm(`Remove ${who} from this store? They will lose access straight away.`))
      return;

    setRowError("");
    setBusyId(member.membershipId);
    const res = await apiDelete(`/api/v1/members/${member.membershipId}/`);
    setBusyId(null);

    if (!res.ok) {
      setRowError(res.error);
      return;
    }
    setMembers((list) => list.filter((m) => m.membershipId !== member.membershipId));
    if (member.userId === me.userId) refreshMyStores();
  };

  return (
    <div className="space-y-5">
      {canManage && (
        <AddUserForm
          me={me}
          roles={roles}
          onAdded={(result) => {
            if (result.invited) setInvitations((list) => [result, ...list]);
            else setMembers((list) => [...(list || []), result]);
            loadActivity();
          }}
        />
      )}

      {invitations.length > 0 && (
        <Section
          title={`Pending invitations (${invitations.length})`}
          description="These people don't have an account yet. They get access once they sign up and verify this email address."
        >
          <ul className="divide-y divide-slate-200 p-5">
            {invitations.map((invitation) => (
              <li
                key={invitation.invitationId}
                className="flex flex-wrap items-center gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {invitation.email}
                </span>
                {invitation.isOwner && <Chip tone="dark">Store owner</Chip>}
                {invitation.roles.map((role) => (
                  <Chip key={role.id}>{role.name}</Chip>
                ))}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => withdraw(invitation)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={`Users${members ? ` (${members.length})` : ""}`}
        description="Each person gets every permission of every role they have. Store owners can do everything."
      >
        <div className="space-y-3 p-5">
          <ErrorNote>{loadError || rowError}</ErrorNote>

          {members === null && !loadError && <p className="text-sm text-slate-500">Loading…</p>}

          {members && (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
              {members.map((member) => {
                const name =
                  `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.email;
                const busy = busyId === member.membershipId;
                const editing = editingId === member.membershipId;

                return (
                  <li key={member.membershipId} className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {name.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {name}
                          {member.userId === me.userId && (
                            <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>
                          )}
                        </p>
                        <p className="truncate text-sm text-slate-500">{member.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {member.isOwner && <Chip tone="dark">Store owner</Chip>}
                          {member.roles.map((role) => (
                            <Chip key={role.id}>{role.name}</Chip>
                          ))}
                          {!member.isOwner && !member.roles.length && (
                            <Chip tone="amber">No roles: no access</Chip>
                          )}
                        </div>
                      </div>

                      {mayChange(member) && !editing && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditingId(member.membershipId)}
                            className={secondaryButton}
                          >
                            Edit access
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(member)}
                            className={dangerButton}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {editing && (
                      <AccessEditor
                        me={me}
                        roles={roles}
                        initialRoleIds={member.roles.map((r) => r.id)}
                        initialOwner={member.isOwner}
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSubmit={({ roleIds, isOwner }) =>
                          saveAccess(member, me.isOwner ? { roleIds, isOwner } : { roleIds })
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>

      {canManage && activity && activity.length > 0 && (
        <Section title="Recent changes" description="Who changed roles or access, newest first.">
          <ul className="divide-y divide-slate-200 p-5 text-sm">
            {activity.slice(0, 20).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 py-2 first:pt-0 last:pb-0"
              >
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
    </div>
  );
}

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

// Role checkboxes grouped by kind, plus "Store owner" for owners
function RolePicker({ me, roles, roleIds, setRoleIds, isOwner, setIsOwner }) {
  const toggle = (id) =>
    setRoleIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <div className="space-y-4">
      {me.isOwner && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
          <input
            type="checkbox"
            checked={isOwner}
            onChange={(e) => setIsOwner(e.target.checked)}
            className="mt-0.5"
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
            <div className="grid gap-2 sm:grid-cols-2">
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
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      checked ? "border-[#161c2c] bg-slate-50" : "border-slate-200"
                    } ${!allowed || isOwner ? "opacity-50" : "cursor-pointer hover:border-slate-400"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!allowed}
                      onChange={() => toggle(role.id)}
                      className="mt-0.5"
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

function AccessEditor({ me, roles, initialRoleIds, initialOwner, busy, onSubmit, onCancel }) {
  const [roleIds, setRoleIds] = useState(initialRoleIds);
  const [isOwner, setIsOwner] = useState(initialOwner);

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <RolePicker
        me={me}
        roles={roles}
        roleIds={roleIds}
        setRoleIds={setRoleIds}
        isOwner={isOwner}
        setIsOwner={setIsOwner}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmit({ roleIds, isOwner })}
          className={primaryButton}
        >
          {busy ? "Saving…" : "Save access"}
        </button>
      </div>
    </div>
  );
}

function AddUserForm({ me, roles, onAdded }) {
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
    setEmail("");
    setRoleIds([]);
    setIsOwner(false);
  };

  return (
    <Section
      title="Add a user"
      description="Give someone access to this store with one or more roles. If they don't have an account yet, they're invited by email and get access once they sign up and verify it."
    >
      <form onSubmit={submit} className="space-y-4 p-5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className={`${inputClass} w-full`}
        />
        <RolePicker
          me={me}
          roles={roles}
          roleIds={roleIds}
          setRoleIds={setRoleIds}
          isOwner={isOwner}
          setIsOwner={setIsOwner}
        />
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Adding…" : "Add user"}
          </button>
        </div>
      </form>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Roles                                                                */
/* ------------------------------------------------------------------ */

const NEW = "new";

export function RolesSettings() {
  const me = useMyAccess();
  const canManageRoles = can(me.session, "roles.manage");

  const [roles, setRoles] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    Promise.all([apiGet("/api/v1/roles/"), apiGet("/api/v1/roles/permissions/")]).then(([r, p]) => {
      if (r.ok) {
        setRoles(r.data);
        // Start on one of the user's own roles, else the first
        const mine = r.data.find((role) => me.roleNames.includes(role.name));
        setSelectedId((mine || r.data[0])?.id ?? null);
      } else {
        setError(r.error);
      }
      if (p.ok) setGroups(p.data);
    });
    // Loaded once; the user's roles only pick the starting selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!roles) return <p className="text-sm text-slate-500">Loading…</p>;

  const selected = selectedId === NEW ? null : roles.find((r) => r.id === selectedId);

  const saved = (role, created) => {
    setRoles((list) =>
      created ? [...list, role] : list.map((r) => (r.id === role.id ? role : r))
    );
    setSelectedId(role.id);
    if (me.roleNames.includes(role.name)) refreshMyStores();
  };

  const deleted = (role) => {
    setRoles((list) => list.filter((r) => r.id !== role.id));
    setSelectedId(roles.find((r) => r.id !== role.id)?.id ?? null);
    if (me.roleNames.includes(role.name)) refreshMyStores();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Section
        title="Roles"
        description="Pick a role to see its permissions."
        action={
          canManageRoles && (
            <button
              type="button"
              onClick={() => setSelectedId(NEW)}
              className={`${primaryButton} shrink-0 px-3 py-2`}
            >
              Create role
            </button>
          )
        }
      >
        <div className="space-y-5 p-4">
          {Object.entries(KIND_INFO).map(([kind, info]) => {
            const ofKind = roles.filter((r) => r.kind === kind);

            return (
              <div key={kind}>
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {info.label}
                </p>
                <p className="mb-2 px-1 text-xs text-slate-400">{info.note}</p>
                {!ofKind.length && <p className="px-1 text-sm text-slate-500">None yet.</p>}
                <div className="space-y-1">
                  {ofKind.map((role) => {
                    const active = role.id === selectedId;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedId(role.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          active ? "bg-[#161c2c] text-white" : "text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">
                          {role.name}
                          {me.roleNames.includes(role.name) && (
                            <span
                              className={`ml-2 text-xs font-normal ${active ? "text-slate-300" : "text-slate-500"}`}
                            >
                              yours
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 text-xs ${active ? "text-slate-300" : "text-slate-400"}`}
                        >
                          {role.memberCount} {role.memberCount === 1 ? "user" : "users"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {(selected || selectedId === NEW) && (
        <RoleEditor
          key={selectedId}
          me={me}
          role={selected}
          groups={groups}
          canManageRoles={canManageRoles}
          onSaved={saved}
          onDeleted={deleted}
          onCancelNew={() => setSelectedId(roles[0]?.id ?? null)}
        />
      )}
    </div>
  );
}

function RoleEditor({ me, role, groups, canManageRoles, onSaved, onDeleted, onCancelNew }) {
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

  const kindLabel = role
    ? { system: "System role", predefined: "Predefined role", custom: "Custom role" }[role.kind]
    : "Custom role";

  return (
    <Section
      title={isNew ? "Create role" : role.name}
      description={`${kindLabel} · ${permissions.size} permission${permissions.size === 1 ? "" : "s"}${
        permissions.size === 0 ? " · people with only this role can't do anything" : ""
      }`}
    >
      <div className="space-y-5 p-5">
        {locked && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{lockedReason}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
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
                        className="mt-0.5"
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

        {!locked && (
          <div className="flex justify-between gap-2">
            {isNew ? (
              <button type="button" onClick={onCancelNew} className={secondaryButton}>
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
          </div>
        )}
      </div>
    </Section>
  );
}
