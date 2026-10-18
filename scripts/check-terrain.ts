import assert from "node:assert/strict";
import { HANGU_PASS, RIVERS, STATES } from "../lib/atlas-data";
import { elevation, terrainNormal, terrainTint } from "../lib/terrain-height";

let minimum = Infinity;
let maximum = -Infinity;
let steepSlopes = 0;
let flatPlains = 0;
for (let z = -31; z <= 36; z += 0.73) {
  for (let x = -45; x <= 44; x += 0.79) {
    const height = elevation(x, z);
    assert(Number.isFinite(height) && height >= 0.55 && height <= 7.8, `Invalid height at ${x}, ${z}`);
    assert.equal(height, elevation(x, z), "Relief must be repeatable");
    minimum = Math.min(minimum, height);
    maximum = Math.max(maximum, height);
    const normal = terrainNormal(x, z);
    assert(Math.abs(Math.hypot(...normal) - 1) < 1e-10 && normal[1] > 0, "Normals must be upward unit vectors");
    if (normal[1] < 0.6) steepSlopes++;
    if (x > 2 && z > -8 && z < 8 && normal[1] > 0.995) flatPlains++;
    const tint = terrainTint(x, z);
    assert(tint >= 0.88 && tint <= 1.06, "Tint must remain a subtle material modulation");
  }
}
assert(maximum > 5, "Connected mountain ranges must rise above the lowlands");
assert(maximum - minimum > 4.5, "Relief needs a meaningful height range");
assert(steepSlopes > 50, "The map needs steep escarpments and cliff faces");
assert(flatPlains > 100, "Central plains must retain broad nearly level areas");

for (const [atlasX, atlasY] of [...STATES.map(state => state.capital.position), HANGU_PASS]) {
  const x = atlasX - 50;
  const z = atlasY - 36;
  for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) {
    assert(Math.abs(elevation(x + dx, z + dz) - 0.74) < 1e-10, "Palace and pass bases need level ground");
  }
}

// Compare actual landforms, so a uniform floor or a generic noise field fails.
assert(elevation(-35, 0) > elevation(12, 0) + 3, "Western Qin should be much higher than the central plain");
assert(elevation(-20, 8) > elevation(-20, -4) + 1.5, "Qinling must form a connected transverse ridge");
assert(elevation(-4, -18) > elevation(7, -18) + 2, "Taihang must rise over the eastern plains");
assert(elevation(27, -27) > elevation(27, -14) + 1.5, "Yan needs a northern mountain belt");
for (const river of RIVERS) {
  for (const [atlasX, atlasY] of river.points) {
    const x = atlasX - 50;
    const z = atlasY - 36;
    const nearClearing = [...STATES.map(state => state.capital.position), HANGU_PASS]
      .some(([cx, cy]) => Math.hypot(atlasX - cx, atlasY - cy) < 2.35);
    if (!nearClearing) assert(elevation(x, z) < 0.64, `${river.name} must cut a low continuous drainage bed`);
  }
}

console.log(`Relief validated: ${minimum.toFixed(2)}–${maximum.toFixed(2)} units, ${steepSlopes} steep samples, ${flatPlains} flat central-plain samples; level capitals and carved rivers.`);
