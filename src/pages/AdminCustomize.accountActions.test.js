import { afterEach, describe, expect, it, vi } from "vitest";

import { openAccountActionsInStore, withAccountActionsInStore } from "@/pages/AdminCustomize";

// The customizer preview is the store owner's page in a sandboxed frame: it can't keep a shopper signed in.
// Account actions there must not sign in, and must not open the live store in another tab either: the editor
// stays where it is and shows a notice.
let frame;
afterEach(() => frame?.remove());

function preview(html, { editMode = false } = {}) {
  frame = document.createElement("iframe");
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  win.document.body.innerHTML = html;
  win.open = vi.fn();
  if (editMode) {
    win.document.documentElement.classList.add("tss-edit");
    win.document.addEventListener("click", (e) => (e.preventDefault(), e.stopPropagation()), true);
    win.document.addEventListener("submit", (e) => e.preventDefault(), true);
  }
  openAccountActionsInStore(win);
  return win;
}

const submit = (win, form) =>
  form.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true }));
const click = (win, el) =>
  el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
const notice = (win) => win.document.getElementById("tss-account-notice");

describe("account actions in the customizer preview", () => {
  it("blocks sign in, shows a notice and opens no tab", () => {
    const win = preview(
      '<form method="post" action="/s/my-store/account/login"><button>Sign in</button></form>'
    );
    const event = submit(win, win.document.querySelector("form"));
    expect(event).toBe(false);
    expect(win.open).not.toHaveBeenCalled();
    expect(notice(win).style.display).toBe("block");
  });

  it("acts before the theme's form script, so the button isn't left on 'Please wait...'", () => {
    const win = preview(
      '<form method="post" action="/s/my-store/account/login"><button>Sign in</button></form>'
    );
    const form = win.document.querySelector("form");
    const theme = vi.fn((e) => {
      form.dataset.sending = "1";
      e.preventDefault();
    });
    form.addEventListener("submit", theme);
    submit(win, form);
    expect(theme).not.toHaveBeenCalled();
    expect(form.dataset.sending).toBeUndefined();
  });

  it("blocks create account and the account's own forms and links", () => {
    const win = preview(`
      <form id="register" method="post" action="/s/my-store/account/register/"></form>
      <a id="logout" href="/s/my-store/account/logout">Sign out</a>`);
    expect(submit(win, win.document.getElementById("register"))).toBe(false);
    expect(click(win, win.document.getElementById("logout"))).toBe(false);
    expect(win.open).not.toHaveBeenCalled();
  });

  it("leaves other store links to the editor", () => {
    const win = preview(
      '<a href="/s/my-store/products/1">Mug</a><form action="/s/my-store/search"></form>'
    );
    expect(click(win, win.document.querySelector("a"))).toBe(true);
    expect(submit(win, win.document.querySelector("form"))).toBe(true);
    expect(notice(win)).toBeNull();
  });

  it("does nothing in Edit mode, where clicks and submits select sections", () => {
    const win = preview('<form method="post" action="/s/my-store/account/login"></form>', {
      editMode: true,
    });
    submit(win, win.document.querySelector("form"));
    expect(notice(win)).toBeNull();
    expect(win.open).not.toHaveBeenCalled();
  });

  it("adds the script to the preview's HTML", () => {
    const html = withAccountActionsInStore("<html><body><p>Store</p></body></html>");
    expect(html).toMatch(/<p>Store<\/p><script>[\s\S]*<\/script><\/body><\/html>$/);
  });
});
