// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FloatingAgent } from "@/components/cockpit/FloatingAgent";

vi.mock("next/dynamic", () => ({
  default: () => function MockRobotScene() {
    return <span data-testid="robot-scene" />;
  },
}));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("assistant dialog", () => {
  it("moves focus into the dialog, closes with Escape, and restores focus", async () => {
    render(<FloatingAgent connected loading={false} onAsk={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Open AI assistant" });
    await userEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Ask Skylark" })).toBeTruthy();
    const input = screen.getByLabelText("Ask the Skylark assistant");
    await waitFor(() => expect(document.activeElement).toBe(input));

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Ask Skylark" })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
