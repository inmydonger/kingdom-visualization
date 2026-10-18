import * as THREE from "three";
import { STATES, RIVERS, type Point, type StateId } from "./atlas-data";
import { elevation as fieldElevation, terrainNormal, terrainTint } from "./terrain-height";
import { createTerrainTextures } from "./terrain-textures";
import { createFogController } from "./fog-material";

// All states use the same sampling grid and analytic normals. Borders therefore
// cross continuous landforms instead of becoming separate extruded slabs.
const STEP = 0.6;
const SEA_LEVEL = -1.15;
export const reliefHeight = (height:number,visible:boolean) => SEA_LEVEL+(height-SEA_LEVEL)*(visible?1:0.08);
const heightCache = new Map<string,number>();
function gridHeight(ix:number,iz:number) {
  const key=`${ix},${iz}`;
  let height=heightCache.get(key);
  if(height===undefined){height=fieldElevation(ix*STEP,iz*STEP);heightCache.set(key,height);}
  return height;
}
// Match the visible triangle surface, including at borders and river edges.
export function elevation(x:number,z:number) {
  const ix=Math.floor(x/STEP), iz=Math.floor(z/STEP), fx=x/STEP-ix, fz=z/STEP-iz;
  const a=gridHeight(ix,iz),b=gridHeight(ix+1,iz),c=gridHeight(ix+1,iz+1),d=gridHeight(ix,iz+1);
  return fx>=fz?a+(b-a)*fx+(c-b)*fz:a+(c-d)*fx+(d-a)*fz;
}
export const worldPoint = ([x, y]: Point, lift = 0) => new THREE.Vector3(x - 50, elevation(x - 50, y - 36) + lift, y - 36);
type Sample = { height: number; normal: readonly [number, number, number]; tint: number };

function clipPolygon(polygon: Point[], axis: 0 | 1 | 2, edge: number, greater: boolean): Point[] {
  const output: Point[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const av=axis===2?a[1]-a[0]:a[axis], bv=axis===2?b[1]-b[0]:b[axis];
    const aInside = greater ? av >= edge : av <= edge;
    const bInside = greater ? bv >= edge : bv <= edge;
    if (aInside) output.push(a);
    if (aInside !== bInside) {
      const t = (edge - av) / (bv - av);
      output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return output;
}

function terrainGeometry(points: readonly Point[], color: string, sample: (x: number, z: number) => Sample, offset = 0, conquestColor?:string) {
  const polygon: Point[] = points.map(([x, y]) => [x - 50, y - 36]);
  const minX = Math.floor(Math.min(...polygon.map(p => p[0])) / STEP);
  const maxX = Math.ceil(Math.max(...polygon.map(p => p[0])) / STEP);
  const minZ = Math.floor(Math.min(...polygon.map(p => p[1])) / STEP);
  const maxZ = Math.ceil(Math.max(...polygon.map(p => p[1])) / STEP);
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [];
  const base = new THREE.Color(color).lerp(new THREE.Color("#8c9463"), 0.2);
  const rock = new THREE.Color("#9e9986");
  const shade = new THREE.Color();
  const conquest:number[]=[];
  const conqueredBase=conquestColor?new THREE.Color(conquestColor).lerp(new THREE.Color('#8c9463'),0.2):null;
  function vertex(p: Point) {
    const s = sample(p[0], p[1]);
    const exposed = THREE.MathUtils.clamp((s.height - 2) / 7 + (1 - s.normal[1]) * 0.62, 0, 0.75);
    shade.copy(base).lerp(rock, exposed).multiplyScalar(s.tint);
    positions.push(p[0], s.height + offset, p[1]); normals.push(...s.normal);
    colors.push(shade.r, shade.g, shade.b); uvs.push(p[0] / 28, p[1] / 28);
    if(conqueredBase){shade.copy(conqueredBase).lerp(rock,exposed).multiplyScalar(s.tint);conquest.push(shade.r,shade.g,shade.b);}
  }
  for (let iz = minZ; iz < maxZ; iz++) {
    for (let ix = minX; ix < maxX; ix++) {
      const x = ix * STEP, z = iz * STEP;
      let cell = clipPolygon(polygon, 0, x, true);
      cell = clipPolygon(cell, 0, x + STEP, false);
      cell = clipPolygon(cell, 1, z, true);
      cell = clipPolygon(cell, 1, z + STEP, false);
      if (cell.length < 3) continue;
      for (const half of [clipPolygon(cell,2,z-x,false),clipPolygon(cell,2,z-x,true)]) {
        const polygon=half.filter((p,i)=>Math.hypot(p[0]-half[(i+1)%half.length][0],p[1]-half[(i+1)%half.length][1])>1e-5);
        if(polygon.length<3)continue;
        const faces=THREE.ShapeUtils.triangulateShape(polygon.map(p=>new THREE.Vector2(...p)),[]);
        for (const [a,b,c] of faces) {
          const cross=(polygon[b][0]-polygon[a][0])*(polygon[c][1]-polygon[a][1])-(polygon[b][1]-polygon[a][1])*(polygon[c][0]-polygon[a][0]);
          if(Math.abs(cross)<1e-8)continue;
          for(const index of cross>0?[a,c,b]:[a,b,c])vertex(polygon[index]);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  if(conqueredBase)geometry.setAttribute('conquestColor',new THREE.Float32BufferAttribute(conquest,3));
  geometry.computeBoundingSphere();
  return geometry;
}

function ribbon(points: THREE.Vector3[], width: number, groundOffset?:number) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z, length = Math.hypot(dx, dz) || 1;
    for (const side of [-1, 1]) {
      const x=points[i].x-dz/length*width*side,z=points[i].z+dx/length*width*side;
      positions.push(x,groundOffset===undefined?points[i].y:elevation(x,z)+groundOffset,z);
      uvs.push(i / 12, side === -1 ? 0 : 1);
    }
    if (i) { const a = (i - 1) * 2; indices.push(a,a+2,a+1,a+1,a+2,a+3); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function buildMap() {
  const group = new THREE.Group(), terrain = new THREE.Group();
  group.add(terrain);
  const stateMeshes = new Map<StateId, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>();
  const borders = new Map<StateId, THREE.Line>();
  const textures = createTerrainTextures();
  const fog=createFogController();
  const fogDepthMaterial=fog.createDepthMaterial();
  const coastDecor:THREE.Line[]=[];
  const cache = new Map<string, Sample>();
  function sample(x: number, z: number): Sample {
    const key = `${x.toFixed(4)},${z.toFixed(4)}`;
    let value = cache.get(key);
    if (!value) { value = { height: elevation(x,z), normal: terrainNormal(x,z), tint: terrainTint(x,z) }; cache.set(key, value); }
    return value;
  }
  const surfaceMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, map: textures.color, bumpMap: textures.bump, bumpScale: 0.14, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 300), new THREE.MeshStandardMaterial({ color: "#2b7171", map: textures.color, bumpMap: textures.bump, bumpScale: 0.065, roughness: 0.48, metalness: 0.1 }));
  sea.geometry.getAttribute("uv").array.forEach((v, i, uv) => { uv[i] = v * 15; });
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1.15; sea.receiveShadow = true; group.add(sea);

  // An unlit ink floor keeps fully hidden land flat, including its shadows and coastline.
  const hiddenPlane=new THREE.Mesh(new THREE.PlaneGeometry(400,300),new THREE.MeshBasicMaterial({color:'#172126'}));
  hiddenPlane.rotation.x=-Math.PI/2;hiddenPlane.position.y=SEA_LEVEL+0.01;hiddenPlane.visible=false;group.add(hiddenPlane);

  const coastline: Point[] = [[108,-5],[100,4],[97,14],[91,21],[84,24],[82,27],[88,29],[94,32],[91,37],[85,40],[85,46],[88,54],[89,63],[91,74],[98,87]];
  const coastalCurve = new THREE.CatmullRomCurve3(coastline.map(([x,y]) => new THREE.Vector3(x,0,y)), false, "centripetal");
  const coast = coastalCurve.getPoints(260);
  const distantLand = new THREE.Shape([[-220,-180],[260,-180],[190,-70],...coast.map(p=>[p.x,p.z]),[180,200],[-220,200]].map(([x,y])=>new THREE.Vector2(x-50,36-y)));
  const distantGeometry = new THREE.ShapeGeometry(distantLand);
  distantGeometry.rotateX(-Math.PI/2);
  const distantPositions = distantGeometry.getAttribute("position");
  const distantColors:number[]=[], distantUvs:number[]=[];
  const distantColor = new THREE.Color("#7b8765");
  for(let i=0;i<distantPositions.count;i++) {
    distantColors.push(distantColor.r,distantColor.g,distantColor.b);
    distantUvs.push(distantPositions.getX(i)/28,distantPositions.getZ(i)/28);
  }
  distantGeometry.setAttribute("color",new THREE.Float32BufferAttribute(distantColors,3));
  distantGeometry.setAttribute("uv",new THREE.Float32BufferAttribute(distantUvs,2));
  const distant = new THREE.Mesh(distantGeometry,surfaceMaterial());
  distant.name='context-base';
  distant.position.y=.39; distant.receiveShadow=true; terrain.add(distant);
  const mainland: Point[] = [[-22,-17],[111,-17], ...coast.map(p => [p.x,p.z] as Point),[-22,87]];
  const land = new THREE.Mesh(terrainGeometry(mainland, "#7b8765", sample, -0.17), surfaceMaterial());
  land.receiveShadow = true; terrain.add(land);

  // A continuous rock skirt follows the coast; political boundaries have no walls.
  const cliffPositions: number[] = [], cliffColors: number[] = [], cliffUvs: number[] = [];
  const stone = new THREE.Color();
  for (let i = 1; i < coast.length; i++) {
    const a = coast[i - 1], b = coast[i];
    for (const [p, bottom] of [[a,false],[b,false],[a,true],[a,true],[b,false],[b,true]] as const) {
      const x = p.x - 50, z = p.z - 36, y = bottom ? -1.13 : elevation(x,z) - 0.16;
      cliffPositions.push(x,y,z);
      stone.set(bottom ? "#4e594b" : "#99977b"); cliffColors.push(stone.r,stone.g,stone.b);
      cliffUvs.push((i + (p === b ? 1 : 0)) / 10, y * 1.8);
    }
  }
  const cliffGeometry = new THREE.BufferGeometry();
  cliffGeometry.setAttribute("position", new THREE.Float32BufferAttribute(cliffPositions,3));
  cliffGeometry.setAttribute("color",new THREE.Float32BufferAttribute(cliffColors,3));
  cliffGeometry.setAttribute("uv",new THREE.Float32BufferAttribute(cliffUvs,2)); cliffGeometry.computeVertexNormals();
  const cliffs = new THREE.Mesh(cliffGeometry,surfaceMaterial()); cliffs.castShadow = true; cliffs.receiveShadow = true; terrain.add(cliffs);

  for (const distance of [0.35,1.1,2.2,3.7,5.6]) {
    const points = coast.map((p,i) => {
      const a=coast[Math.max(0,i-1)], b=coast[Math.min(coast.length-1,i+1)];
      const dx=b.x-a.x, dz=b.z-a.z, length=Math.hypot(dx,dz)||1;
      return new THREE.Vector3(p.x-50 + dz/length*distance,-1.11,p.z-36-dx/length*distance);
    });
    const contour=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:"#bad1bb",transparent:true,opacity:distance<1.2?0.35:0.14}));
    coastDecor.push(contour);group.add(contour);
  }
  const shore = coast.map(p => new THREE.Vector3(p.x-50,elevation(p.x-50,p.z-36)-0.11,p.z-36));
  terrain.add(new THREE.Mesh(ribbon(shore,0.13,-0.11),new THREE.MeshStandardMaterial({color:"#c8bea0",roughness:1,side:THREE.DoubleSide})));

  for (const state of STATES) {
    const mesh = new THREE.Mesh(terrainGeometry(state.territory,state.color,sample,0,state.id==='han'?STATES[0].color:undefined),surfaceMaterial());
    mesh.userData.stateId=state.id; mesh.receiveShadow=true; mesh.castShadow=true;
    terrain.add(mesh); stateMeshes.set(state.id,mesh);
    mesh.name=state.id;
    const boundary: THREE.Vector3[]=[];
    for(let i=0;i<state.territory.length;i++) {
      const a=state.territory[i],b=state.territory[(i+1)%state.territory.length];
      const steps=Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])*4);
      for(let s=0;s<steps;s++) boundary.push(worldPoint([a[0]+(b[0]-a[0])*s/steps,a[1]+(b[1]-a[1])*s/steps],0.07));
    }
    boundary.push(boundary[0]);
    const border=new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundary),new THREE.LineBasicMaterial({color:"#dccda0",transparent:true,opacity:0.65}));
    terrain.add(border);borders.set(state.id,border);
  }
  for(const river of RIVERS) {
    const curve=new THREE.CatmullRomCurve3(river.points.map(p=>worldPoint(p)),false,"centripetal");
    const points=curve.getPoints(420).map(p=>{p.y=elevation(p.x,p.z)+0.045;return p;});
    const banks=new THREE.Mesh(ribbon(points,0.19,0.035),new THREE.MeshStandardMaterial({color:"#9b9e79",roughness:1,side:THREE.DoubleSide}));
    const water=new THREE.Mesh(ribbon(points,0.1,0.065),new THREE.MeshStandardMaterial({color:"#619b9b",roughness:0.4,metalness:0.1,side:THREE.DoubleSide}));
    terrain.add(banks,water);
  }
  terrain.traverse(object=>{
    if((object instanceof THREE.Mesh||object instanceof THREE.Line)&&(object.material instanceof THREE.MeshStandardMaterial||object.material instanceof THREE.LineBasicMaterial)){
      fog.prepare(object.geometry);fog.apply(object.material,object.name==='han',object.name==='context-base');
      if(object instanceof THREE.Mesh&&object.castShadow)object.customDepthMaterial=fogDepthMaterial;
    }
  });
  return {group,stateMeshes,borders,setChapter: fog.setChapter,setHidden(hidden:boolean){fog.setHidden(hidden);hiddenPlane.visible=hidden;coastDecor.forEach(line=>{line.visible=!hidden;});},setRelief(visible:boolean){const scale=visible?1:0.08;terrain.scale.y=scale;terrain.position.y=SEA_LEVEL*(1-scale);},disposeTextures(){textures.color.dispose();textures.bump.dispose();}};
}
