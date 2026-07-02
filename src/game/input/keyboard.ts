import type { InputAction } from "@/game/core/types";
import type { BindableAction } from "@/lib/settings/schema";

// Translates keydown/keyup into edge events for the engine's input queue.
// OS key auto-repeat is discarded — DAS/ARR live inside the engine so
// auto-shift is deterministic and replayable.

const HELD_ACTIONS = new Set<BindableAction>([
  "moveLeft",
  "moveRight",
  "softDrop",
]);
const TAP_ACTIONS = new Set<BindableAction>([
  "hardDrop",
  "rotateCw",
  "rotateCcw",
  "hold",
]);

export class KeyboardInput {
  private queue: InputAction[] = [];
  private codeToAction = new Map<string, BindableAction>();
  private enabled = false;
  private onPause: () => void = () => {};

  setBindings(bindings: Record<BindableAction, string[]>): void {
    this.codeToAction.clear();
    for (const [action, codes] of Object.entries(bindings) as [
      BindableAction,
      string[],
    ][]) {
      for (const code of codes) this.codeToAction.set(code, action);
    }
  }

  setPauseHandler(handler: () => void): void {
    this.onPause = handler;
  }

  /** Engine input only flows while enabled (phase === playing). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.queue = [];
  }

  attach(target: Window): () => void {
    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    return () => {
      target.removeEventListener("keydown", this.handleKeyDown);
      target.removeEventListener("keyup", this.handleKeyUp);
    };
  }

  /** Push an action programmatically (touch controls reuse the same queue). */
  push(action: InputAction): void {
    this.queue.push(action);
  }

  drain(): InputAction[] {
    if (this.queue.length === 0) return EMPTY;
    const drained = this.queue;
    this.queue = [];
    return drained;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = this.codeToAction.get(event.code);
    if (!action) return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (action === "pause") {
      event.preventDefault();
      this.onPause();
      return;
    }
    if (!this.enabled) return;
    event.preventDefault();
    if (HELD_ACTIONS.has(action)) {
      this.queue.push({
        action: action as "moveLeft" | "moveRight" | "softDrop",
        edge: "press",
      });
    } else if (TAP_ACTIONS.has(action)) {
      this.queue.push({
        action: action as "hardDrop" | "rotateCw" | "rotateCcw" | "hold",
      });
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = this.codeToAction.get(event.code);
    if (!action || !this.enabled) return;
    if (HELD_ACTIONS.has(action)) {
      event.preventDefault();
      this.queue.push({
        action: action as "moveLeft" | "moveRight" | "softDrop",
        edge: "release",
      });
    }
  };
}

const EMPTY: InputAction[] = [];
