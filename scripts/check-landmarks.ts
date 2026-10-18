import assert from "node:assert/strict";
import * as THREE from "three";
import { STORY_SITES, type LandmarkKind } from "../lib/story-data";
import { createStoryMiniature } from "../lib/story-miniatures";

type Tier = "major" | "standard";
const kinds = [...new Set(STORY_SITES.map(site => site.kind))];
const variants: Array<{ kind: LandmarkKind; tier: Tier }> = kinds.map(kind => ({ kind, tier: "standard" }));
for (const kind of new Set(STORY_SITES.filter(site => site.tier === "major").map(site => site.kind))) {
  variants.push({ kind, tier: "major" });
}
assert.equal(kinds.length, 13, "The story dataset exercises all thirteen miniature kinds");
assert.equal(variants.length, 15, "Both larger landmarks have standard and major variants");

const sizes = new Map<string, THREE.Vector3>();
let mostDrawCalls = 0;
for (const { kind, tier } of variants) {
  const label = `${kind}/${tier}`;
  const model = createStoryMiniature(kind, tier, "#758466");
  try {
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    let drawCalls = 0;
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      drawCalls++;
      const positions = object.geometry.getAttribute("position");
      assert(positions && positions.count > 0, `${label} has vertices`);
      for (let i = 0; i < positions.count; i++) {
        assert(Number.isFinite(positions.getX(i)) && Number.isFinite(positions.getY(i)) && Number.isFinite(positions.getZ(i)), `${label} has finite vertices`);
      }
      assert(object.castShadow && object.receiveShadow, `${label} participates in map lighting`);
    });
    assert(drawCalls > 0 && drawCalls <= 12, `${label} stays within twelve material batches`);
    assert(Math.abs(bounds.min.y) < 1e-5, `${label} rests on local ground`);
    assert(size.toArray().every(value => Number.isFinite(value) && value > 0), `${label} has finite, nonzero bounds`);
    assert(Math.max(size.x, size.z) <= (tier === "major" ? 6.5 : 4), `${label} fits its map footprint`);
    assert(size.y <= 4, `${label} stays below the atlas height limit`);
    sizes.set(label, size);
    mostDrawCalls = Math.max(mostDrawCalls, drawCalls);
  } finally {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}

for (const kind of ["granary", "pass"]) {
  const standard = sizes.get(`${kind}/standard`)!;
  const major = sizes.get(`${kind}/major`)!;
  assert(major.x > standard.x && major.z > standard.z, `${kind}'s major model is larger on both ground axes`);
}
console.log(`Landmarks validated: ${variants.length} variants, grounded finite geometry, bounded footprints and heights, larger major models, and at most ${mostDrawCalls} draw calls per model.`);
