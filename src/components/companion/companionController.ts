import type { RobotAction } from "@/components/cockpit/RobotScene";

export type CompanionMood =
  | "engaged"
  | "attention"
  | "thinking"
  | "retrieving"
  | "working"
  | "success"
  | "clarifying"
  | "error"
  | "sleeping";

export type CompanionActivity =
  | "idle"
  | "understanding"
  | "intent_identified"
  | "data_retrieved"
  | "records_normalized"
  | "metrics_calculated"
  | "quality_checked"
  | "insight_generated"
  | "clarification"
  | "error";

export const ATTENTION_AFTER_MS = 12_000;
export const SLEEP_AFTER_MS = 60_000;
export const CUTE_MIN_MS = 12_000;
export const CUTE_MAX_MS = 20_000;

export const CUTE_ACTIONS: RobotAction[] = [
  "wave",
  "dance",
  "nod",
  "think",
  "happy",
];

export function moodFromActivity(activity: CompanionActivity): CompanionMood {
  if (activity === "error") return "error";
  if (activity === "clarification") return "clarifying";
  if (activity === "understanding" || activity === "intent_identified")
    return "thinking";
  if (activity === "data_retrieved" || activity === "records_normalized")
    return "retrieving";
  if (
    activity === "metrics_calculated" ||
    activity === "quality_checked"
  )
    return "working";
  if (activity === "insight_generated") return "success";
  return "engaged";
}

export function actionFromMood(mood: CompanionMood): RobotAction {
  switch (mood) {
    case "sleeping":
      return "sleep";
    case "thinking":
    case "retrieving":
      return "think";
    case "working":
      return "work";
    case "success":
      return "happy";
    case "clarifying":
      return "nod";
    case "error":
      return "think";
    case "attention":
      return "wave";
    default:
      return "idle";
  }
}

export function nextIdleMood(idleMs: number): CompanionMood {
  if (idleMs >= SLEEP_AFTER_MS) return "sleeping";
  if (idleMs >= ATTENTION_AFTER_MS) return "attention";
  return "engaged";
}

export function pickCuteAction(
  previous: RobotAction | null,
  random = Math.random,
): RobotAction {
  const choices = CUTE_ACTIONS.filter((action) => action !== previous);
  return choices[Math.floor(random() * choices.length)] ?? "wave";
}

export function nextCuteDelay(random = Math.random) {
  return CUTE_MIN_MS + Math.floor(random() * (CUTE_MAX_MS - CUTE_MIN_MS));
}

export function shouldPlayCuteAction(input: {
  mood: CompanionMood;
  typing: boolean;
  dialogOpen: boolean;
  loading: boolean;
  dragging: boolean;
  reducedMotion: boolean;
  hidden: boolean;
}) {
  return (
    input.mood === "attention" &&
    !input.typing &&
    !input.dialogOpen &&
    !input.loading &&
    !input.dragging &&
    !input.reducedMotion &&
    !input.hidden
  );
}
