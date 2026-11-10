import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { getActiveStore, useSession } from "@/lib/auth";

const KIND_GROUPS = [
  ["storefront", "Online Store"],
  ["account", "Customer Account"],
];

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function IconButton({ title, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 hover:bg-slate-100 ${danger ? "text-red-600" : "text-slate-600"}`}
    >
      <svg {...iconProps}>{children}</svg>
    </button>
  );
}

function StatusBadge({ status }) {
  const ok = status === "connected";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        ok ? "bg-[rgba(24,24,27,0.22)] text-[#111827]" : "bg-[rgba(234,88,12,0.08)] text-[#B08D57]"
      }`}
    >
      {ok ? "Connected" : "Invalid DNS"}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl ${wide ? "max-w-xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <div className="mt-3 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

const SECOND_LEVEL = new Set([
  "com.au",
  "net.au",
  "org.au",
  "id.au",
  "co.nz",
  "net.nz",
  "org.nz",
  "co.uk",
  "org.uk",
  "me.uk",
  "co.in",
  "co.za",
  "com.sg",
  "com.br",
]);

// Splits "shop.example.com.au" into { root: "example.com.au", sub: "shop" }.
function splitHost(host) {
  const parts = (host || "").toLowerCase().split(".").filter(Boolean);
  const tail = parts.slice(-2).join(".");
  const rootLen = SECOND_LEVEL.has(tail) ? 3 : 2;
  return {
    root: parts.slice(-rootLen).join("."),
    sub: parts.slice(0, Math.max(parts.length - rootLen, 0)).join("."),
  };
}

const PROVIDERS = {
  godaddy: {
    label: "GoDaddy",
    steps: [
      "Sign in to GoDaddy and open My Products → your domain → DNS (Manage DNS).",
      "Click Add New Record and choose the type shown below.",
      "Enter the Name and Value exactly as shown, set TTL to 1 Hour (or default), then Save.",
      "Delete any existing A or CNAME record with the same Name (e.g. GoDaddy's “Parked” A record).",
    ],
    root: "In the Name field use @ for the root domain.",
  },
  ventraip: {
    label: "VentraIP",
    steps: [
      "Sign in to the VentraIP client area → Services → your domain → Manage → DNS Management.",
      "Click Add Record under DNS Records.",
      "Pick the type, then enter the Hostname and Content/Value exactly as shown. Leave TTL at the default.",
      "Remove any existing A or CNAME record with the same hostname, then Save.",
    ],
    root: "Leave the Hostname blank (or use @) for the root domain.",
  },
  namecheap: {
    label: "Namecheap",
    steps: [
      "Sign in to Namecheap → Domain List → Manage → Advanced DNS.",
      "Click Add New Record and choose the type shown below.",
      "Enter Host and Value exactly as shown, keep TTL on Automatic, and save with the ✓.",
      "Remove conflicting URL Redirect, A or CNAME records for the same host.",
    ],
    root: "Use @ in the Host field for the root domain.",
  },
  cloudflare: {
    label: "Cloudflare",
    steps: [
      "Open Cloudflare → your domain → DNS → Records → Add record.",
      "Choose the type shown below and enter Name and Target/Content exactly as shown.",
      "Set the proxy status to DNS only (grey cloud) so we can issue the SSL certificate, then Save.",
    ],
    root: "Use @ as the Name for the root domain. Cloudflare flattens a root CNAME automatically.",
  },
  other: {
    label: "Other provider",
    steps: [
      "Open the DNS management page at the company where you registered the domain.",
      "Add a new record with the type, name and value shown below.",
      "Remove any existing record with the same name, save, and allow time for DNS to update.",
    ],
    root: "For the root domain, use @ (or leave blank) as the name.",
  },
};

function dnsRecords(host, target) {
  const { sub } = splitHost(host);
  const value = target || "your platform host";
  if (sub) return [{ type: "CNAME", name: sub, value }];
  return [
    {
      type: "CNAME / ALIAS / ANAME",
      name: "@",
      value,
      note:
        "Use CNAME if your provider supports root flattening (Cloudflare), otherwise ALIAS/ANAME. If neither exists, add an A record pointing to the IP address of " +
        value +
        ".",
    },
    { type: "CNAME", name: "www", value },
  ];
}

function DnsInstructions({ host, target }) {
  const [provider, setProvider] = useState("godaddy");
  const info = PROVIDERS[provider];
  const records = dnsRecords(host || "shop.example.com", target);
  const isRoot = !splitHost(host || "shop.example.com").sub;
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="block text-xs font-medium text-slate-600">
        Where is your domain registered?
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {Object.entries(PROVIDERS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="pr-2">Type</th>
              <th className="pr-2">Name / Host</th>
              <th>Value / Points to</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {records.map((r) => (
              <tr key={r.name} className="border-t border-slate-200 align-top">
                <td className="py-1.5 pr-2 font-medium">{r.type}</td>
                <td className="py-1.5 pr-2 font-mono">{r.name}</td>
                <td className="py-1.5 font-mono break-all">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isRoot && <p className="mt-2 text-xs text-slate-600">{info.root}</p>}
      <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-slate-600">
        {info.steps.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-500">
        DNS changes usually apply within minutes but can take up to 48 hours. The status turns to
        Connected automatically once the records resolve.
      </p>
    </div>
  );
}

export default function DomainsSettings() {
  const session = useSession();
  const store = getActiveStore(session);
  const base = `/api/v1/stores/${store?.storeId}/domains/`;

  const [data, setData] = useState({ target: "", domains: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // "connect" | "transfer" | "buy"
  const [host, setHost] = useState("");
  const [kind, setKind] = useState("storefront");
  const [busy, setBusy] = useState(false);
  const [dnsFor, setDnsFor] = useState(null);

  const storeId = store?.storeId;

  useEffect(() => {
    if (!storeId) return undefined;
    let cancelled = false;
    apiGet(base)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Could not load domains.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [base, storeId]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      setData(await fn());
      return true;
    } catch (e) {
      setError(e.message || "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const connect = async (e) => {
    e.preventDefault();
    if (await run(() => apiPost(base, { host, kind }))) {
      setModal(null);
      setHost("");
    }
  };

  const remove = (d) => {
    if (window.confirm(`Remove ${d.host} from this store?`))
      run(() => apiDelete(`${base}${d.id}/`));
  };

  const scheme = window.location.protocol === "http:" ? "http" : "https";
  const inputCls =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-600";

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {[
          ["connect", "Connect existing"],
          ["transfer", "Transfer domain"],
          ["buy", "Buy new domain"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setModal(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              key === "buy"
                ? "bg-ink text-white hover:bg-ink"
                : "border border-slate-200 bg-white text-ink hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-600">
          <span>Domain</span>
          <span>Status</span>
        </div>
        {loading && <p className="px-3 py-4 text-sm text-slate-500">Loading…</p>}
        {KIND_GROUPS.map(([k, label]) => {
          const rows = data.domains.filter((d) => d.kind === k);
          if (!rows.length && k === "account") return null;
          return (
            <div key={k}>
              <div className="bg-slate-50 px-3 py-2 text-sm font-medium text-ink">{label}</div>
              {!rows.length && !loading && (
                <p className="px-4 py-3 text-sm text-slate-500">No domains connected.</p>
              )}
              {rows.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border-t border-slate-100 py-2 pl-4 pr-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-ink">
                    <span>{d.host}</span>
                    {d.primary && (
                      <span className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={d.status} />
                    {d.status !== "connected" && (
                      <IconButton title="DNS setup" onClick={() => setDnsFor(d)}>
                        <path d="M12 16v-4M12 8h.01" />
                        <circle cx="12" cy="12" r="10" />
                      </IconButton>
                    )}
                    <IconButton
                      title="Visit"
                      onClick={() => window.open(`${scheme}://${d.host}`, "_blank", "noopener")}
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </IconButton>
                    {k === "storefront" && !d.primary && (
                      <IconButton
                        title="Make primary"
                        onClick={() => !busy && run(() => apiPost(`${base}${d.id}/`, {}))}
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
                      </IconButton>
                    )}
                    {!d.primary && (
                      <IconButton title="Remove" danger onClick={() => remove(d)}>
                        <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5M14 11v5" />
                      </IconButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      {modal === "connect" && (
        <Modal wide title="Connect existing domain" onClose={() => setModal(null)}>
          <form onSubmit={connect}>
            <label className="block">
              Domain
              <input
                autoFocus
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="shop.example.com"
                className={inputCls}
              />
            </label>
            <label className="mt-3 block">
              Use for
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                <option value="storefront">Online Store</option>
                <option value="account">Customer Account</option>
              </select>
            </label>
            <p className="mt-3">
              Add these DNS records at your domain provider. It shows as Connected once DNS
              resolves.
            </p>
            <DnsInstructions host={host.trim()} target={data.target} />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !host.trim()}
                className="rounded-lg bg-orange-600 px-3 py-1.5 font-medium text-white disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </form>
        </Modal>
      )}

      {dnsFor && (
        <Modal wide title={`DNS setup for ${dnsFor.host}`} onClose={() => setDnsFor(null)}>
          <p>Add these records at your domain provider to connect this domain.</p>
          <DnsInstructions host={dnsFor.host} target={data.target} />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setDnsFor(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {(modal === "transfer" || modal === "buy") && (
        <Modal
          title={modal === "buy" ? "Buy new domain" : "Transfer domain"}
          onClose={() => setModal(null)}
        >
          <p>
            {modal === "buy"
              ? "Buying domains isn't built in yet. Buy one from any registrar (GoDaddy, Namecheap, Cloudflare…), then use Connect existing."
              : "Transferring a domain to this platform isn't built in yet. Keep it at your current registrar and use Connect existing to point it here."}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setModal("connect")}
              className="rounded-lg bg-orange-600 px-3 py-1.5 font-medium text-white"
            >
              Connect existing
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
