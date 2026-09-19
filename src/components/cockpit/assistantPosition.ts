export type AssistantPoint = { x: number; y: number };

export const ASSISTANT_TRIGGER_SIZE = { width: 112, height: 150 } as const;

export function clampAssistantPosition(
  point: AssistantPoint,
  width: number,
  height: number,
): AssistantPoint {
  return {
    x: Math.min(
      Math.max(8, point.x),
      Math.max(8, width - ASSISTANT_TRIGGER_SIZE.width - 8),
    ),
    y: Math.min(
      Math.max(8, point.y),
      Math.max(8, height - ASSISTANT_TRIGGER_SIZE.height - 8),
    ),
  };
}
