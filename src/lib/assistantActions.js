// The buttons the server offers under an answer: [{ label, path }]. Whatever arrives (from the server, or from a
// saved chat in sessionStorage), only these become buttons: a plain admin page, or the code editor with a file
// (and theme) it may open. Anything else is dropped.
const ADMIN_PAGE = /^\/admin\/[a-z0-9/_-]*$/;
const CODE_PAGE = "/admin/online-store/code";
const FILE_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}(\/[A-Za-z0-9][A-Za-z0-9._-]{0,99})*$/;
const THEME_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safePath(path) {
  if (typeof path !== "string" || !path.startsWith("/admin/")) return null;
  let url;
  try {
    url = new URL(path, "http://admin.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "http://admin.invalid" || url.hash || !ADMIN_PAGE.test(url.pathname))
    return null;

  const params = [...url.searchParams.entries()];
  if (params.length === 0) return url.search ? null : url.pathname;
  if (url.pathname !== CODE_PAGE) return null;

  const clean = new URLSearchParams();
  for (const [key, value] of params) {
    if (key === "file" && FILE_PATH.test(value) && value.length <= 200) clean.set("file", value);
    else if (key === "theme" && THEME_ID.test(value)) clean.set("theme", value);
    else return null;
  }
  return `${url.pathname}?${clean.toString()}`;
}

export function cleanActions(actions) {
  if (!Array.isArray(actions)) return [];
  const result = [];
  for (const action of actions) {
    const path = safePath(action?.path);
    if (typeof action?.label === "string" && action.label.length <= 80 && path) {
      result.push({ label: action.label, path });
    }
  }
  return result.slice(0, 3);
}
