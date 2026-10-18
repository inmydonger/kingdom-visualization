import * as THREE from 'three';
import { STATES, type Point } from './atlas-data';
import { worldPoint, elevation } from './map-geometry';
import type { CampaignRoute } from './campaign-data';

function ribbon(path:Point[],widthAt:(t:number)=>number,lift:number){
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<path.length;i++){
    const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)];
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1,width=widthAt(i/(path.length-1));
    for(const sign of [-1,1]){
      const x=path[i][0]-50-dz/length*width*sign,z=path[i][1]-36+dx/length*width*sign;
      vertices.push(x,elevation(x,z)+lift,z);
    }
    if(i){const n=(i-1)*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
}
function material(color:string,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});}

export function createCampaignOverlay(routes:CampaignRoute[]):THREE.Group{
  const group=new THREE.Group();group.name='campaign-movements';
  group.userData.routeCount=routes.length;
  for(const route of routes){
    const curve=new THREE.CatmullRomCurve3(route.points.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'centripetal');
    const points=curve.getSpacedPoints(Math.max(50,Math.ceil(curve.getLength()*5))).map(p=>[p.x,p.z] as Point);
    const width=(t:number)=>t<.78?.46:1.36*(1-t)/.22;
    const color=STATES.find(s=>s.id===route.attacker)!.color;
    for(const [extra,lift,tint,opacity,order] of [[.17,.42,'#111d22',.8,10],[.09,.46,'#f1e8d2',.7,11],[0,.5,color,1,12]] as const){
      const mesh=new THREE.Mesh(ribbon(points,t=>t>.995?0:width(t)+extra,lift),material(tint,opacity));
      mesh.renderOrder=order;mesh.name=`${route.attacker}-to-${route.defender}`;group.add(mesh);
    }
    // Quiet directional chevrons reinforce direction without an idle animation.
    const markVertices:THREE.Vector3[]=[];
    for(let distance=3;distance<curve.getLength()*.7;distance+=3){
      const t=distance/curve.getLength(),p=curve.getPointAt(t),d=curve.getTangentAt(t);
      for(const side of [-1,1]){
        markVertices.push(worldPoint([p.x-d.x*.35-d.z*.28*side,p.z-d.z*.35+d.x*.28*side],.55),worldPoint([p.x+d.x*.16,p.z+d.z*.16],.55));
      }
    }
    const chevrons=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(markVertices),new THREE.LineBasicMaterial({color:'#f6edda',transparent:true,opacity:.6,depthTest:false,depthWrite:false,toneMapped:false}));chevrons.renderOrder=13;group.add(chevrons);
  }
  for(const defender of new Set(routes.map(r=>r.defender))){
    const state=STATES.find(s=>s.id===defender)!,targets=routes.filter(r=>r.defender===defender).map(r=>r.points.at(-1)!);
    const teeth:THREE.Vector3[]=[];let spacing=0;
    for(let i=0;i<state.territory.length;i++){
      const a=state.territory[i],b=state.territory[(i+1)%state.territory.length];
      if(!targets.some(t=>Math.hypot(a[0]-t[0],a[1]-t[1])<11&&Math.hypot(b[0]-t[0],b[1]-t[1])<11))continue;
      const mesh=new THREE.Mesh(ribbon([a,b],()=>.11,.32),material('#f0e7d3',.95));mesh.renderOrder=9;group.add(mesh);
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-6)continue;
      let nx=-dz/length,nz=dx/length;
      if(nx*(a[0]-state.label[0])+nz*(a[1]-state.label[1])<0){nx=-nx;nz=-nz;}
      for(let d=.8-spacing;d<length;d+=.8){
        const x=a[0]+dx*d/length,z=a[1]+dz*d/length;
        teeth.push(worldPoint([x,z],.34),worldPoint([x+nx*.48,z+nz*.48],.34));
      }
      spacing=(spacing+length)%.8;
    }
    const ticks=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(teeth),new THREE.LineBasicMaterial({color:'#f4ead7',transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false}));ticks.renderOrder=9;group.add(ticks);
  }
  return group;
}

export function disposeCampaignOverlay(group:THREE.Group){
  group.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){object.geometry.dispose();for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}});
}
