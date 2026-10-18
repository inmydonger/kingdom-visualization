import { STATES, pointInPolygon, type Point } from "./atlas-data";

export const DEFAULT_READER_CHAPTER = 845;
// User-supplied estimate from the build brief; update after checking the release.
export const LATEST_RELEASE_CHAPTER = 890;

export function normalizeChapter(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_READER_CHAPTER;
  return Math.min(LATEST_RELEASE_CHAPTER, Math.max(1, Math.trunc(value)));
}

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

/**
 * Schematic reading geography, not a claim that a chapter reveals an entire state.
 * Coordinates use atlas space: x east 0–100, y south 0–72. The Kantan flashback
 * deliberately does not open Zhao's later campaigns or the endgame pocket.
 */
export function discoveryChapter(x: number, y: number): number {
  const state = STATES.find(candidate => pointInPolygon([x, y], candidate.territory));
  switch (state?.id) {
    case "qin":
      return 1 + 46 * smoothstep(4, 26, Math.hypot(x - 31, y - 33));
    case "wei":
      return 48 + 331 * smoothstep(42, 65, x);
    case "zhao": {
      const campaigns = 108 + 330 * smoothstep(35, 43, x)
        + 58 * smoothstep(43, 51, x) + 273 * (1 - smoothstep(8, 23, y));
      const radius = Math.hypot((x - 55) / 8, (y - 25) / 8);
      const endgame = radius < 1 ? 845 + 105 * smoothstep(0, 1, 1 - radius) : 0;
      return Math.max(campaigns, endgame);
    }
    case "han":
      return 756 + 57 * smoothstep(41, 50, x + (y - 38) * 0.45);
    case "chu":
      return 649 + 100 * smoothstep(0, 52, Math.hypot(x - 42, (y - 44) * 1.2));
    case "yan":
      return 700 + 120 * smoothstep(57, 94, x + (18 - y) * 0.28);
    case "qi":
      return 700 + 115 * smoothstep(63, 92, x + (y - 32) * 0.3);
    default:
      return 48 + 770 * smoothstep(34, 94, x) + 20 * smoothstep(40, 72, y);
  }
}

export function isDiscovered(point: Point, chapter: number): boolean {
  return discoveryChapter(...point) <= normalizeChapter(chapter);
}

export function isHanConquered(chapter: number): boolean {
  return normalizeChapter(chapter) > 844;
}

/** Place chapter markers against the same spatial field used by the fog. */
export function getReaderFrontierPoint(value: number): Point {
  const chapter = normalizeChapter(value);
  if (chapter >= 820) {
    // Invert the endgame's radial smoothstep; the west edge is inside Zhao.
    const progress = Math.max(0, (chapter - 845) / 105);
    let low = 0, high = 1;
    for (let i = 0; i < 30; i++) {
      const middle = (low + high) / 2;
      if (smoothstep(0, 1, middle) < progress) low = middle;
      else high = middle;
    }
    return [47 + 8 * low, 25];
  }

  const hint: Point = chapter < 48 ? [31, 33]
    : chapter < 108 ? [44, 34]
      : chapter < 438 ? [41, 28]
        : chapter < 496 ? [44, 23]
          : chapter < 649 ? [48, 31]
            : chapter < 756 ? [55, 51] : [45, 41];
  let best: Point = [47, 25], bestScore = Infinity;
  for (let y = 5; y <= 72; y += 0.5) {
    for (let x = 5; x <= 94; x += 0.5) {
      const point: Point = [x, y], threshold = discoveryChapter(x, y);
      if (threshold > chapter || !STATES.some(state => pointInPolygon(point, state.territory))) continue;
      const hasFogNeighbor = [[x - 0.5, y], [x + 0.5, y], [x, y - 0.5], [x, y + 0.5]]
        .some(([nx, ny]) => discoveryChapter(nx, ny) > chapter);
      if (!hasFogNeighbor) continue;
      const score = Math.hypot(x - hint[0], y - hint[1]) + (chapter - threshold) * 0.015;
      if (score < bestScore) { best = point; bestScore = score; }
    }
  }
  return best;
}

export const LATEST_FRONTIER_POINT: Point = getReaderFrontierPoint(LATEST_RELEASE_CHAPTER);
