import { type Point, type StateId } from './atlas-data';
import { getReaderFrontierPoint, isDiscovered } from './progression';
import { STORY_SITES, isSiteDiscovered } from './story-data';
import { isStateDiscovered } from './state-discovery';

export function getArcDestination(arcId:string,chapter:number,showSilhouettes:boolean):{point:Point;stateId:StateId|null}|undefined{
  const site=STORY_SITES.find(candidate=>candidate.arcIds.includes(arcId));
  if(!site)return;
  const visible=isSiteDiscovered(site.id,chapter)&&(showSilhouettes||isDiscovered(site.position,chapter));
  return {
    point:visible?site.position:getReaderFrontierPoint(chapter),
    stateId:site.stateId!=='multi'&&isStateDiscovered(site.stateId,chapter)?site.stateId:null,
  };
}
