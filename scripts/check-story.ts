import assert from "node:assert/strict";
import { STATES, pointInPolygon } from "../lib/atlas-data";
import { LATEST_RELEASE_CHAPTER, isDiscovered } from "../lib/progression";
import { ARCS, STORY_SITES, getArcDetails, getSiteArcs, isSiteDiscovered } from "../lib/story-data";

const expectedRanges: [string, number, number | null][] = [
  ["sei-kyou-rebellion", 1, 47], ["keiyou-campaign", 48, 73], ["escape-from-zhao", 74, 81],
  ["assassination-plot", 82, 100], ["training", 101, 107], ["battle-of-bayou", 108, 173],
  ["alliance", 174, 182], ["third-faction", 183, 188], ["sanyou-campaign", 189, 243],
  ["sanyou-aftermath", 244, 256], ["coalition-invasion", 257, 356], ["kyou-kai-revenge", 357, 365],
  ["conspiracy-in-court", 366, 378], ["fire-dragons", 379, 401], ["state-of-ai", 402, 437],
  ["koku-you", 438, 484], ["bureaucrats-job", 485, 495], ["western-zhao", 496, 642],
  ["zhao-crisis", 643, 648], ["three-states", 649, 661], ["shiyuu-conflict", 662, 670],
  ["eikyuu", 671, 701], ["zhao-retaliation", 702, 755], ["nature-of-humanity", 756, 768],
  ["hango", 769, 799], ["three-pillars", 800, 812], ["conquest-of-han", 813, 844],
  ["great-qin-zhao-war", 845, null],
];

assert.equal(ARCS.length, 28);
assert.equal(STORY_SITES.length, 20);
assert.equal(new Set(ARCS.map(arc => arc.id)).size, ARCS.length);
assert.equal(new Set(STORY_SITES.map(site => site.id)).size, STORY_SITES.length);
assert.deepEqual(ARCS.map(arc => [arc.id, arc.chapterStart, arc.chapterEnd]), expectedRanges);
assert.equal(ARCS.filter(arc => arc.chapterEnd === null).length, 1);
assert.deepEqual(STORY_SITES.filter(site => site.tier === "major").map(site => site.id).sort(), ["gyou", "hangu-pass"]);

for (const site of STORY_SITES) {
  assert(site.position.every(Number.isFinite), `${site.id} has finite coordinates`);
  const owners = STATES.filter(state => pointInPolygon(site.position, state.territory));
  assert(owners.length > 0, `${site.id} sits on the atlas`);
  if (site.stateId !== "multi") assert(owners.some(state => state.id === site.stateId), `${site.id} sits in ${site.stateId}`);
  assert(site.arcIds.length > 0);
  assert.deepEqual(ARCS.filter(arc => arc.siteId === site.id).map(arc => arc.id), site.arcIds, `${site.id} has reciprocal arc references`);
  const earliest = Math.min(...site.arcIds.map(id => ARCS.find(arc => arc.id === id)!.chapterStart));
  if (earliest > 1) assert.equal(isSiteDiscovered(site.id, earliest - 1), false, "Unstarted sites cannot expose details");
  let previous = false;
  for (let chapter = 1; chapter <= LATEST_RELEASE_CHAPTER; chapter++) {
    const discovered = isSiteDiscovered(site.id, chapter);
    if (chapter < earliest) assert.equal(discovered, false, "All future sites stay absent before their first arc");
    if (previous) assert(discovered, "Increasing progress cannot hide a site");
    if (discovered) {
      assert(getSiteArcs(site.id, chapter).every(arc => arc.chapterStart <= chapter));
      if (site.arcIds.every(id => ARCS.find(arc => arc.id === id)!.chapterEnd === null)) {
        assert(isDiscovered(site.position, chapter), "An ongoing-only site still obeys the endgame frontier");
      }
    }
    previous = discovered;
  }
  for (const chapter of [1, 100, 438, 642, 844, 845, 890]) {
    const future = getSiteArcs(site.id, chapter).filter(arc => arc.chapterStart > chapter);
    assert.equal(future.length, 0, "Future titles stay out of shared-site cards");
  }
}

for (const arc of ARCS) {
  assert(STORY_SITES.some(site => site.id === arc.siteId));
  assert(arc.premise.length > 30 && arc.summary.length > 30);
  const unfinished = getArcDetails(arc, arc.chapterStart);
  assert.equal(unfinished.inProgress, true);
  assert.equal(unfinished.summary, arc.premise);
  assert.deepEqual(unfinished.keyFigures, []);
  assert.equal(unfinished.territoryDelta, "Not yet concluded at your chapter.");
  if (arc.chapterEnd !== null) {
    assert.equal(isSiteDiscovered(arc.siteId, arc.chapterEnd), true, `${arc.id} is available once the reader has finished it`);
    assert.equal(getArcDetails(arc, arc.chapterEnd - 1).inProgress, true);
    const finished = getArcDetails(arc, arc.chapterEnd);
    assert.equal(finished.inProgress, false);
    assert.equal(finished.summary, arc.summary);
    assert.deepEqual(finished.keyFigures, arc.keyFigures);
    assert.equal(finished.territoryDelta, arc.territoryDelta);
    assert.deepEqual(getArcDetails(arc, arc.chapterStart), unfinished, "Moving progress backward removes completed details");
  } else {
    for (const chapter of [845, 890, 9999]) {
      const details = getArcDetails(arc, chapter);
      assert.equal(details.inProgress, true);
      assert.equal(details.summary, arc.premise);
      assert.deepEqual(details.keyFigures, []);
      assert.equal(details.territoryDelta, "Not yet concluded at your chapter.");
    }
    assert.equal(arc.summary, arc.premise, "The ongoing dataset itself contains only the premise");
    assert.deepEqual(arc.keyFigures, []);
  }
}

assert.equal(isSiteDiscovered("gyou", 495), false);
assert.equal(isSiteDiscovered("gyou", 642), true);
assert.equal(isSiteDiscovered("gyou", 845), true, "Gyou is available for Phase 3 acceptance");
assert.equal(isSiteDiscovered("zhao-endgame", 845), false, "The ongoing endgame remains a silhouette at the default chapter");
assert.equal(isSiteDiscovered("zhao-endgame", 890), true, "The ongoing premise opens as the frontier advances");
assert.equal(isSiteDiscovered("kantan-streets", 100), true, "The completed flashback exposes its known location");
assert.equal(isDiscovered(STORY_SITES.find(site => site.id === "kantan-streets")!.position, 100), false, "A known flashback pin does not change terrain discovery");
assert.deepEqual(getSiteArcs("kantan-streets", 100).map(arc => arc.id), ["escape-from-zhao"], "The later Kantan crisis stays absent");
assert.equal(isSiteDiscovered("shintei", 768), true, "The Han visit is available at its completion");
assert.deepEqual(getSiteArcs("shintei", 812).map(arc => arc.id), ["nature-of-humanity"]);
assert.deepEqual(getSiteArcs("kanyou-court", 100).map(arc => arc.id), ["sei-kyou-rebellion", "assassination-plot"]);
assert.equal(isSiteDiscovered("missing-site", 845), false);
assert.deepEqual(getSiteArcs("missing-site", 845), []);

console.log("Story data validated: 28 authoritative arc ranges, 20 placed sites, chapter-gated shared cards, reversible completion details, and a premise-only ongoing arc.");
