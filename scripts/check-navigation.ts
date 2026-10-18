import assert from 'node:assert/strict';
import { getArcDestination } from '../lib/atlas-navigation';
import { getVolumeArc, VOLUMES } from '../lib/media-data';
import { getReaderFrontierPoint, isDiscovered } from '../lib/progression';
import { isStateDiscovered } from '../lib/state-discovery';
import { STORY_SITES } from '../lib/story-data';

for(const volume of VOLUMES){
  const chapter=volume.chapters[0],arc=getVolumeArc(volume)!;
  assert(arc.chapterStart<=chapter);
  for(const silhouettes of [true,false]){
    const destination=getArcDestination(arc.id,chapter,silhouettes)!;
    assert(destination.stateId===null||isStateDiscovered(destination.stateId,chapter));
    if(!silhouettes)assert(isDiscovered(destination.point,chapter),`Volume ${volume.volume} cannot fly into fully hidden terrain`);
  }
}
assert.equal(getVolumeArc(60)?.id,'zhao-crisis');
assert.deepEqual(getArcDestination('escape-from-zhao',100,true)?.point,STORY_SITES.find(site=>site.id==='kantan-streets')?.position);
assert.deepEqual(getArcDestination('escape-from-zhao',100,false)?.point,getReaderFrontierPoint(100));
assert.equal(getArcDestination('escape-from-zhao',100,true)?.stateId,null);
assert.deepEqual(getArcDestination('great-qin-zhao-war',845,true)?.point,getReaderFrontierPoint(845));
assert.equal(getArcDestination('missing',845,true),undefined);
console.log('Navigation validated: 80 volume destinations, first-chapter gates, state locks, flashbacks, and fully hidden terrain.');
