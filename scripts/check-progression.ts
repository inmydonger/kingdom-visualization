import assert from "node:assert/strict";
import { STATES, pointInPolygon, type Point } from "../lib/atlas-data";
import {
  DEFAULT_READER_CHAPTER, LATEST_RELEASE_CHAPTER, LATEST_FRONTIER_POINT,
  discoveryChapter, getReaderFrontierPoint,
  isDiscovered, isHanConquered, normalizeChapter,
} from "../lib/progression";

assert.equal(normalizeChapter(NaN), DEFAULT_READER_CHAPTER);
assert.equal(normalizeChapter(Infinity), LATEST_RELEASE_CHAPTER);
assert.equal(normalizeChapter(-Infinity), 1);
assert.equal(normalizeChapter(-4), 1);
assert.equal(normalizeChapter(100.9), 100);
assert.equal(normalizeChapter(9999), LATEST_RELEASE_CHAPTER);
assert.equal(isHanConquered(844), false);
assert.equal(isHanConquered(845), true);
assert.equal(isDiscovered([55, 25], 845), false, "The Zhao endgame remains undiscovered");
assert.equal(isDiscovered([56, 28], 81), false, "The Zhao flashback cannot unlock later campaigns");
assert.equal(isDiscovered([31, 33], 1), true, "The Qin heartland starts discovered");
assert.equal(isDiscovered([48, 31], 642), true, "Western Zhao opens before the endgame");

let earlyColored = 0, defaultFog = 0;
for (let y = 5.17; y < 72; y += 0.67) {
  for (let x = 5.13; x < 95; x += 0.73) {
    const point: Point = [x, y];
    const owner = STATES.find(state => pointInPolygon(point, state.territory));
    if (!owner) continue;
    const threshold = discoveryChapter(x, y);
    assert(Number.isFinite(threshold) && threshold >= 1 && threshold <= 950);
    assert.equal(threshold, discoveryChapter(x, y), "Discovery must be deterministic");
    if (isDiscovered(point, 100)) {
      earlyColored++;
      assert(x < 49 && (owner.id === "qin" || owner.id === "wei"), "Chapter 100 colors only western territory");
    }
    if (!isDiscovered(point, 845)) {
      defaultFog++;
      assert.equal(owner.id, "zhao", "All other states are discovered at chapter 845");
      assert(Math.hypot((x - 55) / 8, (y - 25) / 8) < 1, "Default fog stays inside the endgame pocket");
    }
    for (const chapter of [1, 48, 100, 438, 642, 755, 844, 845, 848, 890]) {
      if (isDiscovered(point, chapter)) assert(isDiscovered(point, Math.min(890, chapter + 1)), "Progress cannot hide discovered land");
    }
  }
}
assert(earlyColored > 500 && defaultFog > 100);
for (const chapter of [1, 47, 100, 438, 755, 813, 845, 848, 890]) {
  const point = getReaderFrontierPoint(chapter);
  assert(point.every(Number.isFinite));
  assert(STATES.some(state => pointInPolygon(point, state.territory)), "Markers sit on the atlas");
  assert([[0, 0], [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]
    .some(([dx, dy]) => isDiscovered([point[0] + dx, point[1] + dy], chapter)), "Frontier marker touches discovered ground");
  assert([[-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]
    .some(([dx, dy]) => !isDiscovered([point[0] + dx, point[1] + dy], chapter)), "Frontier marker touches fog");
}
assert(Math.abs(discoveryChapter(...getReaderFrontierPoint(848)) - 848) < 1e-5, "Ongoing progress reveals the pocket gradually");
assert(Math.abs(discoveryChapter(...LATEST_FRONTIER_POINT) - 890) < 1e-5);
console.log(`Progression validated: ${earlyColored} western samples at chapter 100; ${defaultFog} Zhao endgame fog samples at 845; monotonic discovery, Han conquest, and frontier markers.`);
