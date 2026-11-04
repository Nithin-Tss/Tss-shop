import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import AdminTax from "@/pages/AdminTax";
import AdminWebhooks from "@/pages/AdminWebhooks";
import AdminAuditLog from "@/pages/AdminAuditLog";

// The sidebar/header have their own tests of their own; these pages are what is under test.
vi.mock("@/components/AdminSidebar", () => ({
  default: () => null,
  AdminHeader: () => null,
  PageIcon: () => null,
}));
vi.mock("@/lib/auth", () => ({
  getStoreId: () => "store-1",
  useCan: () => true,
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  apiDownload: vi.fn(),
}));
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const ok = (data) => Promise.resolve({ ok: true, data });
const mount = (page) => render(<MemoryRouter>{page}</MemoryRouter>);

describe("AdminTax", () => {
  const rate = { id: "r1", name: "VAT", country: "Germany", region: "", rate: "19.00" };

  const serve = (rates) =>
    apiGet.mockImplementation((path) =>
      path.includes("tax-rates")
        ? ok({ results: rates })
        : ok({ taxRate: "5.00", pricesIncludeTax: false, taxShipping: true })
    );

  it("shows the store defaults and the destination rates", async () => {
    serve([rate]);
    mount(<AdminTax />);
    expect(await screen.findByText("Germany")).toBeTruthy();
    expect(screen.getByText(/VAT · 19%/)).toBeTruthy();
    expect(screen.getByLabelText(/Default tax rate/).value).toBe("5.00");
  });

  it("saves the defaults to the store", async () => {
    serve([]);
    apiPatch.mockResolvedValue({ ok: true, data: {} });
    mount(<AdminTax />);
    await screen.findByText(/No destination rates yet/);
    fireEvent.change(screen.getByLabelText(/Default tax rate/), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/v1/stores/store-1/", {
        taxRate: "8",
        pricesIncludeTax: false,
        taxShipping: true,
      })
    );
    expect(await screen.findByText("Tax settings saved.")).toBeTruthy();
  });

  it("adds a rate and shows the server's complaint when it is refused", async () => {
    serve([]);
    apiPost.mockResolvedValue({
      ok: false,
      fieldErrors: {},
      formError: "This store already has a tax rate for that destination.",
    });
    mount(<AdminTax />);
    await screen.findByText(/No destination rates yet/);
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "Germany" } });
    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "19" } });
    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "This store already has a tax rate for that destination."
    );
    expect(apiPost).toHaveBeenCalledWith("/api/v1/delivery/tax-rates/", {
      name: "",
      country: "Germany",
      region: "",
      rate: "19",
    });
  });

  it("removes a rate after confirming", async () => {
    serve([rate]);
    apiDelete.mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mount(<AdminTax />);
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith("/api/v1/delivery/tax-rates/r1/"));
  });
});

describe("AdminWebhooks", () => {
  const endpoint = {
    id: "e1",
    url: "https://example.com/hook",
    description: "",
    events: ["*"],
    is_active: true,
    consecutive_failures: 0,
    disabled_reason: "",
  };

  const serve = () =>
    apiGet.mockImplementation((path) => {
      if (path.endsWith("/events/")) return ok([{ type: "order.created", description: "" }]);
      if (path.includes("/deliveries/"))
        return ok({
          results: [
            { id: "d1", event_type: "ping", status: "failed", attempts: 3, last_status_code: 500 },
          ],
        });
      return ok({ results: [endpoint] });
    });

  it("creates an endpoint and shows its signing secret once", async () => {
    serve();
    apiPost.mockResolvedValue({ ok: true, data: { id: "e2", secret: "whsec_abc" } });
    mount(<AdminWebhooks />);
    await screen.findByText("https://example.com/hook");
    fireEvent.change(screen.getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/new" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    expect(await screen.findByText("whsec_abc")).toBeTruthy();
    expect(apiPost).toHaveBeenCalledWith("/api/v1/webhooks/endpoints/", {
      url: "https://example.com/new",
      description: "",
      events: ["*"],
    });
    fireEvent.click(screen.getByRole("button", { name: /saved it/ }));
    expect(screen.queryByText("whsec_abc")).toBeNull();
  });

  it("lists deliveries and retries a failed one", async () => {
    serve();
    apiPost.mockResolvedValue({ ok: true, data: {} });
    mount(<AdminWebhooks />);
    fireEvent.click(await screen.findByRole("button", { name: "Deliveries" }));
    expect(await screen.findByText("failed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith("/api/v1/webhooks/deliveries/d1/retry/", {})
    );
  });
});

describe("AdminAuditLog", () => {
  const entry = {
    id: "a1",
    summary: "Updated product “Wool Shirt”",
    actor: "ann@example.com",
    statusCode: 200,
    createdAt: "2026-11-04T10:00:00Z",
  };

  it("lists activity and searches the log", async () => {
    apiGet.mockResolvedValue({ ok: true, data: { count: 1, results: [entry] } });
    mount(<AdminAuditLog />);
    expect(await screen.findByText("Updated product “Wool Shirt”")).toBeTruthy();
    expect(screen.getByText("ann@example.com")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "shirt" } });
    await waitFor(() =>
      expect(apiGet).toHaveBeenLastCalledWith(expect.stringContaining("q=shirt"))
    );
  });

  it("opens one entry's detail", async () => {
    apiGet.mockImplementation((path) =>
      path.includes("/logs/a1/")
        ? ok({ ...entry, method: "PATCH", path: "/api/v1/x/", ipAddress: "1.2.3.4", changes: [] })
        : ok({ count: 1, results: [entry] })
    );
    mount(<AdminAuditLog />);
    fireEvent.click(await screen.findByRole("button", { name: "Details" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("1.2.3.4")).toBeTruthy();
  });

  it("says so when nothing matches", async () => {
    apiGet.mockResolvedValue({ ok: true, data: { count: 0, results: [] } });
    mount(<AdminAuditLog />);
    expect(await screen.findByText("No activity matches these filters.")).toBeTruthy();
  });
});
