import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiPost } from "@/lib/api";

const abortError = () =>
  Object.assign(new Error("The operation was aborted."), { name: "AbortError" });

describe("apiPost with an AbortSignal", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes the signal to fetch, and leaves other callers without one", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await apiPost("/api/v1/x/", { a: 1 }, {}, controller.signal);
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);

    await apiPost("/api/v1/x/", { a: 1 });
    expect("signal" in fetchMock.mock.calls[1][1]).toBe(false); // unchanged for everyone else
  });

  it("answers { aborted: true } when the request is cancelled, not a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(abortError()))
    );
    const result = await apiPost("/api/v1/x/", {}, {}, new AbortController().signal);
    expect(result).toMatchObject({ ok: false, aborted: true, formError: "" });
  });

  it("does not sign out or refresh a token because of a cancelled request", async () => {
    // A signed-in session whose token is good for another hour
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const session = {
      token: `h.${payload}.s`,
      refresh: "r",
      email: "a@b.c",
      storeId: "s1",
      stores: [],
    };
    window.localStorage.setItem("store_session", JSON.stringify(session));
    const fetchMock = vi.fn(() => Promise.reject(abortError()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiPost("/api/v1/x/", {}, {}, new AbortController().signal);

    expect(result.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh call, no retry
    expect(JSON.parse(window.localStorage.getItem("store_session")).token).toBe(session.token); // still signed in
  });

  it("a real network failure is still reported as one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch")))
    );
    const result = await apiPost("/api/v1/x/", {}, {}, new AbortController().signal);
    expect(result.aborted).toBeUndefined();
    expect(result.formError).toContain("Unable to reach the server");
  });
});
