import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import {
  IncludeCollectionsPicker,
  blockedReason,
  matchingCollections,
  productsLabel,
} from "@/pages/AdminAddCollection";

// The page's sidebar, session and api are not under test here; the picker is.
vi.mock("@/components/AdminSidebar", () => ({ default: () => null, AdminHeader: () => null }));
vi.mock("@/lib/auth", () => ({ getActiveStore: () => null, getSession: () => null }));
vi.mock("@/lib/api", () => ({
  storeBaseUrl: () => "",
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiUpload: vi.fn(),
}));

afterEach(cleanup);

const COLLECTIONS = [
  { id: "c1", name: "Shiraz", products_count: 4 },
  { id: "c2", name: "Pinot Noir", products_count: 6 },
  { id: "c3", name: "Rose", products_count: 1 },
];

// Holds the selection like the collection page does
function Harness({ initial = [], onChange = () => {}, collections = COLLECTIONS }) {
  const [selected, setSelected] = useState(initial);
  return (
    <IncludeCollectionsPicker
      collections={collections}
      selected={selected}
      onChange={(ids) => {
        setSelected(ids);
        onChange(ids);
      }}
    />
  );
}

const openList = () => fireEvent.focus(screen.getByRole("combobox"));
const box = (name) => screen.getByRole("checkbox", { name: new RegExp(name) });
const chipTexts = () =>
  within(screen.getByRole("list", { name: "Added collections" }))
    .getAllByRole("listitem")
    .map((c) => c.textContent);

describe("matchingCollections / blockedReason / productsLabel", () => {
  it("filters by what was typed, ignoring case, and keeps added ones", () => {
    expect(matchingCollections(COLLECTIONS, "").map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(matchingCollections(COLLECTIONS, "  PINOT ").map((c) => c.id)).toEqual(["c2"]);
  });

  it("blocks added collections and ones that lead back to the current one", () => {
    const list = [
      { id: "a", include_collections: ["b"] },
      { id: "b", include_collections: ["cur"] },
      { id: "c", include_collections: [] },
    ];
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    expect(blockedReason(list[2], ["c"], byId, "cur")).toBe("Already added");
    expect(blockedReason(list[0], [], byId, "cur")).toMatch(/loop/); // a -> b -> cur
    expect(blockedReason(list[1], [], byId, "cur")).toMatch(/loop/);
    expect(blockedReason(list[2], [], byId, "cur")).toBe("");
    expect(blockedReason(list[0], [], byId, undefined)).toBe("");
  });

  it("says product or products", () => {
    expect([0, 1, 6, undefined].map(productsLabel)).toEqual([
      "0 products",
      "1 product",
      "6 products",
      "0 products",
    ]);
  });
});

describe("IncludeCollectionsPicker", () => {
  it("shows a checkbox, name and product count on every row", () => {
    render(<Harness />);
    openList();
    const rows = within(screen.getByRole("list", { name: "Collections to add" })).getAllByRole(
      "listitem"
    );
    expect(rows.map((o) => o.textContent)).toEqual([
      "Shiraz4 products",
      "Pinot Noir6 products",
      "Rose1 product",
    ]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("ticks several, keeps the list open, and adds them all at once with a count", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true); // nothing ticked yet

    openList();
    fireEvent.click(box("Rose"));
    fireEvent.click(screen.getByText("Shiraz")); // clicking the row ticks it too
    expect(screen.getByRole("list", { name: "Collections to add" })).toBeTruthy(); // still open
    expect(screen.getByRole("button", { name: "Add (2)" }).disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Add (2)" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(["c1", "c3"]);
    expect(chipTexts()).toEqual(["Shiraz · 4 products", "Rose · 1 product"]);
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true); // ticks cleared
    expect(screen.getByRole("combobox").value).toBe("");
  });

  it("unticks on a second click", () => {
    render(<Harness />);
    openList();
    fireEvent.click(box("Rose"));
    fireEvent.click(box("Rose"));
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true);
  });

  it("keeps ticks while searching", () => {
    render(<Harness />);
    openList();
    fireEvent.click(box("Shiraz"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "noir" } });
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    fireEvent.click(box("Pinot Noir"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(box("Shiraz").checked).toBe(true);
    expect(screen.getByRole("button", { name: "Add (2)" })).toBeTruthy();
  });

  it("has Select all (shown) and Clear", () => {
    render(<Harness initial={["c3"]} />);
    openList();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "i" } }); // Shiraz, Pinot Noir
    fireEvent.click(screen.getByRole("button", { name: "Select all (shown)" }));
    expect(screen.getByRole("button", { name: "Add (2)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true);
  });

  it("tells same-titled collections apart by their handle", () => {
    const twins = [
      { id: "w1", name: "Whisky", handle: "whisky", products_count: 2 },
      { id: "w2", name: "Whisky", handle: "whisky-1", products_count: 5 },
    ];
    render(<Harness collections={twins} initial={["w2"]} />);
    expect(screen.getByText("/whisky-1")).toBeTruthy(); // on its chip
    openList();
    const rows = within(screen.getByRole("list", { name: "Collections to add" })).getAllByRole(
      "listitem"
    );
    expect(rows.map((r) => r.textContent)).toEqual([
      "Whisky/whisky2 products",
      "Whisky/whisky-1Already added5 products",
    ]);
    fireEvent.click(screen.getAllByRole("checkbox")[0]); // the first Whisky, /whisky
    expect(screen.getByRole("button", { name: "Add (1)" })).toBeTruthy();
  });

  it("shows added collections ticked and disabled", () => {
    render(<Harness initial={["c1"]} />);
    openList();
    expect(box("Shiraz").checked).toBe(true);
    expect(box("Shiraz").disabled).toBe(true);
    expect(screen.getByText("Already added")).toBeTruthy();
    expect(box("Rose").disabled).toBe(false);
  });

  it("disables a collection that would create a loop and says why", () => {
    const collections = [
      { id: "c1", name: "Shiraz", products_count: 4, include_collections: ["cur"] },
      { id: "c2", name: "Pinot Noir", products_count: 6, include_collections: [] },
    ];
    render(
      <IncludeCollectionsPicker
        collections={collections}
        selected={[]}
        currentId="cur"
        onChange={() => {}}
      />
    );
    openList();
    expect(box("Shiraz").disabled).toBe(true);
    expect(screen.getByText(/would create a loop/)).toBeTruthy();
    expect(box("Pinot Noir").disabled).toBe(false);
  });

  it("works from the keyboard: arrows, Space, Enter to add, Esc to close", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(box("Shiraz"));
    fireEvent.keyDown(document.activeElement, { key: "ArrowDown" });
    expect(document.activeElement).toBe(box("Pinot Noir"));
    fireEvent.click(document.activeElement); // Space on a checkbox is a click
    fireEvent.keyDown(document.activeElement, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(["c2"]);

    openList();
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("list", { name: "Collections to add" })).toBeNull();
  });

  it("removes an added collection with its ×", () => {
    const onChange = vi.fn();
    render(<Harness initial={["c1", "c2"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Shiraz" }));

    expect(onChange).toHaveBeenLastCalledWith(["c2"]);
    expect(screen.queryByRole("button", { name: "Remove Shiraz" })).toBeNull();
    openList();
    expect(box("Shiraz").disabled).toBe(false); // selectable again
  });

  it("does not show an added id whose collection no longer exists", () => {
    render(<Harness initial={["deleted", "c3"]} />);
    expect(chipTexts()).toEqual(["Rose · 1 product"]);
  });

  it("says so when nothing matches or there are no collections", () => {
    const { unmount } = render(<Harness />);
    openList();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
    expect(screen.getByText("No collections match.")).toBeTruthy();
    unmount();

    render(<Harness collections={[]} />);
    expect(screen.getByText("There are no other collections yet.")).toBeTruthy();
  });

  it("shows the server's message", () => {
    render(
      <IncludeCollectionsPicker
        collections={COLLECTIONS}
        selected={[]}
        error="Red Wine and Shiraz can't include each other."
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("alert").textContent).toBe(
      "Red Wine and Shiraz can't include each other."
    );
  });
});
