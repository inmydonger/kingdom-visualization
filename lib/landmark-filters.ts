import { STATES, type StateId } from "./atlas-data";
import { isDiscovered, normalizeChapter } from "./progression";
import { isStateDiscovered } from "./state-discovery";
import { ARCS, STORY_SITES, isSiteDiscovered, type StoryArc, type StorySite } from "./story-data";

export type LandmarkFilters = {
  state: "all" | StateId | "multi";
  arc: "all" | string;
};

export const DEFAULT_FILTERS: LandmarkFilters = { state: "all", arc: "all" };

/** Filter choices contain only started arcs at story locations already revealed. */
export function getFilterArcs(chapter: number, state: LandmarkFilters["state"]): StoryArc[] {
  const normalizedChapter = normalizeChapter(chapter);
  return ARCS.filter(arc => arc.chapterStart <= normalizedChapter
    && isSiteDiscovered(arc.siteId, normalizedChapter)
    && (state === "all" || arc.stateId === state));
}

export function normalizeFilters(value: Partial<LandmarkFilters> | null | undefined, chapter: number): LandmarkFilters {
  const candidate = value?.state;
  const state = candidate === "multi" || STATES.some(state => state.id === candidate && isStateDiscovered(state.id, chapter))
    ? candidate as StateId | "multi" : "all";
  const arc = getFilterArcs(chapter, state).find(arc => arc.id === value?.arc)?.id ?? "all";
  return { state, arc };
}

/** Multi-state sites are a separate category rather than an implicit part of Qin or Zhao. */
export function matchesSiteFilters(site: StorySite, filters: LandmarkFilters, chapter: number): boolean {
  const normalized = normalizeFilters(filters, chapter);
  if (normalized.state !== "all" && site.stateId !== normalized.state) return false;
  return normalized.arc === "all" || getFilterArcs(chapter, normalized.state)
    .some(arc => arc.id === normalized.arc && arc.siteId === site.id);
}

export function getVisibleSites(chapter: number, filters: LandmarkFilters, showSilhouettes: boolean): StorySite[] {
  return STORY_SITES.filter(site => isSiteDiscovered(site.id, chapter)
    && matchesSiteFilters(site, filters, chapter)
    && (showSilhouettes || isDiscovered(site.position, chapter)));
}

/** Arc selection changes emphasis, while every chapter-safe landmark stays on the map. */
export function getMapSites(chapter: number, showSilhouettes: boolean): StorySite[] {
  return getVisibleSites(chapter, DEFAULT_FILTERS, showSilhouettes);
}
