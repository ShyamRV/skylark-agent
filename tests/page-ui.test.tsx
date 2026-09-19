// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("@/components/cockpit/FloatingAgent", () => ({
  FloatingAgent: () => <div data-testid="floating-agent" />,
}));

const dashboard = {
  connected: false,
  message: "Source setup is required.",
  metrics: [],
  counts: { deals: 0, workOrders: 0, warnings: 0 },
  fetchedAt: new Date("2026-09-19T06:00:00Z").toISOString(),
};

function response(body: unknown = dashboard, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "";
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("light"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("fetch", vi.fn(() => response()));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("workspace shell", () => {
  it("persists theme and collapses the sidebar accessibly", async () => {
    localStorage.setItem("skylark-theme", "light");
    document.documentElement.dataset.theme = "light";
    render(<Home />);

    const shell = document.querySelector(".app-shell");
    expect(shell?.getAttribute("data-theme")).toBe("light");

    await userEvent.click(screen.getByRole("button", { name: "Use dark mode" }));
    expect(shell?.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("skylark-theme")).toBe("dark");

    const sidebar = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(sidebar.getAttribute("aria-expanded")).toBe("true");
    await userEvent.click(sidebar);
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("false");
  });

  it("opens mobile settings and closes the dialog with Escape", async () => {
    render(<Home />);
    await userEvent.click(
      screen.getByRole("button", { name: "Open mobile settings" }),
    );
    expect(screen.getByRole("dialog", { name: "Workspace settings" })).toBeTruthy();
    expect(screen.getByLabelText("Demo access code")).toBeTruthy();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Workspace settings" })).toBeNull();
  });

  it("debounces access-code dashboard requests", async () => {
    vi.useFakeTimers();
    render(<Home />);
    await act(async () => Promise.resolve());
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open mobile settings" }));
    fireEvent.change(screen.getByLabelText("Demo access code"), {
      target: { value: "founder-code" },
    });
    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/dashboard",
      expect.objectContaining({
        headers: { "x-demo-access-code": "founder-code" },
      }),
    );
  });

  it("submits Enter but preserves Shift+Enter in the composer", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((input) =>
      String(input).includes("/api/v1/chat")
        ? response({ type: "answer", answer: "Verified answer" })
        : response(),
    );
    render(<Home />);
    await userEvent.click(
      screen.getByRole("button", { name: /Ask Skylark:/ }),
    );
    const composer = screen.getByLabelText("Ask Skylark a business question");

    await userEvent.type(composer, "First line{shift>}{enter}{/shift}Second line");
    expect((composer as HTMLTextAreaElement).value).toBe("First line\nSecond line");
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/v1/chat",
      expect.objectContaining({ method: "POST" }),
    );

    await userEvent.keyboard("{Enter}");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
