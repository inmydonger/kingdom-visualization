import assert from "node:assert/strict";
import * as THREE from "three";
import { STATES, pointInPolygon, type Point } from "../lib/atlas-data";
import { STORY_SITES } from "../lib/story-data";
import { buildMap, reliefHeight, worldPoint } from "../lib/map-geometry";
import { MAP_WORLD_SCALE, atlasCoordinates, mapWorldPoint } from "../lib/map-space";

const close = (actual: number, expected: number, message: string, tolerance = 1e-8) => {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, received ${actual}`);
};
const samples: { name: string; point: Point }[] = [
  ...STATES.flatMap(state => [
    { name: `${state.id} label`, point: state.label },
    { name: `${state.id} capital`, point: state.capital.position },
  ]),
  ...STORY_SITES.map(site => ({ name: site.id, point: site.position })),
];

assert(MAP_WORLD_SCALE > 1, "The landscape must expand around fixed-size miniatures");
for (const { name, point } of samples) {
  const local = worldPoint(point);
  const expanded = mapWorldPoint(point, 0.08);
  const restored = atlasCoordinates(expanded);
  close(restored[0], point[0], `${name} restores its east coordinate`);
  close(restored[1], point[1], `${name} restores its south coordinate`);
  close(expanded.y, local.y + 0.08, `${name} keeps terrain height and model lift`);
}

for (let i = 0; i < STORY_SITES.length; i++) {
  for (let j = i + 1; j < STORY_SITES.length; j++) {
    const a = STORY_SITES[i], b = STORY_SITES[j];
    const originalDistance = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1]);
    const expandedA = mapWorldPoint(a.position), expandedB = mapWorldPoint(b.position);
    const expandedDistance = Math.hypot(expandedA.x - expandedB.x, expandedA.z - expandedB.z);
    close(expandedDistance, originalDistance * MAP_WORLD_SCALE, `${a.id}/${b.id} gain landscape spacing`);
    assert(expandedDistance > originalDistance, "Distinct miniatures must be farther apart");
  }
}

const map = buildMap();
try {
  map.group.scale.set(MAP_WORLD_SCALE, 1, MAP_WORLD_SCALE);
  const raycaster = new THREE.Raycaster();
  const downward = new THREE.Vector3(0, -1, 0);
  const surfaces = [...map.stateMeshes.values()];
  const tileBase=map.group.getObjectByName('realm-base') as THREE.Mesh;
  assert(tileBase, 'The atlas has a bounded realm tile');
  assert(!map.group.getObjectByName('context-base'), 'The oversized plain must not return');
  map.group.updateMatrixWorld(true);
  for(const point of [[2,20],[40,3],[95,40],[60,77],[120,30]] as Point[]){
    const position=mapWorldPoint(point);
    raycaster.set(new THREE.Vector3(position.x,100,position.z),downward);
    assert.equal(raycaster.intersectObjects([tileBase,...surfaces],false).length,0,`No empty plains outside the realm at ${point}`);
  }
  for (const relief of [true, false]) {
    map.setRelief(relief);
    map.group.updateMatrixWorld(true);
    for (const { name, point } of samples) {
      const position = mapWorldPoint(point);
      raycaster.set(new THREE.Vector3(position.x, 100, position.z), downward);
      const hit = raycaster.intersectObjects(surfaces, false)[0];
      assert(hit, `${name} has scaled terrain beneath it in ${relief ? "relief" : "flat"} mode`);
      const owners = STATES.filter(state => pointInPolygon(point, state.territory));
      assert(owners.some(state => state.id === hit.object.userData.stateId), `${name} picks its geographic owner`);
      const restored = atlasCoordinates(hit.point);
      close(restored[0], point[0], `${name} raycast restores its east coordinate`, 1e-6);
      close(restored[1], point[1], `${name} raycast restores its south coordinate`, 1e-6);
      close(hit.point.y, reliefHeight(position.y, relief), `${name} terrain height matches model placement`, 1e-4);
      const modelBase = reliefHeight(position.y, relief) + 0.08;
      close(modelBase - hit.point.y, 0.08, `${name} stays grounded with its lift`, 1e-4);
    }
  }
} finally {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  map.group.traverse(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  map.disposeTextures();
}

console.log(`Map spacing validated: ${samples.length} coordinate round trips and scaled terrain picks in relief and flat modes, plus all 190 inter-site distances.`);
