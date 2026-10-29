import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { renderThemePage } from "@/lib/themeApi";

// A theme shown as a plain website in its own tab: no editor, no toolbars, nothing to change.
// Store links inside it (products, collections, blog, cart, checkout, sign in) open that page here.
export default function ThemeView() {
  const { themeId } = useParams();
  const frameRef = useRef(null);
  const themeIdRef = useRef(themeId);
  useEffect(() => {
    themeIdRef.current = themeId;
  }, [themeId]);
  // The page is remembered with its theme, so opening another theme starts at Home
  const [nav, setNav] = useState({ themeId, path: "/" });
  const path = nav.themeId === themeId ? nav.path : "/";
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

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
    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (message?.type === "navigate" && typeof message.path === "string") {
        setNav({ themeId: themeIdRef.current, path: message.path });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (error && !html) return <p className="p-8 text-sm text-[#B42318]">{error}</p>;
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
