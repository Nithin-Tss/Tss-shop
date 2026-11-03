import { afterEach, describe, expect, it, vi } from "vitest";

import source from "@/pages/AdminCustomize.jsx?raw";
import { openAccountActionsInStore, withAccountActionsInStore } from "@/pages/AdminCustomize";

// The customizer preview is the store owner's page in a sandboxed frame: it can't keep a shopper signed in,
// so signing in there used to "work" until the next reload and then show Sign in again. Account actions
// must open the real store in a new tab instead.
const BASE = "https://api.example.com/s/my-store";

let frame;
afterEach(() => frame?.remove());

// A separate window (like the preview frame) with the script running in it
function preview(html, { editMode = false } = {}) {
  frame = document.createElement("iframe");
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  win.document.body.innerHTML = html;
  win.open = vi.fn();
  if (editMode) {
    // What the editor's own preview script does in Edit mode: marks the page, and every click and submit is stopped
    win.document.documentElement.classList.add("tss-edit");
    win.document.addEventListener("click", (e) => (e.preventDefault(), e.stopPropagation()), true);
    win.document.addEventListener("submit", (e) => e.preventDefault(), true);
  }
  openAccountActionsInStore(win, BASE);
  return win;
}

const submit = (win, form) =>
  form.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
const click = (win, el) =>
  el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

describe("account actions in the customizer preview", () => {
  it("opens the real store's sign-in page in a new tab instead of signing in inside the preview", () => {
    const win = preview('<form method="post" action="/s/my-store/account/login"><button>Sign in</button></form>');
    const event = submit(win, win.document.querySelector("form"));
    expect(event).toBe(false); // the preview did not post the form
    expect(win.open).toHaveBeenCalledWith(`${BASE}/account/login`, "_blank", "noopener");
  });

  it("opens the store before the theme's form script, so the preview's button isn't left on 'Please wait...'", () => {
    const win = preview('<form method="post" action="/s/my-store/account/login"><button>Sign in</button></form>');
    const form = win.document.querySelector("form");
    // The theme's own script (snippets/auth-script.liquid): checks the fields, then marks the form as sending
    const theme = vi.fn((e) => { form.dataset.sending = "1"; e.preventDefault(); });
    form.addEventListener("submit", theme);
    submit(win, form);
    expect(win.open).toHaveBeenCalledWith(`${BASE}/account/login`, "_blank", "noopener");
    expect(theme).not.toHaveBeenCalled();
    expect(form.dataset.sending).toBeUndefined();
  });

  it("opens create account, and the account's own forms and links, in the real store", () => {
    const win = preview(`
      <form id="register" method="post" action="/s/my-store/account/register/"></form>
      <form id="profile" method="post" action="/s/my-store/account/profile/"></form>
      <a id="logout" href="/s/my-store/account/logout">Sign out</a>
      <a id="addresses" href="/account/addresses/">Addresses</a>`);
    submit(win, win.document.getElementById("register"));
    submit(win, win.document.getElementById("profile"));
    click(win, win.document.getElementById("logout"));
    click(win, win.document.getElementById("addresses"));
    expect(win.open.mock.calls.map((c) => c[0])).toEqual([
      `${BASE}/account/register`,
      `${BASE}/account`,
      `${BASE}/account`,
      `${BASE}/account`,
    ]);
  });

  it("always uses the store being edited", () => {
    const win = preview('<a href="https://elsewhere.example/s/other-store/account/login">Sign in</a>');
    click(win, win.document.querySelector("a"));
    expect(win.open).toHaveBeenCalledWith(`${BASE}/account/login`, "_blank", "noopener");
  });

  it("leaves other store links to the editor", () => {
    const win = preview('<a href="/s/my-store/products/1">Mug</a><form action="/s/my-store/search"></form>');
    click(win, win.document.querySelector("a"));
    submit(win, win.document.querySelector("form"));
    expect(win.open).not.toHaveBeenCalled();
  });

  it("opens nothing in Edit mode, where clicks and submits select sections", () => {
    const win = preview(
      '<a href="/s/my-store/account/logout">Sign out</a><form method="post" action="/s/my-store/account/login"></form>',
      { editMode: true }
    );
    click(win, win.document.querySelector("a"));
    submit(win, win.document.querySelector("form"));
    expect(win.open).not.toHaveBeenCalled();
  });

  it("adds a working script to the preview's HTML", () => {
    const html = withAccountActionsInStore("<html><body><p>Store</p></body></html>", BASE);
    expect(html).toMatch(/<p>Store<\/p><script>[\s\S]*<\/script><\/body><\/html>$/);

    // The script is the function itself: run it in a preview window, as the browser does
    const win = preview('<form method="post" action="/s/my-store/account/login"></form>');
    win.open.mockClear();
    const body = html.match(/<script>([\s\S]*)<\/script>/)[1];
    new Function("window", body)(win);
    submit(win, win.document.querySelector("form"));
    expect(win.open).toHaveBeenCalledWith(`${BASE}/account/login`, "_blank", "noopener");
  });

  it("can't be broken out of by the store address, and needs a store", () => {
    expect(withAccountActionsInStore("<body></body>", "https://x/</script><b>")).not.toContain("</script><b>");
    expect(withAccountActionsInStore("<body></body>", "")).toBe("<body></body>");
  });

  it("lets the preview open the store as a normal tab", () => {
    expect(source).toContain('sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"');
  });
});
