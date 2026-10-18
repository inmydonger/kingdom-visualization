import * as THREE from 'three';
import { STATES, pointInPolygon, type Point } from './atlas-data';
import { discoveryChapter } from './progression';
import { worldPoint } from './map-geometry';

const STEP=0.65;
export function createFrontierGeometry(chapter:number):THREE.BufferGeometry {
  const vertices:THREE.Vector3[]=[];
  for(let y=5;y<72;y+=STEP)for(let x=5;x<94;x+=STEP) {
    if(!STATES.some(state=>pointInPolygon([x+STEP/2,y+STEP/2],state.territory)))continue;
    const corners:Point[]=[[x,y],[x+STEP,y],[x+STEP,y+STEP],[x,y+STEP]];
    const values=corners.map(p=>discoveryChapter(...p)-chapter);
    if(values.every(v=>v<=0)||values.every(v=>v>0))continue;
    const crossings:THREE.Vector3[]=[];
    for(let i=0;i<4;i++) {
      const j=(i+1)%4;
      if((values[i]<=0)===(values[j]<=0))continue;
      const t=values[i]/(values[i]-values[j]);
      crossings.push(worldPoint([corners[i][0]+(corners[j][0]-corners[i][0])*t,corners[i][1]+(corners[j][1]-corners[i][1])*t],0.17));
    }
    for(let i=0;i+1<crossings.length;i+=2)vertices.push(crossings[i],crossings[i+1]);
  }
  return new THREE.BufferGeometry().setFromPoints(vertices);
}
