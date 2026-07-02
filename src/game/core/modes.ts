import type { ModeId } from "./types";
import { TICKS_PER_SECOND } from "./types";

export interface ModeConfig {
  id: ModeId;
  /** 'curve' follows the guideline gravity curve; fixedLevel pins gravity to one level's speed */
  gravity: "curve" | { fixedLevel: number };
  /** marathon allows user-selectable 1–15; sprint/ultra always 1 */
  startLevel: number;
  /** when true, level = startLevel + floor(lines / 10), clamped to MAX_LEVEL */
  leveling: boolean;
  end: { lines: number } | { timeTicks: number } | null;
  /** leaderboard sort: score desc, or elapsed ticks asc (sprint) */
  rankMetric: "score" | "timeTicks";
}

export const MODES: Record<ModeId, ModeConfig> = {
  marathon: {
    id: "marathon",
    gravity: "curve",
    startLevel: 1,
    leveling: true,
    end: null,
    rankMetric: "score",
  },
  sprint: {
    id: "sprint",
    gravity: { fixedLevel: 1 },
    startLevel: 1,
    leveling: false,
    end: { lines: 40 },
    rankMetric: "timeTicks",
  },
  ultra: {
    id: "ultra",
    gravity: "curve",
    startLevel: 1,
    leveling: true,
    end: { timeTicks: 120 * TICKS_PER_SECOND },
    rankMetric: "score",
  },
};

export const MODE_IDS = Object.keys(MODES) as ModeId[];

export const MODE_LABELS: Record<ModeId, string> = {
  marathon: "Marathon",
  sprint: "Sprint · 40 lines",
  ultra: "Ultra · 2:00",
};
