import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ThemeView from "@/pages/ThemeView";

vi.mock("@/lib/themeApi", () => ({
  renderThemePage: vi.fn((id, path) => Promise.resolve({ html: `<p>page ${path}</p>` })),
}));
import { renderThemePage } from "@/lib/themeApi";

afterEach(cleanup);

function mount() {
  return render(
    <MemoryRouter initialEntries={["/view/t1"]}>
      <Routes>
        <Route path="/view/:themeId" element={<ThemeView />} />
      </Routes>
    </MemoryRouter>
  );
}

// The preview script posts { type: "navigate", path } for every store link; the View tab must follow it,
// as the editor does, or links and buttons in a viewed theme silently do nothing.
describe("ThemeView", () => {
  it("opens the page a store link points to", async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector("iframe")).toBeTruthy());
    expect(renderThemePage).toHaveBeenLastCalledWith("t1", "/");

    const frame = container.querySelector("iframe");
    fireEvent(
      window,
      new MessageEvent("message", {
        data: { type: "navigate", path: "/cart" },
        source: frame.contentWindow,
      })
    );
    await waitFor(() => expect(renderThemePage).toHaveBeenLastCalledWith("t1", "/cart"));
  });

  it("ignores messages from other windows", async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector("iframe")).toBeTruthy());
    const calls = renderThemePage.mock.calls.length;
    fireEvent(window, new MessageEvent("message", { data: { type: "navigate", path: "/cart" } }));
    expect(renderThemePage.mock.calls.length).toBe(calls);
  });

  it("keeps forms and popups enabled in the sandbox", async () => {
    const { container } = mount();
    await waitFor(() => expect(container.querySelector("iframe")).toBeTruthy());
    const sandbox = container.querySelector("iframe").getAttribute("sandbox");
    expect(sandbox).toContain("allow-forms");
    expect(sandbox).toContain("allow-popups");
  });
});
