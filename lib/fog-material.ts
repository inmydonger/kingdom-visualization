import * as THREE from 'three';
import { DEFAULT_READER_CHAPTER, discoveryChapter, isHanConquered } from './progression';

export function createFogController() {
  const chapter = { value: DEFAULT_READER_CHAPTER };
  const conquered = { value: 1 };
  const hidden = { value: 0 };
  const cache = new Map<string,number>();
  function prepare(geometry:THREE.BufferGeometry) {
    const positions=geometry.getAttribute('position');
    const thresholds=new Float32Array(positions.count);
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i)+50,y=positions.getZ(i)+36,key=`${x.toFixed(3)},${y.toFixed(3)}`;
      let threshold=cache.get(key);
      if(threshold===undefined){threshold=discoveryChapter(x,y);cache.set(key,threshold);}
      thresholds[i]=threshold;
    }
    geometry.setAttribute('aDiscoveryChapter',new THREE.BufferAttribute(thresholds,1));
  }
  function apply(material:THREE.MeshStandardMaterial|THREE.LineBasicMaterial,han=false,background=false) {
    const line=material instanceof THREE.LineBasicMaterial;
    material.onBeforeCompile=shader=>{
      shader.uniforms.uReaderChapter=chapter;
      shader.uniforms.uHanConquered=conquered;
      shader.uniforms.uHiddenLand=hidden;
      shader.vertexShader=`attribute float aDiscoveryChapter; varying float vDiscoveryChapter;\n${background?'varying vec2 vAtlasPoint;':''}\n${han?'attribute vec3 conquestColor; uniform float uHanConquered;':''}\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvDiscoveryChapter=aDiscoveryChapter;${background?'vAtlasPoint=position.xz+vec2(50.0,36.0);':''}`);
      if(han)shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb=mix(vColor.rgb,conquestColor,uHanConquered);');
      shader.fragmentShader=`uniform float uReaderChapter; uniform float uHiddenLand; varying float vDiscoveryChapter;\n${background?'varying vec2 vAtlasPoint;':''}\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        ${background?`// The detailed mainland supplies this extent; do not expose its coarse underlay through fog holes.
        if (uHiddenLand > 0.5 && vAtlasPoint.x >= -22.0 && vAtlasPoint.x <= 111.0 && vAtlasPoint.y >= -17.0 && vAtlasPoint.y <= 87.0) discard;`:''}
        float discovery = ${background?'48.0+770.0*smoothstep(34.0,94.0,vAtlasPoint.x)+20.0*smoothstep(40.0,72.0,vAtlasPoint.y)':'vDiscoveryChapter'};
        if (uHiddenLand > 0.5 && discovery > uReaderChapter) discard;
        ${line?'':`
        float uncharted = smoothstep(uReaderChapter+0.05,uReaderChapter+0.8,discovery);
        float ink = dot(outgoingLight,vec3(0.2126,0.7152,0.0722));
        vec3 greyLand = vec3(ink*0.32+0.043,ink*0.34+0.054,ink*0.37+0.066);
        outgoingLight = mix(outgoingLight,greyLand,uncharted);`}
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>background?'atlas-fog-background-v2':han?'atlas-fog-han-v2':line?'atlas-fog-line-v2':'atlas-fog-v2';
  }
  function createDepthMaterial() {
    const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uReaderChapter=chapter;
      shader.uniforms.uHiddenLand=hidden;
      shader.vertexShader='attribute float aDiscoveryChapter; varying float vDiscoveryChapter;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDiscoveryChapter=aDiscoveryChapter;');
      shader.fragmentShader='uniform float uReaderChapter; uniform float uHiddenLand; varying float vDiscoveryChapter;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif (uHiddenLand > 0.5 && vDiscoveryChapter > uReaderChapter) discard;');
    };
    material.customProgramCacheKey=()=>'atlas-fog-depth-v2';
    return material;
  }
  return {prepare,apply,createDepthMaterial,setHidden(value:boolean){hidden.value=value?1:0;},setChapter(value:number){chapter.value=value;conquered.value=isHanConquered(value)?1:0;}};
}
