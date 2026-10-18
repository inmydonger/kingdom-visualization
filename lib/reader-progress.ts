import { normalizeChapter } from './progression';

/** Reading backwards is navigation, not a reason to erase discovered geography. */
export function advanceExploration(previous: number | null | undefined, chapter: number): number {
  const next=normalizeChapter(chapter);
  return previous===null||previous===undefined||!Number.isFinite(previous)?next:Math.max(normalizeChapter(previous),next);
}

export function restoreExploration(current: number, savedExploration: string | null, savedChapter: string | null): number {
  let explored=current;
  for(const value of [savedExploration,savedChapter]){
    if(value?.trim() && Number.isFinite(Number(value))) explored=advanceExploration(explored,Number(value));
  }
  return explored;
}
