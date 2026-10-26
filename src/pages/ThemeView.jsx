import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { renderThemeHome } from "@/lib/themeApi";

// A theme shown as a plain website in its own tab: no editor, no toolbars, nothing to change
export default function ThemeView() {
  const { themeId } = useParams();
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    renderThemeHome(themeId)
      .then((res) => !cancelled && setHtml(res.html))
      .catch((e) => !cancelled && setError(e.message || "Could not open this theme."));
    return () => {
      cancelled = true;
    };
  }, [themeId]);

  if (error) return <p className="p-8 text-sm text-[#B42318]">{error}</p>;
  if (!html) return <p className="p-8 text-sm text-neutral-500">Loading theme…</p>;

  return (
    <iframe
      title="Theme"
      srcDoc={html}
      // Theme code is written by store owners: keep it off this origin
      sandbox="allow-scripts"
      className="fixed inset-0 h-full w-full border-0 bg-white"
    />
  );
}
