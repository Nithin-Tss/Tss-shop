import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { renderThemePage } from "@/lib/themeApi";

// The storefront page being shown lives in the address as ?p=/products/<id>?back=..., so every store
// link is a real history entry (the browser's Back button works) and the full path keeps its query.
// The theme is drawn in a sandboxed frame whose own history never grows, so the frame asks us to go back.
export function backTarget(currentPath, fallback) {
  const at = currentPath.indexOf("?");
  const fromPath =
    at < 0 ? null : new URLSearchParams(currentPath.slice(at + 1).split("#")[0]).get("back");
  const target = fromPath || fallback || "/collections/all";
  // Only store paths: never follow an address that points elsewhere
  return target.startsWith("/") && !target.startsWith("//") ? target : "/collections/all";
}

// A theme shown as a plain website in its own tab: no editor, no toolbars, nothing to change.
// Store links inside it (products, collections, blog, cart, checkout, sign in) open that page here.
export default function ThemeView() {
  const { themeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const frameRef = useRef(null);
  const stateRef = useRef({});
  const path = searchParams.get("p") || "/";
  const depth = location.state?.depth || 0;
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    stateRef.current = { path, depth };
  }, [path, depth]);

  useEffect(() => {
    let cancelled = false;
    renderThemePage(themeId, path)
      .then((res) => {
        if (cancelled) return;
        setError("");
        setHtml(res.html);
      })
      .catch((e) => !cancelled && setError(e.message || "Could not open this theme."));
    return () => {
      cancelled = true;
    };
  }, [themeId, path]);

  useEffect(() => {
    function open(next) {
      const { path: current, depth } = stateRef.current;
      if (next === current) return;
      navigate({ search: `?p=${encodeURIComponent(next)}` }, { state: { depth: depth + 1 } });
    }
    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === "navigate" && typeof message.path === "string") {
        open(message.path);
      } else if (message?.type === "back") {
        const { path: current, depth } = stateRef.current;
        // Pages visited here: step back through them. Opened straight on a product: use ?back=.
        if (depth > 0) navigate(-1);
        else
          navigate(
            { search: `?p=${encodeURIComponent(backTarget(current, message.fallback))}` },
            { replace: true }
          );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  if (error && !html) return <p className="p-8 text-sm text-orange-700">{error}</p>;
  if (!html) return <p className="p-8 text-sm text-neutral-500">Loading theme…</p>;

  return (
    <iframe
      ref={frameRef}
      title="Theme"
      srcDoc={html}
      // Theme code is written by store owners: keep it off this origin
      sandbox="allow-scripts allow-forms allow-popups"
      className="fixed inset-0 h-full w-full border-0 bg-white"
    />
  );
}
