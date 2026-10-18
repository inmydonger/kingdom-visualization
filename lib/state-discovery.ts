import type { StateId } from './atlas-data';
import { normalizeChapter } from './progression';

// Earliest territory revealed by each state's spatial discovery field.
const FIRST_TERRITORY_CHAPTER: Record<StateId, number> = {
  qin: 1, wei: 48, zhao: 108, han: 756, chu: 649, yan: 700, qi: 700,
};

export function isStateDiscovered(stateId: StateId, chapter: number): boolean {
  return normalizeChapter(chapter) >= FIRST_TERRITORY_CHAPTER[stateId];
}
