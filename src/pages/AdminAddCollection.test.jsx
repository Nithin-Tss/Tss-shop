import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import {
  IncludeCollectionsPicker,
  availableCollections,
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
const addCollection = (name) => {
  openList();
  fireEvent.click(within(screen.getByRole("listbox")).getByText(name));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
};

describe("availableCollections / productsLabel", () => {
  it("leaves out the added ones and filters by what was typed, ignoring case", () => {
    expect(availableCollections(COLLECTIONS, ["c1"], "").map((c) => c.id)).toEqual(["c2", "c3"]);
    expect(availableCollections(COLLECTIONS, [], "  PINOT ").map((c) => c.id)).toEqual(["c2"]);
    expect(availableCollections(COLLECTIONS, ["c2"], "pinot")).toEqual([]);
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
  it("lists every collection with its product count in a searchable dropdown", () => {
    render(<Harness />);
    openList();
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Shiraz4 products",
      "Pinot Noir6 products",
      "Rose1 product",
    ]);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "noir" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
  });

  it("adds the chosen collection with the Add button and shows it as a chip", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Add" }).disabled).toBe(true); // nothing chosen yet

    addCollection("Pinot Noir");

    expect(onChange).toHaveBeenLastCalledWith(["c2"]);
    const chips = within(screen.getByRole("list", { name: "Added collections" })).getAllByRole(
      "listitem"
    );
    expect(chips.map((c) => c.textContent)).toEqual(["Pinot Noir · 6 products"]);
    expect(screen.getByRole("combobox").value).toBe(""); // ready for the next one
  });

  it("does not offer a collection that is already added", () => {
    render(<Harness initial={["c1"]} />);
    openList();
    const names = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(names.join()).not.toContain("Shiraz");
    expect(names).toHaveLength(2);
  });

  it("removes an added collection with its ×", () => {
    const onChange = vi.fn();
    render(<Harness initial={["c1", "c2"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Shiraz" }));

    expect(onChange).toHaveBeenLastCalledWith(["c2"]);
    expect(screen.queryByRole("button", { name: "Remove Shiraz" })).toBeNull();
    // and it is offered again
    openList();
    expect(within(screen.getByRole("listbox")).getByText("Shiraz")).toBeTruthy();
  });

  it("does not show an added id whose collection no longer exists", () => {
    render(<Harness initial={["deleted", "c3"]} />);
    const chips = within(screen.getByRole("list", { name: "Added collections" })).getAllByRole(
      "listitem"
    );
    expect(chips.map((c) => c.textContent)).toEqual(["Rose · 1 product"]);
  });

  it("says so when all collections are added or there are none", () => {
    const { unmount } = render(<Harness initial={["c1", "c2", "c3"]} />);
    openList();
    expect(screen.getByText("All collections are added.")).toBeTruthy();
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
