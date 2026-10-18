import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getCampaignRoutes } from '../lib/campaign-data';
import { createCampaignOverlay, disposeCampaignOverlay } from '../lib/campaign-geometry';
import { STATES } from '../lib/atlas-data';
import { advanceExploration, restoreExploration } from '../lib/reader-progress';

const coalition=getCampaignRoutes('coalition-invasion',845);
assert.deepEqual(coalition.map(r=>r.attacker).sort(),['chu','han','wei','yan','zhao']);
assert(coalition.every(r=>r.defender==='qin'));
assert.equal(getCampaignRoutes('coalition-invasion',256).length,0);
assert.equal(getCampaignRoutes('escape-from-zhao',845).length,0,'Personal arcs must not invent interstate invasions');
assert.equal(getCampaignRoutes('nature-of-humanity',845).length,0);
assert.deepEqual(getCampaignRoutes('three-states',845).map(r=>[r.attacker,r.defender]),[['qin','chu'],['wei','chu']]);
assert.equal(getCampaignRoutes('great-qin-zhao-war',845).length,0,'Future geography must remain gated');
const overlay=createCampaignOverlay(coalition);
assert.equal(overlay.userData.routeCount,5);
for(const route of coalition){
  const meshes=overlay.children.filter(o=>o.name===`${route.attacker}-to-${route.defender}`) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>[];
  assert.equal(meshes.length,3);
  assert(meshes.some(m=>m.material.color.getHexString()===STATES.find(s=>s.id===route.attacker)!.color.slice(1)),'Each arrow uses the attacking state color');
  assert(meshes.every(m=>m.material.transparent),'All arrow layers must share the transparent render queue, so the outline cannot cover the state color');
}
overlay.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Line){assert([...object.geometry.getAttribute('position').array].every(Number.isFinite));}});
disposeCampaignOverlay(overlay);
assert.equal(advanceExploration(845,100),845);
assert.equal(advanceExploration(845,890),890);
assert.equal(restoreExploration(100,null,null),100,'Fresh early readers must not inherit the default chapter');
assert.equal(restoreExploration(100,'845','100'),845);
assert.equal(restoreExploration(100,null,'845'),845,'Migrate existing saved reading progress');
assert.equal(restoreExploration(100,'not-a-number',null),100);
console.log('Campaign and saved-exploration checks passed: five coalition armies, state colors, spoiler gates, non-war arcs, allied offensives, persistence, and migration.');
