import assert from "node:assert/strict";
import { DEFAULT_FILTERS, getFilterArcs, getVisibleSites, matchesSiteFilters, normalizeFilters, type LandmarkFilters } from "../lib/landmark-filters";
import { ARCS, STORY_SITES } from "../lib/story-data";
import { isStateDiscovered } from "../lib/state-discovery";

assert.deepEqual(normalizeFilters(undefined, 845), DEFAULT_FILTERS);
assert.deepEqual(normalizeFilters(null, 845), DEFAULT_FILTERS);
assert.deepEqual(normalizeFilters({ state: "missing", arc: "unknown" } as unknown as LandmarkFilters, 845), DEFAULT_FILTERS);
assert.deepEqual(normalizeFilters({ state: "zhao", arc: "sei-kyou-rebellion" }, 845), { state: "zhao", arc: "all" });
assert.deepEqual(normalizeFilters({ state: "zhao", arc: "western-zhao" }, 845), { state: "zhao", arc: "western-zhao" });
assert.deepEqual(normalizeFilters({ state: "zhao", arc: "western-zhao" }, 100), DEFAULT_FILTERS, "Rolling chapters back clears an unreached state and arc");
assert.deepEqual(normalizeFilters({state:"yan",arc:"all"},100),DEFAULT_FILTERS,"A URL cannot select a locked state");
assert(isStateDiscovered('wei',100),"Western Wei is reached before its central label");
assert(!isStateDiscovered('zhao',100),"A flashback does not reveal Zhao territory");
for(const [state,first] of [['qin',1],['wei',48],['zhao',108],['chu',649],['yan',700],['qi',700],['han',756]] as const){
  assert(isStateDiscovered(state,first));
  if(first>1)assert(!isStateDiscovered(state,first-1));
}
assert.deepEqual(normalizeFilters({ state: "zhao", arc: "great-qin-zhao-war" }, 845), { state: "zhao", arc: "all" }, "A started arc at an unrevealed site cannot remain selected");

const earlyArcs = getFilterArcs(100, "all");
assert.deepEqual(earlyArcs.map(arc => arc.id), ["sei-kyou-rebellion", "keiyou-campaign", "escape-from-zhao", "assassination-plot"]);
assert(earlyArcs.every(arc => arc.chapterStart <= 100), "Filter options cannot reveal future arc titles");
assert.equal(getFilterArcs(100, "multi").length, 0);
assert(!getFilterArcs(845, "all").some(arc => arc.id === "great-qin-zhao-war"), "The spatially hidden ongoing arc title stays out of filter options");
assert(getFilterArcs(890, "zhao").some(arc => arc.id === "great-qin-zhao-war"), "The ongoing arc becomes a filter option once its site is revealed");
assert(getFilterArcs(100, "zhao").some(arc => arc.id === "escape-from-zhao"), "A known flashback remains a valid option within grey terrain");
assert.deepEqual(getFilterArcs(845, "multi").map(arc => arc.id), ["coalition-invasion", "shiyuu-conflict"]);
assert(getFilterArcs(845, "qin").every(arc => arc.stateId === "qin"));
assert(getFilterArcs(845, "zhao").every(arc => arc.stateId === "zhao"));

const zhao = getVisibleSites(845, { state: "zhao", arc: "all" }, true);
assert.equal(zhao.length, 8);
assert(zhao.every(site => site.stateId === "zhao"));
assert(!zhao.some(site => site.stateId === "multi"), "Multi-state sites do not enter a single-state result");
assert.deepEqual(getVisibleSites(845, { state: "multi", arc: "all" }, true).map(site => site.id), ["hangu-pass", "shiyuu-border"]);

for (const arc of ARCS.filter(arc => arc.chapterStart <= 845 && arc.id !== "great-qin-zhao-war")) {
  const sites = getVisibleSites(845, { state: "all", arc: arc.id }, true);
  assert.deepEqual(sites.map(site => site.id), [arc.siteId], `${arc.id} selects one shared or dedicated miniature`);
}
assert.equal(getVisibleSites(100, { state: "qin", arc: "all" }, true).length, 1, "Shared Qin arcs do not duplicate their miniature");
assert.deepEqual(getVisibleSites(100, { state: "all", arc: "assassination-plot" }, true).map(site => site.id), ["kanyou-court"]);
assert.deepEqual(getVisibleSites(845, { state: "han", arc: "nature-of-humanity" }, true).map(site => site.id), ["shintei"]);
assert.deepEqual(getVisibleSites(845, { state: "han", arc: "conquest-of-han" }, true).map(site => site.id), ["shintei"]);
assert(!matchesSiteFilters(STORY_SITES.find(site => site.id === "gyou")!, { state: "all", arc: "coalition-invasion" }, 845));

const earlyWithFog = getVisibleSites(100, DEFAULT_FILTERS, true).map(site => site.id);
const earlyWithoutFog = getVisibleSites(100, DEFAULT_FILTERS, false).map(site => site.id);
assert(earlyWithFog.includes("kantan-streets"), "A known flashback pin can stand within grey terrain");
assert(!earlyWithoutFog.includes("kantan-streets"), "Hiding unexplored land also removes known flashback pins within it");
assert(earlyWithoutFog.includes("kanyou-court"), "Discovered Qin sites remain when unexplored land is hidden");
assert(!getVisibleSites(845, DEFAULT_FILTERS, true).some(site => site.id === "zhao-endgame"));
assert(getVisibleSites(890, DEFAULT_FILTERS, true).some(site => site.id === "zhao-endgame"));
assert.deepEqual(STORY_SITES.find(site => site.id === "ai")!.position, [33, 14.5], "Filters preserve Taigen’s corrected northern Qin location");

console.log("Landmark filters validated: exact state categories, chapter-safe arc options, shared-site selection, chapter rollback, full fog hiding, and Taigen’s corrected position.");
