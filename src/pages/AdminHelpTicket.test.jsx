import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiUpload: vi.fn() }));

import { apiGet, apiPost, apiUpload } from "@/lib/api";
import { clock } from "@/lib/supportTickets";
import AdminHelpTicket from "@/pages/AdminHelpTicket";

const message = (id, senderType, body, extra = {}) => ({
  id,
  senderType,
  senderName: senderType === "staff" ? "Support team" : "Asha",
  body,
  attachments: [],
  createdAt: "2026-11-11T10:00:00Z",
  ...extra,
});

const ticket = (messages, status = "open") => ({
  id: "t1",
  subject: "Price problem",
  status,
  createdAt: "2026-11-11T10:00:00Z",
  updatedAt: "2026-11-11T10:00:00Z",
  messages,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminHelpTicket ticketId="t1" />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AdminHelpTicket", () => {
  it("shows the conversation and refreshes it every 5 seconds", async () => {
    apiGet.mockResolvedValueOnce({
      ok: true,
      data: ticket([message("m1", "owner", "It does not save.")]),
    });
    apiGet.mockResolvedValue({
      ok: true,
      data: ticket(
        [
          message("m1", "owner", "It does not save."),
          message("m2", "staff", "Fixed, please check."),
        ],
        "pending"
      ),
    });

    renderPage();
    await act(async () => {});
    expect(screen.getByText("It does not save.")).toBeTruthy();
    expect(screen.queryByText("Fixed, please check.")).toBeNull();
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith("/api/v1/support/tickets/t1/");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Fixed, please check.")).toBeTruthy();
    expect(screen.getByText("Support team · " + clock("2026-11-11T10:00:00Z"))).toBeTruthy();
  });

  it("stops refreshing once the page is left", async () => {
    apiGet.mockResolvedValue({
      ok: true,
      data: ticket([message("m1", "owner", "Hello there friend")]),
    });
    const { unmount } = renderPage();
    await act(async () => {});
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it("keeps what is shown when a refresh fails", async () => {
    apiGet.mockResolvedValueOnce({
      ok: true,
      data: ticket([message("m1", "owner", "Still here")]),
    });
    apiGet.mockResolvedValue({ ok: false, error: "Unable to reach the server." });
    renderPage();
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText("Still here")).toBeTruthy();
    expect(screen.queryByText(/Unable to reach/)).toBeNull();
  });

  it("sends a reply with the attached image ids and shows the new state", async () => {
    apiGet.mockResolvedValue({
      ok: true,
      data: ticket([message("m1", "owner", "First message here")], "pending"),
    });
    apiUpload.mockResolvedValue({
      ok: true,
      data: { id: "img-1", url: "http://x/s/_img/img-1", name: "shot.png" },
    });
    apiPost.mockResolvedValue({
      ok: true,
      data: ticket(
        [message("m1", "owner", "First message here"), message("m2", "owner", "More info")],
        "open"
      ),
    });

    const { container } = renderPage();
    await act(async () => {});

    const file = new File([new Uint8Array([1, 2, 3])], "shot.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [file] },
      });
    });
    expect(apiUpload).toHaveBeenCalledWith("/api/v1/support/attachments/", "image", file);

    fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "More info" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    expect(apiPost).toHaveBeenCalledWith("/api/v1/support/tickets/t1/messages/", {
      message: "More info",
      attachments: ["img-1"],
    });
    expect(screen.getByText("More info", { selector: "p" })).toBeTruthy();
    expect(screen.getByLabelText("Your reply").value).toBe("");
  });

  it("does not send an empty reply", async () => {
    apiGet.mockResolvedValue({
      ok: true,
      data: ticket([message("m1", "owner", "First message here")]),
    });
    renderPage();
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });
    expect(apiPost).not.toHaveBeenCalled();
    expect(screen.getByText("Write a message.")).toBeTruthy();
  });
});
