import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// The sidebar is its own big component (and fetches); the pages only need its shell pieces
vi.mock("@/components/AdminSidebar", () => ({
  default: () => <nav aria-label="Admin" />,
  AdminHeader: () => <header />,
  PageIcon: () => null,
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiUpload: vi.fn(),
}));

import { apiGet, apiPatch, apiPost } from "@/lib/api";
import AdminSupportTicket from "@/pages/AdminSupportTicket";
import AdminSupportTickets from "@/pages/AdminSupportTickets";

function signIn(user) {
  window.localStorage.setItem(
    "store_session",
    JSON.stringify({
      token: "t",
      storeId: "s1",
      stores: [{ storeId: "s1" }],
      user: { id: "me", ...user },
    })
  );
}

const row = (n, extra = {}) => ({
  id: `id${n}`,
  ticketNumber: `TSS-00000${n}`,
  subject: `Subject ${n}`,
  status: "open",
  priority: "urgent",
  category: "payments",
  source: "ai_escalation",
  store: { id: "s", name: `Shop ${n}` },
  user: { email: "m@example.com", name: "M" },
  assignedTo: null,
  createdAt: "2026-11-11T10:00:00Z",
  updatedAt: "2026-11-11T11:00:00Z",
  ...extra,
});

const detail = (extra = {}) => ({
  ...row(1),
  summary: "Merchant cannot connect a domain; DNS steps were tried.",
  transcript: [
    { role: "user", content: "my domain fails" },
    { role: "assistant", content: "Try the DNS records" },
  ],
  messages: [
    {
      id: "m1",
      senderType: "staff",
      senderName: "Agent A",
      body: "Looking into it",
      attachments: [],
      createdAt: "2026-11-11T10:00:00Z",
      isInternal: false,
    },
    {
      id: "m2",
      senderType: "staff",
      senderName: "Agent A",
      body: "Possible fraud, careful",
      attachments: [],
      createdAt: "2026-11-11T10:05:00Z",
      isInternal: true,
    },
  ],
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});
afterEach(cleanup);

describe("Support Tickets list", () => {
  beforeEach(() => {
    apiGet.mockResolvedValue({
      ok: true,
      data: {
        count: 2,
        results: [row(1), row(2, { assignedTo: { id: "a", name: "Asha" }, status: "in_progress" })],
      },
    });
  });

  const mount = () =>
    render(
      <MemoryRouter>
        <AdminSupportTickets />
      </MemoryRouter>
    );

  it("shows the table with every column, newest/most urgent as the server sorts", async () => {
    signIn({ isSupportAgent: true });
    mount();
    const table = await screen.findByRole("table");
    for (const h of [
      "Ticket",
      "Store",
      "Subject",
      "Category",
      "Priority",
      "Status",
      "Source",
      "Assigned to",
      "Created",
      "Updated",
    ]) {
      expect(within(table).getByRole("columnheader", { name: h })).toBeTruthy();
    }
    expect(within(table).getByText("TSS-000001")).toBeTruthy();
    expect(within(table).getByText("Shop 2")).toBeTruthy();
    expect(within(table).getByText("Unassigned")).toBeTruthy();
    expect(within(table).getByText("Asha")).toBeTruthy();
    expect(within(table).getAllByText("AI").length).toBe(2);
    expect(within(table).getByText("In progress")).toBeTruthy();
  });

  it("starts on the active tickets and sends the chosen filters and search", async () => {
    signIn({ isSupportAgent: true });
    mount();
    await screen.findByRole("table");
    expect(apiGet.mock.calls[0][0]).toBe(
      "/api/v1/platform/support/tickets/?status=active&limit=25&offset=0"
    );
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "urgent" } });
    fireEvent.change(screen.getByLabelText("Assignment"), { target: { value: "unassigned" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "payments" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "resolved" } });
    await waitFor(() => {
      const last = apiGet.mock.calls.at(-1)[0];
      expect(last).toContain("status=resolved");
      expect(last).toContain("priority=urgent");
      expect(last).toContain("assigned=unassigned");
      expect(last).toContain("category=payments");
    });
    fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "Shop 2" } });
    await waitFor(() => expect(apiGet.mock.calls.at(-1)[0]).toContain("q=Shop+2"), {
      timeout: 2000,
    });
  });

  it("works for platform admins too, and shows nothing to anyone else", async () => {
    signIn({ isPlatformAdmin: true });
    mount();
    expect(await screen.findByRole("table")).toBeTruthy();
    cleanup();
    apiGet.mockClear();
    signIn({});
    mount();
    expect(screen.getByText(/Only platform support staff/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(apiGet).not.toHaveBeenCalled();
  });
});

describe("Support ticket detail", () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={["/admin/support-tickets/id1"]}>
        <Routes>
          <Route path="/admin/support-tickets/:ticketId" element={<AdminSupportTicket />} />
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    signIn({ isSupportAgent: true });
    apiGet.mockImplementation(async (path) =>
      path.includes("/agents/")
        ? {
            ok: true,
            data: [
              { id: "me", name: "Me Agent" },
              { id: "a2", name: "Asha" },
            ],
          }
        : { ok: true, data: detail() }
    );
  });

  it("shows the AI summary on top, the transcript, the thread and the internal note", async () => {
    mount();
    expect(await screen.findByText(/Merchant cannot connect a domain/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "AI summary" })).toBeTruthy();
    const transcript = screen.getByRole("list", { name: "AI chat transcript" });
    expect(within(transcript).getByText("my domain fails")).toBeTruthy();
    expect(screen.getByText("Looking into it")).toBeTruthy();
    expect(screen.getByText("Possible fraud, careful")).toBeTruthy();
    expect(screen.getByText(/Internal note, staff only/)).toBeTruthy();
  });

  it("assigns, changes status and priority through PATCH", async () => {
    apiPatch.mockResolvedValue({ ok: true, data: detail({ status: "in_progress" }) });
    mount();
    await screen.findByText(/Merchant cannot connect/);
    fireEvent.click(screen.getByRole("button", { name: "Assign to me" }));
    await waitFor(() =>
      expect(apiPatch).toHaveBeenCalledWith("/api/v1/platform/support/tickets/id1/", {
        assignedTo: "me",
      })
    );
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "resolved" } });
    await waitFor(() =>
      expect(apiPatch).toHaveBeenLastCalledWith("/api/v1/platform/support/tickets/id1/", {
        status: "resolved",
      })
    );
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "low" } });
    await waitFor(() =>
      expect(apiPatch).toHaveBeenLastCalledWith("/api/v1/platform/support/tickets/id1/", {
        priority: "low",
      })
    );
    fireEvent.change(screen.getByLabelText("Assigned to"), { target: { value: "" } });
    await waitFor(() =>
      expect(apiPatch).toHaveBeenLastCalledWith("/api/v1/platform/support/tickets/id1/", {
        assignedTo: null,
      })
    );
  });

  it("sends a reply to the merchant with the chosen status, and an internal note as a note", async () => {
    apiPost.mockResolvedValue({ ok: true, data: detail() });
    mount();
    await screen.findByText(/Merchant cannot connect/);
    fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "We fixed it" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    expect(apiPost.mock.calls[0][0]).toBe("/api/v1/platform/support/tickets/id1/messages/");
    expect(apiPost.mock.calls[0][1]).toEqual({
      message: "We fixed it",
      status: "waiting_on_customer",
    });

    fireEvent.click(screen.getByRole("tab", { name: "Internal note" }));
    expect(screen.getByText(/The merchant is not notified/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "check billing" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(2));
    expect(apiPost.mock.calls[1][1]).toEqual({ message: "check billing", internal: true });
  });

  it("shows the server's error when a change is refused", async () => {
    apiPatch.mockResolvedValue({
      ok: false,
      status: 403,
      formError: "Only platform support staff can do this.",
    });
    mount();
    await screen.findByText(/Merchant cannot connect/);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "low" } });
    });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .map((a) => a.textContent)
          .join(" ")
      ).toMatch(/support staff/)
    );
  });
});
