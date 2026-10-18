import assert from "node:assert/strict";
import * as THREE from "three";
import { buildMap } from "../lib/map-geometry";

const map = buildMap();
map.group.updateMatrixWorld(true);
const terrain = map.group.children[0] as THREE.Group;
// The tile base ends at the realm outline; state surfaces overlay its narrow lip.
const mainland = terrain.getObjectByName('realm-base');
assert(mainland instanceof THREE.Mesh, "Expected the sampled mainland surface");
const surfaces = [mainland, ...map.stateMeshes.values()];
for (const mesh of surfaces) mesh.geometry.computeBoundingBox();

const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const downward = new THREE.Vector3(0, -1, 0);
const metrics = new Map<string, { count: number; minimum: number; point: THREE.Vector3 }>();

function verifyDrape(point: THREE.Vector3, kind: string): void {
  rayOrigin.set(point.x, 100, point.z);
  raycaster.set(rayOrigin, downward);
  const hit = raycaster.intersectObjects(surfaces, false)[0];
  assert(hit, `${kind} must have a visible terrain surface below it`);
  const clearance = point.y - hit.point.y;
  const metric = metrics.get(kind) ?? { count: 0, minimum: Infinity, point: new THREE.Vector3() };
  metric.count++;
  if (clearance < metric.minimum) { metric.minimum = clearance; metric.point.copy(point); }
  metrics.set(kind, metric);
  assert(clearance > -1e-4, `${kind} is buried by ${-clearance} units at ${point.toArray()}`);
}

const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
const regressions: THREE.Vector3[] = [];
const flatSamples: { point: THREE.Vector3; object: THREE.Object3D }[] = [];
for (const border of map.borders.values()) {
  const positions = border.geometry.getAttribute("position");
  for (let sample = 0; sample < 7; sample++) {
    const index = Math.floor(sample * (positions.count - 1) / 7);
    a.fromBufferAttribute(positions, index);
    verifyDrape(a, "Border vertices");
    b.fromBufferAttribute(positions, index + 1);
    verifyDrape(c.copy(a).add(b).multiplyScalar(0.5), "Border segment interiors");
    if (sample < 2) flatSamples.push({ point: a.clone(), object: border });
  }
  let highest = 0;
  for (let index = 1; index < positions.count; index++) {
    if (positions.getY(index) > positions.getY(highest)) highest = index;
  }
  verifyDrape(a.fromBufferAttribute(positions, highest), "High-relief border vertices");
  // Explicit regression for the former worst buried vertex in southern Zhao.
  if (border === map.borders.get("zhao")) {
    let nearest = 0, distance = Infinity;
    for (let index = 0; index < positions.count; index++) {
      const candidate = Math.hypot(positions.getX(index) + 6.8888888889, positions.getZ(index) + 4.4444444444);
      if (candidate < distance) { nearest = index; distance = candidate; }
    }
    regressions.push(a.fromBufferAttribute(positions, nearest).clone());
  }
}

let rivers = 0;
for (const object of terrain.children) {
  if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)
    || object.material.color.getHexString() !== "619b9b") continue;
  rivers++;
  const positions = object.geometry.getAttribute("position");
  for (let sample = 0; sample < 16; sample++) {
    const index = Math.floor(sample * (positions.count - 1) / 16);
    verifyDrape(a.fromBufferAttribute(positions, index), "River edge vertices");
  }
  const indices = object.geometry.getIndex()!;
  for (let sample = 0; sample < 16; sample++) {
    const index = Math.floor(sample * (indices.count / 3 - 1) / 16) * 3;
    a.fromBufferAttribute(positions, indices.getX(index));
    b.fromBufferAttribute(positions, indices.getX(index + 1));
    c.fromBufferAttribute(positions, indices.getX(index + 2));
    verifyDrape(a.add(b).add(c).multiplyScalar(1 / 3), "River face interiors");
  }
  // Western Yangtze bend: the old edge sat 0.113 units below the terrain.
  if (rivers === 2) {
    let nearest = 0, distance = Infinity;
    for (let index = 0; index < positions.count; index++) {
      const candidate = Math.hypot(positions.getX(index) + 36.2081947327, positions.getZ(index) - 14.7325315475);
      if (candidate < distance) { nearest = index; distance = candidate; }
    }
    regressions.push(a.fromBufferAttribute(positions, nearest).clone());
  }
}
assert.equal(rivers, 2, "Both rivers must be checked");
for (const point of regressions) verifyDrape(point, "Previously buried points");

// A flattened relief uses exactly the same x/z surface with scaled heights.
map.setRelief(false);
map.group.updateMatrixWorld(true);
for (const { point, object } of flatSamples) {
  verifyDrape(a.copy(point).applyMatrix4(object.matrixWorld), "Flattened border vertices");
}
for (const point of regressions) verifyDrape(a.copy(point).applyMatrix4(terrain.matrixWorld), "Flattened regression points");

for (const [kind, metric] of metrics) {
  console.log(`${kind}: ${metric.count} samples, minimum clearance ${metric.minimum.toFixed(6)} at [${metric.point.toArray().map(n => n.toFixed(4)).join(", ")}]`);
}

const geometries = new Set<THREE.BufferGeometry>();
const materials = new Set<THREE.Material>();
map.group.traverse(object => {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  }
});
geometries.forEach(geometry => geometry.dispose());
materials.forEach(material => material.dispose());
map.disposeTextures();
