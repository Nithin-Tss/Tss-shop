import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { apiGet, apiRequest } from "@/lib/api";
import {
  addStore,
  ONBOARDING_PATH,
  setActiveStore,
  setStores,
  signOut,
  useSession,
} from "@/lib/auth";

const DEFAULT_STORE_NAME = "My Store";
const HOME_PATH = "/admin/online-store/home";

function StoreIllustration() {
  return (
    <svg width="136" height="144" viewBox="0 0 136 144" fill="none" aria-hidden="true">
      <circle cx="68" cy="76" r="68" fill="#ececec" />
      <path d="M30 56h76l8 66a8 8 0 0 1-8 9H30a8 8 0 0 1-8-9l8-66Z" fill="#0a6b4f" />
      <path d="M36 56h64l6 40H30l6-40Z" fill="#168a63" />
      <path d="M26 104h84v8H26z" fill="#168a63" />
      <path
        d="M50 56V40a12 12 0 0 1 24 0v16M68 56V40a12 12 0 0 1 24 0v16"
        stroke="#0a6b4f"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="86" y="70" width="18" height="30" rx="4" fill="#fff" />
      <circle cx="95" cy="78" r="2" fill="#0a6b4f" />
    </svg>
  );
}

const primaryButton =
  "h-9 rounded-lg border border-white/10 bg-[#303030] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#3a3a3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60";

export default function StoreSelectPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [naming, setNaming] = useState(false);
  const [storeName, setStoreName] = useState("");

  const token = session?.token;
  const stores = session?.stores || [];
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/admin") && !next.startsWith("//") ? next : HOME_PATH;
  const firstTime = stores.length === 0;

  // The session's store list is from sign-in; re-read it so stores added or removed since show up
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    apiGet("/api/v1/stores/").then((res) => {
      if (!cancelled && res.ok && Array.isArray(res.data)) setStores(res.data);
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/auth/signin" replace />;

  const createStore = async (name, nextPath) => {
    if (busy) return;

    setBusy(name === DEFAULT_STORE_NAME ? "default" : "create");
    setError("");

    try {
      const store = await apiRequest("/api/v1/stores/", {
        method: "POST",
        body: { storeName: name },
      });
      addStore({ ...store, role: "owner" });
      navigate(nextPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const openStore = (storeId) => {
    setActiveStore(storeId);
    navigate(safeNext);
  };

  const submitName = (event) => {
    event.preventDefault();
    const name = storeName.trim();

    if (!name) {
      setError("Enter a store name.");
      return;
    }

    // A new store carries on to the goals and theme steps
    createStore(name, ONBOARDING_PATH);
  };

  const heading = firstTime ? "Create your first online store" : "Choose a store";
  const subheading = firstTime
    ? "Experiment with different designs and products until you learn what works"
    : "Open a store you have access to, or create a new one";

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_center,#0d1a1a_0%,#050b0b_70%)] text-[#e3e3e3]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="text-xl font-bold tracking-tight text-white">STORE</span>

        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b5b5b5] text-[11px] font-bold text-[#303030]">
            {(session.name || "?")
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("")}
          </span>
          <span className="hidden sm:inline">{session.name}</span>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/auth/signin", { replace: true });
            }}
            className="text-[#9a9a9a] hover:text-white hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[480px] flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-16">
        {firstTime && <StoreIllustration />}

        <h1 className={`text-[15px] font-bold text-white ${firstTime ? "mt-10" : "mt-2"}`}>
          {heading}
        </h1>
        <p className="mt-1 max-w-[360px] text-[13px] leading-relaxed text-[#9a9a9a]">
          {subheading}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 w-full rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {/* Stores the user has access to */}
        {!firstTime && (
          <ul className="mt-6 w-full space-y-2 text-left">
            {stores.map((store) => (
              <li
                key={store.storeId}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {store.storeName}
                  </span>
                  <span className="block text-xs capitalize text-[#9a9a9a]">
                    {store.role || "member"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => openStore(store.storeId)}
                  className={primaryButton}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Create a store */}
        {naming ? (
          <form onSubmit={submitName} className="mt-6 flex w-full flex-col gap-3 text-left">
            <label className="text-xs font-medium text-[#c5c5c5]" htmlFor="store-name">
              Store name
            </label>
            <input
              id="store-name"
              autoFocus
              value={storeName}
              onChange={(event) => {
                setStoreName(event.target.value);
                setError("");
              }}
              maxLength={200}
              placeholder="e.g. Asha's Boutique"
              className="h-10 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 text-sm text-white outline-none placeholder:text-[#6f6f6f] focus:border-white/40"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={Boolean(busy)} className={primaryButton}>
                {busy === "create" ? "Creating..." : "Create store"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNaming(false);
                  setError("");
                }}
                className="h-9 rounded-lg px-4 text-[13px] font-medium text-[#9a9a9a] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setNaming(true)}
              disabled={Boolean(busy)}
              className={primaryButton}
            >
              Create store
            </button>

            {firstTime && (
              <button
                type="button"
                onClick={() => createStore(DEFAULT_STORE_NAME, HOME_PATH)}
                disabled={Boolean(busy)}
                className="h-9 rounded-lg border border-white/15 px-4 text-[13px] font-semibold text-[#e3e3e3] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "default" ? "Opening..." : `Open ${DEFAULT_STORE_NAME}`}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
