import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";
import { signIn, signOut } from "@/lib/auth";

// Mock Monaco Editor so it doesn't try to load workers in JSDOM
vi.mock("@monaco-editor/react", () => ({
  default: () => <div data-testid="monaco-editor">Monaco Editor Mock</div>,
}));

describe("BUG-007 /editor-demo route redirect", () => {
  afterEach(() => {
    cleanup();
    signOut();
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated users from /editor-demo to /auth/signin", async () => {
    signOut();

    render(
      <MemoryRouter initialEntries={["/editor-demo"]}>
        <App />
      </MemoryRouter>
    );

    // Unauthenticated user is redirected to sign-in page ("Welcome back")
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Welcome back/i })).toBeTruthy();
    });
  });

  it("redirects authenticated user with themes.manage from /editor-demo to /admin/online-store/code", async () => {
    signIn({
      access: "valid-jwt-token",
      refresh: "valid-refresh-token",
      user: { email: "owner@example.com" },
      stores: [
        {
          storeId: "store-123",
          storeName: "Test Store",
          permissions: ["themes.manage", "themes.view"],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/editor-demo"]}>
        <App />
      </MemoryRouter>
    );

    // Should redirect to /admin/online-store/code and render the CodeWorkbench
    await waitFor(() => {
      expect(
        screen.getByText(/Back to customizer/i) || screen.queryByTestId("monaco-editor")
      ).toBeTruthy();
    });
  });
});
