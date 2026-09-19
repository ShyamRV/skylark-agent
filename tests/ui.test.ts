import { describe, expect, it } from "vitest";
import {
  ASSISTANT_TRIGGER_SIZE,
  clampAssistantPosition,
} from "@/components/cockpit/assistantPosition";
import { quickActions } from "@/components/cockpit/QuickActions";

describe("assistant positioning", () => {
  it("keeps the assistant inside a desktop viewport", () => {
    expect(clampAssistantPosition({ x: 5000, y: 5000 }, 1440, 900)).toEqual({
      x: 1440 - ASSISTANT_TRIGGER_SIZE.width - 8,
      y: 900 - ASSISTANT_TRIGGER_SIZE.height - 8,
    });
  });

  it("recovers negative and tiny-viewport positions", () => {
    expect(clampAssistantPosition({ x: -50, y: -100 }, 320, 480)).toEqual({
      x: 8,
      y: 8,
    });
    expect(clampAssistantPosition({ x: 30, y: 30 }, 80, 100)).toEqual({
      x: 8,
      y: 8,
    });
  });

  it.each([
    [1440, 900],
    [1280, 800],
    [1024, 768],
    [768, 1024],
    [430, 932],
    [390, 844],
  ])("keeps a saved position visible at %ix%i", (width, height) => {
    const point = clampAssistantPosition({ x: 2000, y: 2000 }, width, height);
    expect(point.x).toBeGreaterThanOrEqual(8);
    expect(point.y).toBeGreaterThanOrEqual(8);
    expect(point.x + ASSISTANT_TRIGGER_SIZE.width).toBeLessThanOrEqual(width - 8);
    expect(point.y + ASSISTANT_TRIGGER_SIZE.height).toBeLessThanOrEqual(height - 8);
  });
});

describe("quick actions", () => {
  it("uses unique labels and executable questions", () => {
    expect(new Set(quickActions.map((action) => action.label)).size).toBe(
      quickActions.length,
    );
    expect(quickActions.every((action) => action.question.trim().length > 8)).toBe(
      true,
    );
  });
});
