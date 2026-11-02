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
      <circle cx="68" cy="76" r="68" fill="#F3F1EC" />
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
  "h-10 rounded-md bg-[#14130F] px-5 text-sm font-medium text-white hover:bg-[#2A2925] disabled:cursor-not-allowed disabled:opacity-60";

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
    <main className="min-h-screen bg-[#FAF9F6] text-[#14130F]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="display text-3xl text-[#14130F]">Store</span>

        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7E4DC] text-[11px] font-medium text-[#14130F]">
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
            className="text-[#78746A] hover:text-[#14130F] hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[480px] flex-col items-center px-4 pb-16 pt-10 text-center sm:pt-16">
        {firstTime && <StoreIllustration />}

        <h1 className={`display text-5xl text-[#14130F] ${firstTime ? "mt-10" : "mt-2"}`}>
          {heading}
        </h1>
        <p className="mt-4 max-w-[360px] text-sm leading-relaxed text-[#5A5750]">{subheading}</p>

        {error && (
          <p
            role="alert"
            className="mt-4 w-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
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
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-5 py-4 shadow-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-[#14130F]">
                    {store.storeName}
                  </span>
                  <span className="block text-xs capitalize text-[#78746A]">
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
            <label className="text-xs font-medium text-[#5A5750]" htmlFor="store-name">
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
              className="h-11 w-full rounded-md border border-[#D4D0C5] bg-white px-3 text-sm text-[#14130F] outline-none placeholder:text-[#A29E92] focus:border-[#265C48]"
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
                className="h-10 rounded-md px-4 text-sm font-medium text-[#5A5750] hover:text-[#14130F]"
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
                className="h-10 rounded-md border border-[#D4D0C5] px-5 text-sm font-medium text-[#14130F] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
