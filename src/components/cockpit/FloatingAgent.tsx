"use client";

import dynamic from "next/dynamic";
import {
  FormEvent,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import type { RobotAction } from "./RobotScene";
import { quickActions } from "./QuickActions";
import {
  ASSISTANT_TRIGGER_SIZE,
  clampAssistantPosition,
  type AssistantPoint,
} from "./assistantPosition";

const RobotScene = dynamic(() => import("./RobotScene"), { ssr: false });
const POSITION_KEY = "skylark-agent-position";

const agentPrompts = quickActions.slice(0, 3).map((action) => action.question);

export function FloatingAgent({
  connected,
  loading,
  onAsk,
}: {
  connected: boolean;
  loading: boolean;
  onAsk: (question: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [action, setAction] = useState<RobotAction>("sleep");
  const [position, setPosition] = useState<AssistantPoint | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const didDrag = useRef(false);
  const drag = useRef<{
    pointerId: number;
    origin: AssistantPoint;
    start: AssistantPoint;
  } | null>(null);

  useEffect(() => {
    const initialize = () => {
      const nextViewport = { width: window.innerWidth, height: window.innerHeight };
      setViewport(nextViewport);
      let saved: AssistantPoint | null = null;
      try {
        saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null") as AssistantPoint | null;
      } catch {
        saved = null;
      }
      setPosition(
        clampAssistantPosition(
          saved ?? {
            x: nextViewport.width - ASSISTANT_TRIGGER_SIZE.width - 26,
            y: nextViewport.height - ASSISTANT_TRIGGER_SIZE.height - 18,
          },
          nextViewport.width,
          nextViewport.height,
        ),
      );
    };
    const frame = requestAnimationFrame(initialize);
    const resize = () => {
      const next = { width: window.innerWidth, height: window.innerHeight };
      setViewport(next);
      setPosition((current) =>
        clampAssistantPosition(
          current ?? {
            x: next.width - ASSISTANT_TRIGGER_SIZE.width - 26,
            y: next.height - ASSISTANT_TRIGGER_SIZE.height - 18,
          },
          next.width,
          next.height,
        ),
      );
    };
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      if (actionTimer.current) clearTimeout(actionTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAction("sleep");
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  function play(
    next: RobotAction,
    duration = 1800,
    settle: RobotAction = open ? "happy" : "sleep",
  ) {
    if (actionTimer.current) clearTimeout(actionTimer.current);
    setAction(next);
    actionTimer.current = setTimeout(() => setAction(settle), duration);
  }

  function closePanel() {
    setOpen(false);
    play("nod", 900, "sleep");
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function resetPosition() {
    const next = clampAssistantPosition(
      {
        x: window.innerWidth - ASSISTANT_TRIGGER_SIZE.width - 26,
        y: window.innerHeight - ASSISTANT_TRIGGER_SIZE.height - 18,
      },
      window.innerWidth,
      window.innerHeight,
    );
    setPosition(next);
    localStorage.removeItem(POSITION_KEY);
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary || !position) return;
    drag.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: position,
    };
    didDrag.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.origin.x;
    const dy = event.clientY - current.origin.y;
    if (!didDrag.current && Math.hypot(dx, dy) < 5) return;
    didDrag.current = true;
    event.preventDefault();
    setPosition(
      clampAssistantPosition(
        { x: current.start.x + dx, y: current.start.y + dy },
        window.innerWidth,
        window.innerHeight,
      ),
    );
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const finalPosition = clampAssistantPosition(
      {
        x: current.start.x + event.clientX - current.origin.x,
        y: current.start.y + event.clientY - current.origin.y,
      },
      window.innerWidth,
      window.innerHeight,
    );
    drag.current = null;
    if (didDrag.current) {
      setPosition(finalPosition);
      localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition));
    }
  }

  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onAsk(trimmed);
    play("happy", 1000, "sleep");
    setQuestion("");
    setOpen(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panelRef.current) return;
    const controls = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex="0"]',
      ),
    );
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const containerStyle: CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : { opacity: 0 };
  const panelStyle: CSSProperties =
    position && viewport.width
      ? {
          left:
            position.x + ASSISTANT_TRIGGER_SIZE.width + 320 < viewport.width
              ? position.x + ASSISTANT_TRIGGER_SIZE.width + 10
              : Math.max(8, position.x - 320),
          top: Math.min(
            Math.max(8, position.y - 230),
            Math.max(8, viewport.height - 430),
          ),
        }
      : {};

  return (
    <>
      {open && (
        <>
          <button
            className="agent-backdrop"
            onClick={closePanel}
            aria-label="Close assistant dialog"
            tabIndex={-1}
          />
          <div
            ref={panelRef}
            className="agent-panel"
            style={panelStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-dialog-title"
            onKeyDown={trapFocus}
          >
          <div
            className="agent-panel-head drag-handle"
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div>
              <span className="agent-status">
                <i className={connected ? "online" : ""} />
                {connected ? "Live data ready" : "Setup needed"}
              </span>
              <h3 id="agent-dialog-title">Ask Skylark</h3>
            </div>
            <button onClick={closePanel} aria-label="Close assistant">×</button>
          </div>
          <p>I can check your pipeline, delivery risks and leadership metrics.</p>
          <div className="agent-prompts">
            {agentPrompts.map((prompt) => (
              <button key={prompt} onClick={() => ask(prompt)} disabled={loading}>
                {prompt}<span>↗</span>
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <input
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask a business question…"
              aria-label="Ask the Skylark assistant"
            />
            <button disabled={!question.trim() || loading} aria-label="Send">↑</button>
          </form>
          <div className="agent-panel-footer">
            <small>Answers open in the verified analysis workspace.</small>
            <button onClick={resetPosition}>Reset position</button>
          </div>
          </div>
        </>
      )}
      <section
        className={`floating-agent ${open ? "open" : ""}`}
        style={containerStyle}
      >
        <button
          ref={triggerRef}
          className="agent-trigger drag-handle"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => {
            if (didDrag.current) {
              didDrag.current = false;
              return;
            }
            const nextOpen = !open;
            setOpen(nextOpen);
            play(nextOpen ? "wave" : "nod", 1800, "sleep");
          }}
          aria-label={open ? "Close AI assistant" : "Open AI assistant"}
          aria-expanded={open}
        >
          <span className="agent-orbit" />
          <span className="robot-canvas" aria-hidden="true">
            <RobotScene action={loading ? "work" : action} active={open || loading} />
          </span>
          {!open && <b>Ask me</b>}
        </button>
      </section>
    </>
  );
}
