"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Castle } from 'lucide-react';
import { STATES, HANGU_PASS, type StateId, type Point } from "@/lib/atlas-data";
import { buildMap, elevation, reliefHeight } from "@/lib/map-geometry";
import { MAP_WORLD_SCALE, mapWorldPoint, atlasCoordinates } from '@/lib/map-space';
import { createCapital } from "@/lib/map-details";
import { createVegetation } from "@/lib/map-vegetation";
import { DEFAULT_READER_CHAPTER, LATEST_FRONTIER_POINT, LATEST_RELEASE_CHAPTER, getReaderFrontierPoint, isDiscovered } from "@/lib/progression";
import { createFogSilhouette } from "@/lib/fog-silhouettes";
import { createFrontierGeometry } from "@/lib/discovery-frontier";
import { STORY_SITES, isSiteDiscovered } from '@/lib/story-data';
import { createStoryMiniature } from '@/lib/story-miniatures';
import { getMapSites, matchesSiteFilters, normalizeFilters, type LandmarkFilters } from '@/lib/landmark-filters';
import { LANDMARK_SCALE, muteLandmark } from '@/lib/landmark-presentation';
import { cameraFlightDuration, cameraFlightProgress, clampCameraTarget } from '@/lib/camera-motion';
import { getCampaignRoutes } from '@/lib/campaign-data';
import { createCampaignOverlay, disposeCampaignOverlay } from '@/lib/campaign-geometry';
import styles from "./MapScene.module.css";

type Command = { type: "reset" | "zoom-in" | "zoom-out" | "focus" | "site" | "region" | "campaign"; id: number; stateId?: StateId; siteId?: string; arcId?:string; point?:Point };
type Props = {
  selectedState: StateId | null;
  onSelectState: (id: StateId | null) => void;
  selectedSiteId: string|null;
  readerExpanded?: boolean;
  onSelectSite: (id:string|null)=>void;
  readerChapter: number;
  campaignArcId: string;
  showSilhouettes: boolean;
  filters: LandmarkFilters;
  command: Command | null;
  onReady: () => void;
  onError: (message: string) => void;
};

export default function MapScene(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const hoverTooltip = useRef<HTMLDivElement>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const readerPoint=useMemo(()=>getReaderFrontierPoint(props.readerChapter),[props.readerChapter]);
  const campaignRoutes=getCampaignRoutes(props.campaignArcId,props.readerChapter);
  const visibleSites=getMapSites(props.readerChapter,props.showSilhouettes);
  const api = useRef<{ command: (c: Command) => void; select: (id: StateId | null) => void; campaign:(arcId:string)=>void; progress:(chapter:number,silhouettes:boolean,filters:LandmarkFilters)=>void; hover:(id:string|null,tooltip?:boolean)=>void } | null>(null);

  useEffect(() => {
    const container = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { callbacks.current.onError("This browser could not start WebGL. Enable hardware acceleration, then reload the atlas."); return; }
    const canvas = renderer.domElement;
    canvas.className = styles.canvas;
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "application");
    canvas.setAttribute("aria-label", "Interactive Warring States map. Drag to pan, scroll or pinch to zoom. Arrow keys pan; plus and minus zoom; Home resets. Choose story arcs using the control below your chapter.");
    container.prepend(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#244c4b");
    scene.add(new THREE.HemisphereLight("#dce8e3", "#4b5944", 1.25));
    const sun = new THREE.DirectionalLight("#fff9e7", 2.7);
    sun.position.set(-50, 90, 25).multiplyScalar(MAP_WORLD_SCALE); sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -85 * MAP_WORLD_SCALE;
    sun.shadow.camera.right = sun.shadow.camera.top = 85 * MAP_WORLD_SCALE;
    sun.shadow.camera.far = 230 * MAP_WORLD_SCALE; sun.shadow.normalBias = 0.12; sun.shadow.bias = -0.0002;
    scene.add(sun);
    const camera = new THREE.OrthographicCamera(-60, 60, 45, -45, 0.1, 600 * MAP_WORLD_SCALE);
    camera.position.set(110, 110, 110).multiplyScalar(MAP_WORLD_SCALE);
    const controls = new OrbitControls(camera, canvas);
    controls.enableRotate = false;
    controls.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = false;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.minZoom = 1; controls.maxZoom = 4.5 * MAP_WORLD_SCALE;
    controls.zoomSpeed = 0.8;
    controls.target.set(0, 0, 0); controls.update();
    const map = buildMap(); map.group.scale.set(MAP_WORLD_SCALE,1,MAP_WORLD_SCALE); scene.add(map.group);
    const woodlands = createVegetation(); scene.add(woodlands);
    const forestBatches=woodlands.children.filter((o):o is THREE.InstancedMesh=>o instanceof THREE.InstancedMesh).map(mesh=>({mesh,original:mesh.instanceMatrix.array.slice()}));
    const frontier=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#dec18b',transparent:true,opacity:0.85,depthTest:false}));
    frontier.renderOrder=8; map.group.children[0].add(frontier);
    let campaignOverlay=createCampaignOverlay([]),shownCampaign='';map.group.add(campaignOverlay);
    const storyObjects=STORY_SITES.map(site=>{
      const color=STATES.find(state=>state.id===site.stateId)?.color??'#b8a174';
      const object=createStoryMiniature(site.kind,site.tier,color);
      object.scale.multiplyScalar(LANDMARK_SCALE);
      object.position.copy(mapWorldPoint(site.position,0.08));object.userData.siteId=site.id;scene.add(object);
      const kind=site.kind==='banner'||site.kind==='battlefield'?'banner':site.kind==='mountain'||site.kind==='hills'?'mountain':site.kind==='pass'?'gate':'fortress';
      const ghost=createFogSilhouette(kind);ghost.position.copy(object.position);ghost.scale.setScalar(LANDMARK_SCALE*(site.tier==='major'?1.4:1));scene.add(ghost);
      return {object,ghost,site};
    });
    const selectedRing=new THREE.Mesh(new THREE.RingGeometry(1.85,1.95,64),new THREE.MeshBasicMaterial({color:'#e5ca8f',transparent:true,opacity:0.8,depthTest:false,side:THREE.DoubleSide}));
    selectedRing.rotation.x=-Math.PI/2;selectedRing.renderOrder=9;selectedRing.visible=false;scene.add(selectedRing);
    const hoverRing=new THREE.Mesh(new THREE.RingGeometry(2.05,2.15,64),new THREE.MeshBasicMaterial({color:'#efd49a',transparent:true,opacity:0.9,depthTest:false,side:THREE.DoubleSide}));
    hoverRing.rotation.x=-Math.PI/2;hoverRing.renderOrder=10;hoverRing.visible=false;scene.add(hoverRing);
    const landmarks: { object: THREE.Object3D; point: Point; stateId:StateId }[] = [];
    for (const state of STATES) {
      const capital = createCapital(state.color);
      capital.scale.setScalar(1.9*LANDMARK_SCALE);
      capital.position.copy(mapWorldPoint(state.capital.position, 0.05));
      capital.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
      landmarks.push({object:capital,point:state.capital.position,stateId:state.id});
      scene.add(capital);
    }
    const reliefVisible = true;
    let readerChapter=callbacks.current.readerChapter??DEFAULT_READER_CHAPTER;
    let frontierChapter=-1;
    let showSilhouettes=callbacks.current.showSilhouettes;
    let activeFilters=normalizeFilters(callbacks.current.filters,readerChapter);
    let tween: { start: number; duration:number; from: THREE.Vector3; to: THREE.Vector3; fromZoom: number; toZoom: number } | null = null;
    let needsRender = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const projected = new THREE.Vector3();
    let hoveredSiteId:string|null=null;
    let showHoverTooltip=false;
    let frame=0;
    let inFrame=false;
    let disposed=false;
    let firstRender=true;

    function invalidate() {
      needsRender=true;
      if(!frame&&!inFrame&&!disposed)frame=requestAnimationFrame(tick);
    }

    function hover(id:string|null,tooltip=false) {
      const hovered=storyObjects.find(item=>item.site.id===id&&item.object.visible);
      const nextId=hovered?.site.id??null;
      if(hoveredSiteId===nextId&&showHoverTooltip===tooltip)return;
      hoveredSiteId=nextId;showHoverTooltip=tooltip;
      hoverRing.visible=Boolean(hovered);
      if(hovered){hoverRing.position.copy(hovered.object.position);hoverRing.position.y+=0.15;hoverRing.scale.setScalar(LANDMARK_SCALE*(hovered.site.tier==='major'?1.65:1));}
      canvas.style.cursor=hovered&&tooltip?'pointer':'';
      invalidate();
    }

    function render() {
      renderer.render(scene, camera);
      const w = container.clientWidth, h = container.clientHeight;
      const storyLabels:{node:HTMLElement,x:number,y:number}[]=[];
      for (const node of container.querySelectorAll<HTMLElement>("[data-point]")) {
        if(node.dataset.capital)node.classList.toggle(styles.compactCapital,w<600&&(camera.zoom<1.45||callbacks.current.selectedSiteId!==null));
        const [x, z, lift = 0] = node.dataset.point!.split(",").map(Number);
        const known=isDiscovered([x,z],readerChapter);
        if(!showSilhouettes&&!known&&!node.dataset.readerMarker){node.style.display='none';continue;}
        if(!showSilhouettes&&node.dataset.sea){node.style.display='none';continue;}
        if(node.dataset.capitalState)node.classList.toggle(styles.mutedStory,activeFilters.arc!=='all'||(activeFilters.state!=='all'&&activeFilters.state!==node.dataset.capitalState));
        if(node.dataset.pass&&(activeFilters.arc!=='all'||activeFilters.state!=='all')){node.style.display='none';continue;}
        if(node.dataset.capital&&!known){node.style.display='none';continue;}
        node.style.display='';
        node.style.opacity=node.dataset.state&&!known?'0.28':'1';
        if(node.dataset.storyId){
          const selected=node.dataset.storyId===callbacks.current.selectedSiteId;
          const site=STORY_SITES.find(site=>site.id===node.dataset.storyId)!;
          node.classList.toggle(styles.mutedStory,!selected&&!matchesSiteFilters(site,activeFilters,readerChapter));
          node.classList.toggle(styles.compactStory,(camera.zoom<2*MAP_WORLD_SCALE||w<600)&&!selected);
          node.classList.toggle(styles.selectedStory,selected);
          node.classList.toggle(styles.hoveredStory,node.dataset.storyId===hoveredSiteId);
        }
        projected.set((x - 50)*MAP_WORLD_SCALE, reliefHeight(elevation(x - 50, z - 36),reliefVisible) + lift, (z - 36)*MAP_WORLD_SCALE).project(camera);
        const px = (projected.x + 1) * w / 2;
        const py = (1 - projected.y) * h / 2;
        const labelX=node.dataset.campaignRoute?THREE.MathUtils.clamp(px,node.offsetWidth/2+10,w-node.offsetWidth/2-10):px;
        node.style.transform = `translate(${labelX}px, ${py}px) translate(-50%, -50%)`;
        if(node.dataset.storyId&&px>=0&&px<=w&&py>=0&&py<=h)storyLabels.push({node,x:px,y:py});
        node.style.visibility = px < -100 || px > w + 100 || py < -50 || py > h + 50 ? "hidden" : "visible";
      }
      // Keep nearby miniatures individually reachable, with short leaders back to their locations.
      const occupied:{x:number,y:number,w:number,h:number}[]=[];
      storyLabels.sort((a,b)=>Number(b.node.dataset.storyId===callbacks.current.selectedSiteId)-Number(a.node.dataset.storyId===callbacks.current.selectedSiteId));
      for(const {node,x,y} of storyLabels){
        const width=node.offsetWidth,height=node.offsetHeight;
        let placed={x,y};
        search:for(const radius of [0,30,60,90,120]){
          for(let angle=0;angle<8;angle++){
            const cx=x+Math.cos(angle*Math.PI/4)*radius,cy=y+Math.sin(angle*Math.PI/4)*radius;
            if(cx-width/2<8||cx+width/2>w-8||cy-height/2<8||cy+height/2>h-8)continue;
            if(occupied.some(box=>Math.abs(cx-box.x)<(width+box.w)/2+3&&Math.abs(cy-box.y)<(height+box.h)/2+3))continue;
            placed={x:cx,y:cy};break search;
          }
        }
        occupied.push({...placed,w:width,h:height});
        const dx=x-placed.x,dy=y-placed.y,distance=Math.hypot(dx,dy);
        node.style.transform=`translate(${placed.x}px,${placed.y}px) translate(-50%,-50%)`;
        node.style.setProperty('--leader-length',`${distance}px`);
        node.style.setProperty('--leader-angle',`${Math.atan2(dy,dx)}rad`);
        node.style.setProperty('--leader-display',distance>8?'block':'none');
      }
      const tooltip=hoverTooltip.current;
      const hovered=storyObjects.find(item=>item.site.id===hoveredSiteId&&item.object.visible);
      if(tooltip){
        tooltip.hidden=!hovered||!showHoverTooltip;
        if(hovered&&showHoverTooltip){
          tooltip.textContent=hovered.site.name;
          projected.copy(hovered.object.position).add(new THREE.Vector3(0,6,0)).project(camera);
          const px=THREE.MathUtils.clamp((projected.x+1)*w/2,tooltip.offsetWidth/2+12,w-tooltip.offsetWidth/2-12);
          const py=THREE.MathUtils.clamp((1-projected.y)*h/2-18,20,h-40);
          tooltip.style.transform=`translate(${px}px,${py}px) translate(-50%,-100%)`;
        }
      }
    }
    function move(to: THREE.Vector3, zoom: number) {
      // Flush any residual drag before taking the new flight's starting pose.
      controls.enableDamping=false;controls.update();controls.enableDamping=!motion.matches;
      const [x,z]=clampCameraTarget(to.x,to.z,MAP_WORLD_SCALE);
      to=to.clone().set(x,0,z);
      zoom=THREE.MathUtils.clamp(zoom,controls.minZoom,controls.maxZoom);
      hover(null);
      if (motion.matches) {
        tween=null;
        camera.position.add(to.clone().sub(controls.target)); controls.target.copy(to);
        camera.zoom = zoom; camera.updateProjectionMatrix(); controls.update(); invalidate(); return;
      }
      tween = { start: performance.now(), duration:cameraFlightDuration(controls.target.distanceTo(to),camera.zoom,zoom), from: controls.target.clone(), to, fromZoom: camera.zoom, toZoom: zoom };
      invalidate();
    }
    function command(c: Command) {
      if(c.type==='campaign'&&c.arcId){
        const routes=getCampaignRoutes(c.arcId,readerChapter);
        if(routes.length){
          const points=routes.flatMap(route=>route.points.map(p=>mapWorldPoint(p,1)));
          const right=points.map(p=>p.dot(new THREE.Vector3(1,0,-1).normalize()));
          const up=points.map(p=>p.dot(new THREE.Vector3(-1,2,-1).normalize()));
          const midRight=(Math.min(...right)+Math.max(...right))/2,midUp=(Math.min(...up)+Math.max(...up))/2;
          const center=new THREE.Vector3((Math.SQRT2*midRight-Math.sqrt(6)*midUp)/2,0,(-Math.SQRT2*midRight-Math.sqrt(6)*midUp)/2);
          const zoom=Math.min((camera.right-camera.left)*.78/(Math.max(...right)-Math.min(...right)+20),(camera.top-camera.bottom)*.68/(Math.max(...up)-Math.min(...up)+20));
          move(center,zoom);
        }
      }
      if(c.type==="region"&&c.point){const point=mapWorldPoint(c.point);point.y=0;move(point,2.1*MAP_WORLD_SCALE);}
      if (c.type === "reset") move(homeTarget, homeZoom);
      if (c.type === "zoom-in" || c.type === "zoom-out") move(controls.target.clone(), THREE.MathUtils.clamp(camera.zoom * (c.type === "zoom-in" ? 1.3 : 1 / 1.3), controls.minZoom, controls.maxZoom));
      if (c.type === "focus" && c.stateId) {
        const state = STATES.find(s => s.id === c.stateId)!;
        const p = mapWorldPoint(state.label); p.y = 0;
        move(p, state.id === "han" ? 2.4 : state.id === "wei" ? 2.1 : 1.6);
      }
      if(c.type==='site'&&c.siteId&&getMapSites(readerChapter,showSilhouettes).some(site=>site.id===c.siteId)){
        const site=STORY_SITES.find(candidate=>candidate.id===c.siteId)!;
        const p=mapWorldPoint(site.position);p.y=0;
        const zoom=(site.tier==='major'?2.5:2.8)*MAP_WORLD_SCALE,w=container.clientWidth,h=container.clientHeight;
        const landscape=(h<=500&&w>h)||(w>720&&h<=600);
        if(callbacks.current.selectedSiteId===site.id&&(w>720||landscape)){
          const cardWidth=landscape?Math.min(360,w*0.52):360;
          const shift=(cardWidth+(landscape?12:80))/2/w*(camera.right-camera.left)/zoom;
          p.addScaledVector(new THREE.Vector3(1,0,-1).normalize(),shift);
        }else if(callbacks.current.selectedSiteId===site.id){
          const expanded=callbacks.current.readerExpanded;
          const sheetHeight=expanded?Math.max(0,h-148):Math.min(h*0.4,Math.max(0,h-156));
          const coveredBottom=16+sheetHeight;
          const topClearance=120;
          const shift=Math.max(0,coveredBottom-topClearance)/2/h*(camera.top-camera.bottom)/zoom*Math.sqrt(3);
          p.addScaledVector(new THREE.Vector3(1,0,1).normalize(),shift);
        }
        move(p,zoom);
      }
    }
    function select(id: StateId | null) {
      for (const [stateId, mesh] of map.stateMeshes) {
        mesh.material.color.set(!id || id === stateId ? "#ffffff" : "#dedede");
        const material = map.borders.get(stateId)!.material;
        material.color.set(id === stateId ? "#ffe2a1" : "#d0c197");
        const state=STATES.find(s=>s.id===stateId)!;
        material.opacity = id === stateId ? 1 : isDiscovered(state.label,readerChapter)?0.65:0.2;
      }
      const selected=storyObjects.find(item=>item.site.id===callbacks.current.selectedSiteId&&item.object.visible);
      selectedRing.visible=Boolean(selected);
      if(selected){selectedRing.position.copy(selected.object.position);selectedRing.position.y+=0.12;selectedRing.scale.setScalar(LANDMARK_SCALE*(selected.site.tier==='major'?1.65:1));}
      for(const {object,site} of storyObjects)muteLandmark(object,site.id!==callbacks.current.selectedSiteId&&!matchesSiteFilters(site,activeFilters,readerChapter));
      for(const {object,stateId} of landmarks)muteLandmark(object,activeFilters.arc!=='all'||(activeFilters.state!=='all'&&activeFilters.state!==stateId));
      invalidate();
    }
    map.setRelief(true);
    for (const {object,point} of landmarks) object.position.y = reliefHeight(elevation(point[0]-50,point[1]-36),true) + 0.05;
    for(const {object,ghost,site} of storyObjects)object.position.y=ghost.position.y=reliefHeight(elevation(site.position[0]-50,site.position[1]-36),true)+0.08;
    function campaign(arcId:string){
      const key=`${arcId}:${readerChapter}`;if(shownCampaign===key)return;shownCampaign=key;
      map.group.remove(campaignOverlay);disposeCampaignOverlay(campaignOverlay);
      campaignOverlay=createCampaignOverlay(getCampaignRoutes(arcId,readerChapter));map.group.add(campaignOverlay);invalidate();
    }
    function progress(chapter:number,silhouettes:boolean,filters:LandmarkFilters) {
      readerChapter=chapter;showSilhouettes=silhouettes;activeFilters=normalizeFilters(filters,chapter);map.setChapter(chapter);map.setHidden(!silhouettes);
      if(frontierChapter!==chapter){frontier.geometry.dispose();frontier.geometry=createFrontierGeometry(chapter);frontierChapter=chapter;}
      campaign(callbacks.current.campaignArcId);
      const visibleSites=getMapSites(chapter,silhouettes);
      const visibleIds=new Set(visibleSites.map(site=>site.id));
      for(const {object,point} of landmarks)object.visible=isDiscovered(point,chapter)&&!visibleSites.some(site=>Math.hypot(site.position[0]-point[0],site.position[1]-point[1])<3);
      for(const {object,ghost,site} of storyObjects){object.visible=visibleIds.has(site.id);ghost.visible=silhouettes&&!isSiteDiscovered(site.id,chapter);}
      if(hoveredSiteId&&!visibleIds.has(hoveredSiteId))hover(null);
      const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),zero=new THREE.Vector3(0,0,0);
      for(const {mesh,original} of forestBatches){
        for(let i=0;i<mesh.count;i++){
          matrix.fromArray(original,i*16);position.setFromMatrixPosition(matrix);
          const known=isDiscovered([position.x+50,position.z+36],chapter);
          matrix.setPosition(position.x*MAP_WORLD_SCALE,position.y,position.z*MAP_WORLD_SCALE);
          if(!known)matrix.scale(zero);
          mesh.setMatrixAt(i,matrix);
        }
        mesh.instanceMatrix.needsUpdate=true;
        mesh.computeBoundingSphere();
      }
      select(callbacks.current.selectedState);renderer.shadowMap.needsUpdate=true;invalidate();
    }
    api.current = { command, select, campaign, progress, hover };
    select(callbacks.current.selectedState);
    progress(readerChapter,callbacks.current.showSilhouettes,callbacks.current.filters);
    let homeZoom = 1;
    const mapExtent = STATES.flatMap(state => state.territory.map(p => mapWorldPoint(p, 2)));
    const isoRight = new THREE.Vector3(1,0,-1).normalize();
    const isoUp = new THREE.Vector3(-1,2,-1).normalize();
    const rightExtent=mapExtent.map(p=>p.dot(isoRight)),upExtent=mapExtent.map(p=>p.dot(isoUp));
    const midRight=(Math.min(...rightExtent)+Math.max(...rightExtent))/2,midUp=(Math.min(...upExtent)+Math.max(...upExtent))/2;
    const homeTarget=new THREE.Vector3((Math.SQRT2*midRight-Math.sqrt(6)*midUp)/2,0,(-Math.SQRT2*midRight-Math.sqrt(6)*midUp)/2);
    camera.position.add(homeTarget.clone().sub(controls.target));controls.target.copy(homeTarget);controls.update();
    const fitWidth = Math.max(...rightExtent)-Math.min(...rightExtent) + 6 * MAP_WORLD_SCALE;
    const fitHeight = Math.max(...upExtent)-Math.min(...upExtent) + 8 * MAP_WORLD_SCALE;
    let viewportWidth=0,viewportHeight=0;
    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if(!w||!h||(w===viewportWidth&&h===viewportHeight))return;
      viewportWidth=w;viewportHeight=h;
      tween=null;
      const aspect = w / h;
      const nextHomeZoom = w < 600 ? 1.65 : 1.3;
      camera.zoom *= nextHomeZoom / homeZoom;
      homeZoom = nextHomeZoom;
      const height = Math.max(fitHeight, fitWidth / aspect);
      camera.left = -height * aspect / 2; camera.right = height * aspect / 2;
      camera.top = height / 2; camera.bottom = -height / 2;
      camera.updateProjectionMatrix(); renderer.setSize(w, h); invalidate();
      if(callbacks.current.selectedSiteId)command({type:'site',siteId:callbacks.current.selectedSiteId,id:0});
      else if(getCampaignRoutes(callbacks.current.campaignArcId,readerChapter).length)command({type:'campaign',arcId:callbacks.current.campaignArcId,id:0});
    }
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const raycaster = new THREE.Raycaster();
    const pointers = new Map<number, { x: number; y: number; moved: boolean }>();
    let multiTouch = false;
    function stopFlight() { const wasFlying=Boolean(tween);tween = null;invalidate();return wasFlying; }
    function pointerDown(e: PointerEvent) {
      if (pointers.size === 0) multiTouch = false;
      // A click used to stop a moving camera must not also select what moved beneath it.
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: stopFlight() });
      if (pointers.size > 1) multiTouch = true;
      hover(null);
    }
    function pointerMove(e: PointerEvent) {
      const start = pointers.get(e.pointerId);
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) start.moved = true;
      if(e.pointerType==='mouse'&&pointers.size===0&&!tween){
        const rect=canvas.getBoundingClientRect();
        raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
        const hit=raycaster.intersectObjects(storyObjects.filter(item=>item.object.visible).map(item=>item.object),true)[0];
        let object:THREE.Object3D|null=hit?.object??null;
        while(object&&!object.userData.siteId)object=object.parent;
        hover(object?.userData.siteId??null,true);
      }
    }
    function pointerLeave(){hover(null);}
    function pointerCancel(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) multiTouch = false;
    }
    function pick(e: PointerEvent) {
      const start = pointers.get(e.pointerId);
      const isClick = start && !start.moved && !multiTouch && pointers.size === 1 && e.isPrimary && (e.pointerType !== "mouse" || e.button === 0) && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 5;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) multiTouch = false;
      if (!isClick) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const storyHit=raycaster.intersectObjects(storyObjects.filter(item=>item.object.visible).map(item=>item.object),true)[0];
      if(storyHit){
        let object:THREE.Object3D|null=storyHit.object;
        while(object&&!object.userData.siteId)object=object.parent;
        if(object){callbacks.current.onSelectSite(object.userData.siteId);return;}
      }
      const hit = raycaster.intersectObjects(Array.from(map.stateMeshes.values()))[0];
      if(hit&&!isDiscovered(atlasCoordinates(hit.point),readerChapter))return;
      const id = hit?.object.userData.stateId as StateId | undefined;
      callbacks.current.onSelectState(id ?? null);
      if (id) command({ type: "focus", stateId: id, id: 0 });
    }
    function key(e: KeyboardEvent) {
      const pans: Record<string, Point> = { ArrowLeft: [-4,0], ArrowRight: [4,0], ArrowUp: [0,-4], ArrowDown: [0,4] };
      if (pans[e.key]) {
        e.preventDefault();stopFlight();hover(null);
        const [x,z]=pans[e.key];
        const next=controls.target.clone().add(new THREE.Vector3((x+z)*MAP_WORLD_SCALE/Math.SQRT2/camera.zoom,0,(z-x)*MAP_WORLD_SCALE/Math.SQRT2/camera.zoom));
        const [boundedX,boundedZ]=clampCameraTarget(next.x,next.z,MAP_WORLD_SCALE);
        next.set(boundedX,0,boundedZ);camera.position.add(next.clone().sub(controls.target));controls.target.copy(next);controls.update();invalidate();
      }
      if (["+", "=", "-", "Home"].includes(e.key)) { e.preventDefault(); command({ type: e.key === "Home" ? "reset" : e.key === "-" ? "zoom-out" : "zoom-in", id: 0 }); }
      if (e.key === "Escape") {callbacks.current.onSelectSite(null);callbacks.current.onSelectState(null);}
    }
    function changed() {
      const [x,z]=clampCameraTarget(controls.target.x,controls.target.z,MAP_WORLD_SCALE);
      const bounded = controls.target.clone().set(x,0,z);
      camera.position.add(bounded.clone().sub(controls.target)); controls.target.copy(bounded);
      invalidate();
    }
    canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointerup", pick);
    canvas.addEventListener("pointermove", pointerMove); canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("pointerleave",pointerLeave);
    canvas.addEventListener("wheel", stopFlight, { passive: true }); canvas.addEventListener("keydown", key);
    controls.addEventListener("change", changed);
    const contextLost = (e: Event) => { e.preventDefault();cancelAnimationFrame(frame);frame=0; callbacks.current.onError("The graphics connection was interrupted. Reload the page to return to the atlas."); };
    canvas.addEventListener("webglcontextlost", contextLost);
    function motionChanged(){
      controls.enableDamping=!motion.matches;
      if(motion.matches&&tween){
        camera.position.add(tween.to.clone().sub(controls.target));controls.target.copy(tween.to);camera.zoom=tween.toZoom;camera.updateProjectionMatrix();tween=null;
      }
      controls.update();invalidate();
    }
    motion.addEventListener('change',motionChanged);
    function tick(now: number) {
      frame=0;inFrame=true;
      if (tween) {
        const ease=cameraFlightProgress(now-tween.start,tween.duration);
        const next = tween.from.clone().lerp(tween.to, ease);
        camera.position.add(next.clone().sub(controls.target)); controls.target.copy(next);
        camera.zoom = THREE.MathUtils.lerp(tween.fromZoom, tween.toZoom, ease); camera.updateProjectionMatrix();
        needsRender = true; if (ease === 1) tween = null;
      }
      const controlsChanged=controls.update();
      if (needsRender) {
        needsRender = false;
        try {render();}
        catch {inFrame=false;callbacks.current.onError('The atlas could not draw this view. Reload the page to try again.');return;}
        if(firstRender){firstRender=false;callbacks.current.onReady();}
      }
      inFrame=false;
      // OrbitControls requests frames only until drag damping settles; the map then sleeps.
      if(tween||(controls.enableDamping&&controlsChanged))invalidate();
    }
    invalidate();
    return () => {
      disposed=true;
      cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); api.current = null;
      motion.removeEventListener('change',motionChanged);
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointerup", pick);
      canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("pointerleave",pointerLeave);
      canvas.removeEventListener("wheel", stopFlight); canvas.removeEventListener("keydown", key); canvas.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(o => { if(o instanceof THREE.InstancedMesh)o.dispose(); const m = o as THREE.Mesh; if (m.geometry) geometries.add(m.geometry); if (m.material) for (const material of Array.isArray(m.material) ? m.material : [m.material]) materials.add(material); if(m.customDepthMaterial)materials.add(m.customDepthMaterial); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); map.disposeTextures(); sun.shadow.map?.dispose(); renderer.dispose(); canvas.remove();
    };
  }, []);

  useEffect(() => { api.current?.select(props.selectedState); }, [props.selectedState,props.selectedSiteId]);
  useEffect(()=>{api.current?.progress(props.readerChapter,props.showSilhouettes,props.filters);},[props.readerChapter,props.showSilhouettes,props.filters]);
  useEffect(() => { if (props.command) api.current?.command(props.command); }, [props.command]);
  useEffect(()=>{api.current?.campaign(props.campaignArcId);},[props.campaignArcId]);
  const lastReaderExpanded=useRef(props.readerExpanded);
  useEffect(()=>{
    if(lastReaderExpanded.current===props.readerExpanded)return;
    lastReaderExpanded.current=props.readerExpanded;
    if(props.selectedSiteId)api.current?.command({type:'site',siteId:props.selectedSiteId,id:0});
  },[props.readerExpanded,props.selectedSiteId]);

  function choose(id: StateId) { props.onSelectState(id); api.current?.command({ type: "focus", stateId: id, id: 0 }); }

  return <div className={styles.scene} ref={host}>
    <div className={styles.labels}>
      {STATES.map(state => <div key={state.id} className={`${styles.label} ${styles.state}`} data-state={state.id} data-point={`${state.label},0.4`} aria-hidden="true"><small>{state.hanzi}</small>{state.name.toUpperCase()}</div>)}
      {STATES.map(state => <button key={`${state.id}-capital`} className={`${styles.label} ${styles.capital}`} data-capital="true" data-capital-state={state.id} data-point={`${state.capital.position},-2.6`} onClick={() => choose(state.id)} aria-label={`${state.capital.name}, capital of ${state.name}`}>{state.capital.name}</button>)}
      <span className={`${styles.label} ${styles.pass}`} data-pass="true" data-point={`${HANGU_PASS},3`}>Hangu Pass</span>
      <span className={`${styles.label} ${styles.natural}`} data-point="31,23,0.4">Yellow River</span>
      <span className={`${styles.label} ${styles.natural}`} data-point="36,59,0.4">Yangtze River</span>
      <span className={`${styles.label} ${styles.sea}`} data-sea="true" data-point="97,49,0">Yellow Sea</span>
    </div>
    <div className={styles.labels}>
      {visibleSites.map(site=><button key={site.id} type="button" className={`${styles.label} ${styles.story}`} data-story-id={site.id} data-major={site.tier==='major'} data-muted={!matchesSiteFilters(site,props.filters,props.readerChapter)&&props.selectedSiteId!==site.id} data-point={`${site.position},${(site.tier==='major'?4.6:3.2)*LANDMARK_SCALE}`} aria-label={`Open ${site.name} landmark`} aria-pressed={props.selectedSiteId===site.id} onPointerEnter={event=>{if(event.pointerType==='mouse')api.current?.hover(site.id);}} onPointerLeave={()=>api.current?.hover(null)} onFocus={()=>api.current?.hover(site.id)} onBlur={()=>api.current?.hover(null)} onClick={()=>props.onSelectSite(site.id)}><Castle size={15} strokeWidth={1.6} aria-hidden="true"/><b>{site.name}</b></button>)}
    </div>
    <div className={styles.labels}>
      <div className={`${styles.label} ${styles.chapterMarker} ${styles.readerMarker}`} data-reader-marker="true" data-point={`${readerPoint},2.8`} aria-label={`Explored through chapter ${props.readerChapter}, discovery frontier`}><i/></div>
      <div className={`${styles.label} ${styles.chapterMarker} ${styles.latestMarker}`} data-point={`${LATEST_FRONTIER_POINT},3.3`} aria-label={`Latest release estimate, chapter ${LATEST_RELEASE_CHAPTER}`}><i/></div>
    </div>
    <div className={styles.labels} aria-label="Campaign attack directions">
      {campaignRoutes.map(route=>{const state=STATES.find(s=>s.id===route.attacker)!;const defender=STATES.find(s=>s.id===route.defender)!;
        return <span key={`${route.attacker}-${route.defender}`} className={`${styles.label} ${styles.campaignLabel}`} data-campaign-route={`${route.attacker}-${route.defender}`} data-point={`${route.label},3.8`} aria-label={`${state.name} attacks ${defender.name}`} style={{borderColor:state.color}}>{state.name}<span aria-hidden="true"> → </span>{defender.name}</span>;
      })}
    </div>
    <div ref={hoverTooltip} className={styles.hoverTooltip} role="tooltip" hidden />
    <div className={styles.vignette} />
  </div>;
}
