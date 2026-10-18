import type { Point } from './atlas-data';

type Territory = { id: string; territory: Point[] };
const pointKey = (p: Point) => `${p[0]},${p[1]}`;
const edgeKey = (a: Point, b: Point) => [pointKey(a), pointKey(b)].sort().join('|');

/** Smooth each shared frontier once, so adjacent regions cannot open cracks. */
export function smoothTerritories(states: Territory[], anchors: readonly Point[] = []): Map<string, Point[]> {
  const polygons = states.map(state => ({ ...state, territory: state.territory.flatMap((a, i) => {
    const b = state.territory[(i + 1) % state.territory.length];
    const onEdge = anchors.filter(p => {
      const cross = (p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]);
      const dot = (p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]);
      return Math.abs(cross)<1e-7 && dot>1e-7 && dot<(b[0]-a[0])**2+(b[1]-a[1])**2-1e-7;
    }).sort((p,q)=>Math.hypot(p[0]-a[0],p[1]-a[1])-Math.hypot(q[0]-a[0],q[1]-a[1]));
    return [a,...onEdge];
  }) }));
  const owners = new Map<string, string[]>();
  for (const state of polygons) state.territory.forEach((a,i) => {
    const key=edgeKey(a,state.territory[(i+1)%state.territory.length]);
    owners.set(key,[...(owners.get(key)??[]),state.id]);
  });
  const cache = new Map<string,Point[]>(), result = new Map<string,Point[]>();
  const protectedPoints = new Set(anchors.map(pointKey));
  function smooth(points: Point[]): Point[] {
    const forward=points.map(pointKey).join(';'), backward=[...points].reverse().map(pointKey).join(';');
    const reversed=backward<forward, key=reversed?backward:forward;
    let path=cache.get(key);
    if(!path){
      path=reversed?[...points].reverse():[...points];
      // Endpoint-preserving corner cutting keeps every three-state junction fixed.
      for(let round=0;round<3;round++){
        const next:Point[]=[path[0]];
        for(let i=0;i<path.length-1;i++){
          const a=path[i],b=path[i+1];
          next.push([a[0]*.8+b[0]*.2,a[1]*.8+b[1]*.2],[a[0]*.2+b[0]*.8,a[1]*.2+b[1]*.8]);
        }
        next.push(path[path.length-1]);path=next;
      }
      cache.set(key,path);
    }
    return reversed?[...path].reverse():path;
  }
  for(const state of polygons){
    const p=state.territory,n=p.length;
    const labels=p.map((a,i)=>owners.get(edgeKey(a,p[(i+1)%n]))!.sort().join('/'));
    const isStart=(i:number)=>labels[i]!==labels[(i+n-1)%n]||protectedPoints.has(pointKey(p[i]));
    let start=p.findIndex((_,i)=>isStart(i));if(start<0)start=0;
    const output:Point[]=[];let consumed=0;
    while(consumed<n){
      const run:Point[]=[p[(start+consumed)%n]];
      do{consumed++;run.push(p[(start+consumed)%n]);}while(consumed<n&&!isStart((start+consumed)%n));
      output.push(...smooth(run).slice(0,-1));
    }
    result.set(state.id,output);
  }
  return result;
}
