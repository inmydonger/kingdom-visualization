import * as THREE from 'three';
import { DEFAULT_READER_CHAPTER, discoveryChapter, isHanConquered } from './progression';

const WIDTH=384,HEIGHT=288;
export function createFogController() {
  const chapter={value:DEFAULT_READER_CHAPTER},conquered={value:1},hidden={value:0};
  // A shared bilinearly filtered field avoids triangle-shaped fog boundaries.
  const data=new Uint8Array(WIDTH*HEIGHT*4);
  for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
    const threshold=discoveryChapter(-30+x/(WIDTH-1)*160,-20+y/(HEIGHT-1)*120);
    const encoded=Math.round(Math.min(1024,threshold)/1024*65535),i=(y*WIDTH+x)*4;
    data[i]=encoded>>8;data[i+1]=encoded&255;data[i+3]=255;
  }
  const field=new THREE.DataTexture(data,WIDTH,HEIGHT,THREE.RGBAFormat);
  field.minFilter=field.magFilter=THREE.LinearFilter;field.needsUpdate=true;
  const fieldUniform={value:field};
  const sampleGLSL=`uniform sampler2D uDiscoveryField; uniform float uReaderChapter; uniform float uHiddenLand; varying vec2 vAtlasPoint;
    float atlasDiscovery(){
      vec2 uv=clamp((vAtlasPoint+vec2(30.0,20.0))/vec2(160.0,120.0),0.0,1.0);
      uv=(uv*vec2(383.0,287.0)+0.5)/vec2(384.0,288.0);
      vec2 encodedField=texture2D(uDiscoveryField,uv).rg;
      return dot(encodedField,vec2(65280.0,255.0))*1024.0/65535.0;
    }
  `;
  function prepare(geometry:THREE.BufferGeometry) {
    // Materials use world coordinates, so every neighboring surface shares fog.
    if(!geometry.getAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count*2),2));
  }
  function apply(material:THREE.MeshStandardMaterial|THREE.LineBasicMaterial|THREE.MeshBasicMaterial,han=false,background=false) {
    const line=!(material instanceof THREE.MeshStandardMaterial);
    const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);
      shader.uniforms.uDiscoveryField=fieldUniform;shader.uniforms.uReaderChapter=chapter;
      shader.uniforms.uHanConquered=conquered;shader.uniforms.uHiddenLand=hidden;
      shader.vertexShader=`varying vec2 vAtlasPoint;\n${han?'attribute vec3 conquestColor; uniform float uHanConquered;':''}\n`+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAtlasPoint=position.xz+vec2(50.0,36.0);');
      if(han)shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb=mix(vColor.rgb,conquestColor,uHanConquered);');
      shader.fragmentShader=sampleGLSL+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        ${background?'if(uHiddenLand>0.5&&vAtlasPoint.x>=-22.0&&vAtlasPoint.x<=111.0&&vAtlasPoint.y>=-17.0&&vAtlasPoint.y<=87.0)discard;':''}
        float discovery=atlasDiscovery();
        if(uHiddenLand>0.5&&discovery>uReaderChapter)discard;
        float fogEdge=max(fwidth(discovery)*2.0,12.0);
        float uncharted=smoothstep(uReaderChapter,uReaderChapter+fogEdge,discovery);
        ${line?'diffuseColor.a*=mix(1.0,0.16,uncharted);':`
        float ink=dot(outgoingLight,vec3(0.2126,0.7152,0.0722));
        vec3 greyLand=vec3(ink*0.38+0.043,ink*0.42+0.054,ink*0.46+0.066);
        outgoingLight=mix(outgoingLight,greyLand,uncharted);`}
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>`atlas-fog-v3-${line}-${han}-${background}-${previousKey}`;
  }
  function createDepthMaterial() {
    const material=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.uniforms.uDiscoveryField=fieldUniform;shader.uniforms.uReaderChapter=chapter;shader.uniforms.uHiddenLand=hidden;
      shader.vertexShader='varying vec2 vAtlasPoint;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAtlasPoint=position.xz+vec2(50.0,36.0);');
      shader.fragmentShader=sampleGLSL+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(uHiddenLand>0.5&&atlasDiscovery()>uReaderChapter)discard;');
    };
    material.customProgramCacheKey=()=>'atlas-fog-depth-v3';return material;
  }
  return {prepare,apply,createDepthMaterial,setHidden(value:boolean){hidden.value=value?1:0;},setChapter(value:number){chapter.value=value;conquered.value=isHanConquered(value)?1:0;},dispose(){field.dispose();}};
}
