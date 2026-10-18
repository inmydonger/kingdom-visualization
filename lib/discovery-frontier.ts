import * as THREE from 'three';
import { STATES, pointInPolygon, type Point } from './atlas-data';
import { discoveryChapter } from './progression';
import { worldPoint } from './map-geometry';

const STEP=0.32;
export function createFrontierGeometry(chapter:number):THREE.BufferGeometry {
  const vertices:THREE.Vector3[]=[];
  // After chapter 820 every remaining frontier lies in Zhao's endgame pocket.
  const bounds=chapter>=820?{left:46,right:64,top:16,bottom:34}:{left:5,right:94,top:5,bottom:72};
  const levels=new Map<string,number>();
  const level=(p:Point)=>{const key=`${p[0].toFixed(4)},${p[1].toFixed(4)}`;let value=levels.get(key);if(value===undefined){value=discoveryChapter(...p)-chapter;levels.set(key,value);}return value;};
  for(let y=bounds.top;y<bounds.bottom;y+=STEP)for(let x=bounds.left;x<bounds.right;x+=STEP) {
    if(!STATES.some(state=>pointInPolygon([x+STEP/2,y+STEP/2],state.territory)))continue;
    const corners:Point[]=[[x,y],[x+STEP,y],[x+STEP,y+STEP],[x,y+STEP]];
    const values=corners.map(level);
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
  // Connect marching-square segments before rounding their small grid corners.
  const nodes=new Map<string,{point:THREE.Vector3;neighbors:string[]}>();
  const key=(p:THREE.Vector3)=>`${p.x.toFixed(4)},${p.z.toFixed(4)}`;
  for(let i=0;i<vertices.length;i+=2){
    const a=key(vertices[i]),b=key(vertices[i+1]);
    if(a===b)continue;
    if(!nodes.has(a))nodes.set(a,{point:vertices[i],neighbors:[]});
    if(!nodes.has(b))nodes.set(b,{point:vertices[i+1],neighbors:[]});
    nodes.get(a)!.neighbors.push(b);nodes.get(b)!.neighbors.push(a);
  }
  const used=new Set<string>(),edges:THREE.Vector3[]=[];
  const edge=(a:string,b:string)=>[a,b].sort().join('|');
  for(const [start,node] of [...nodes].sort((a,b)=>a[1].neighbors.length-b[1].neighbors.length)){
    for(const neighbor of node.neighbors){
      if(used.has(edge(start,neighbor)))continue;
      let previous=start,current=neighbor;
      let path=[node.point,nodes.get(current)!.point];used.add(edge(previous,current));
      while(current!==start){
        const next=nodes.get(current)!.neighbors.find(n=>!used.has(edge(current,n)));
        if(!next)break;used.add(edge(current,next));previous=current;current=next;path.push(nodes.get(current)!.point);
      }
      if(path.length>3){
        const closed=current===start;if(closed)path=path.slice(0,-1);
        for(let round=0;round<2;round++){
          const rounded:THREE.Vector3[]=closed?[]:[path[0]];
          for(let i=0;i<(closed?path.length:path.length-1);i++){
            const a=path[i],b=path[(i+1)%path.length];
            rounded.push(a.clone().lerp(b,.25),a.clone().lerp(b,.75));
          }
          if(!closed)rounded.push(path[path.length-1]);path=rounded;
        }
        if(closed)path.push(path[0]);
      }
      for(let i=1;i<path.length;i++)for(const p of [path[i-1],path[i]])edges.push(worldPoint([p.x+50,p.z+36],.18));
    }
  }
  return new THREE.BufferGeometry().setFromPoints(edges);
}
