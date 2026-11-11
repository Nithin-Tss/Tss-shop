import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const flag = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/featureFlags", () => ({ useFlag: () => flag.on }));
vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));

import { AssistantButton, AssistantPanel } from "@/components/AssistantPanel";

function signIn() {
  window.localStorage.setItem(
    "store_session",
    JSON.stringify({
      token: "t",
      storeId: "s1",
      stores: [{ storeId: "s1", permissions: ["reports.view"] }],
    })
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("the old help bot and the Help assistant are never shown together", () => {
  it("shows the old assistant button while help_assistant is off", () => {
    signIn();
    flag.on = false;
    const { container } = render(
      <MemoryRouter>
        <AssistantButton />
      </MemoryRouter>
    );
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("hides the old assistant button and panel while help_assistant is on", () => {
    signIn();
    flag.on = true;
    const { container } = render(
      <MemoryRouter>
        <AssistantButton />
        <AssistantPanel />
      </MemoryRouter>
    );
    expect(container.textContent).toBe("");
    expect(container.querySelector("button")).toBeNull();
  });
});
