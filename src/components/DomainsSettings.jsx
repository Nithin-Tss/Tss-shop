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
        ok ? "bg-[#AEE9A1] text-[#0C3B00]" : "bg-[#FED3D1] text-[#8E1F0B]"
      }`}
    >
      {ok ? "Connected" : "Invalid DNS"}
    </span>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[#14130F]">{title}</h3>
        <div className="mt-3 text-sm text-slate-600">{children}</div>
      </div>
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
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#14130F]";

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
                ? "bg-[#14130F] text-white hover:bg-[#1A1916]"
                : "border border-slate-200 bg-white text-[#14130F] hover:bg-slate-50"
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
              <div className="bg-slate-50 px-3 py-2 text-sm font-medium text-[#14130F]">
                {label}
              </div>
              {!rows.length && !loading && (
                <p className="px-4 py-3 text-sm text-slate-500">No domains connected.</p>
              )}
              {rows.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between border-t border-slate-100 py-2 pl-4 pr-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-[#14130F]">
                    <span>{d.host}</span>
                    {d.primary && (
                      <span className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={d.status} />
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
        <Modal title="Connect existing domain" onClose={() => setModal(null)}>
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
              At your DNS provider, point this domain to{" "}
              <strong>{data.target || "your platform host"}</strong> with a CNAME record. It shows
              as Connected once DNS resolves.
            </p>
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
                className="rounded-lg bg-[#14130F] px-3 py-1.5 font-medium text-white disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </form>
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
              className="rounded-lg bg-[#14130F] px-3 py-1.5 font-medium text-white"
            >
              Connect existing
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
