import { HANGU_PASS, RIVERS, STATES } from "./atlas-data";

const FLOOR = 0.62;
const CAPITAL_LEVEL = 0.74;

function clamp(value: number, low = 0, high = 1): number {
  return Math.max(low, Math.min(high, value));
}

function smoothstep(low: number, high: number, value: number): number {
  const t = clamp((value - low) / (high - low));
  return t * t * (3 - 2 * t);
}

function hash(x: number, z: number): number {
  let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ 19237;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const dx = x - ix;
  const dz = z - iz;
  const tx = dx * dx * dx * (dx * (dx * 6 - 15) + 10);
  const tz = dz * dz * dz * (dz * (dz * 6 - 15) + 10);
  const a = hash(ix, iz);
  const b = hash(ix + 1, iz);
  const c = hash(ix, iz + 1);
  const d = hash(ix + 1, iz + 1);
  return ((a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz) * 2 - 1;
}

function fbm(x: number, z: number): number {
  return noise(x, z) * 0.58 + noise(x * 2.03 + 31, z * 2.03 - 17) * 0.27
    + noise(x * 4.11 - 23, z * 4.11 + 39) * 0.11
    + noise(x * 8.21 + 53, z * 8.21 + 7) * 0.04;
}

function window(value: number, low: number, high: number, feather: number): number {
  return smoothstep(low - feather, low + feather, value)
    * (1 - smoothstep(high - feather, high + feather, value));
}

function ridge(distance: number, width: number): number {
  const d = distance / width;
  return Math.exp(-d * d);
}

const clearings = [...STATES.map(state => state.capital.position), HANGU_PASS]
  .map(([x, y]) => [x - 50, y - 36] as const);

const riverSegments = RIVERS.flatMap(river => river.points.slice(1).map(([bx, by], index) => {
  const [ax, ay] = river.points[index];
  const dx = bx - ax;
  const dz = by - ay;
  return { x: ax - 50, z: ay - 36, dx, dz, inverseLength: 1 / (dx * dx + dz * dz) };
}));

function drainageDistance(x: number, z: number): number {
  let nearest = 1e3;
  for (const segment of riverSegments) {
    const px = x - segment.x;
    const pz = z - segment.z;
    const t = clamp((px * segment.dx + pz * segment.dz) * segment.inverseLength);
    const distance = Math.hypot(px - t * segment.dx, pz - t * segment.dz);
    // A smooth minimum rounds the meeting of river segments into a riverbed.
    const blend = Math.max(0, 0.35 - Math.abs(nearest - distance)) / 0.35;
    nearest = Math.min(nearest, distance) - blend * blend * 0.0875;
  }
  return Math.max(0, nearest);
}

/**
 * Schematic relief, not a historical DEM. Coordinates are Three.js world x/z:
 * x = atlas x - 50, z = atlas y - 36. The continuous field lets adjacent state
 * meshes share exactly the same ridges, valleys, and surface normals.
 */
export function elevation(x: number, z: number): number {
  const broad = fbm(x * 0.11, z * 0.11);
  const warp = fbm(x * 0.14 + 61, z * 0.14 - 43);
  const detail = fbm(x * 0.67 - 19, z * 0.67 + 11);
  const base = 0.77 + broad * 0.11;

  // Broad uplift with a broken, steep eastern escarpment, rather than cones.
  const westernExtent = window(z, -18, 19, 5) * window(x, -43, -20, 4);
  const plateauEdge = -24 + Math.sin(z * 0.23) * 1.5 + warp * 1.3;
  const westernPlateau = westernExtent * (1 - smoothstep(plateauEdge - 0.75, plateauEdge + 0.95, x))
    * (1.65 + broad * 0.48);
  const westSpine = -35.5 + Math.sin(z * 0.14) * 3 + warp * 1.4;
  const westernRidge = ridge(x - westSpine, 3.5) * window(z, -20, 24, 5)
    * (3.25 + fbm(x * 0.2 + 7, z * 0.19) * 0.9);
  const westFoothills = ridge(x - westSpine - 5.8, 5.8) * window(z, -19, 20, 5) * 0.9;

  const qinlingSpine = 8.1 + Math.sin(x * 0.18) * 1.35 + warp * 0.55;
  const qinling = ridge(z - qinlingSpine, 2.3) * window(x, -35, -7, 4)
    * (3.4 + noise(x * 0.25 + 8, z * 0.2 - 4) * 0.65);
  const qinlingFoothills = ridge(z - qinlingSpine, 5.3) * window(x, -36, -6, 4) * 0.8;

  const taihangSpine = -5.3 + Math.sin(z * 0.2) * 1.3 + warp * 0.6;
  const taihangExtent = window(z, -26, -2.5, 3);
  const taihang = ridge(x - taihangSpine, 1.65) * taihangExtent
    * (3.9 + noise(x * 0.3, z * 0.29 + 3) * 0.75);
  const shanxiPlateau = window(x, -14, -4, 3) * taihangExtent
    * (1 - smoothstep(taihangSpine - 0.4, taihangSpine + 0.8, x)) * (1.1 + broad * 0.3);

  const yanSpine = -25.4 + Math.sin(x * 0.19) * 1.6 + warp * 0.8;
  const yan = ridge(z - yanSpine, 2.6) * window(x, 7, 38, 5)
    * (3.4 + noise(x * 0.2 - 7, z * 0.3) * 0.7);
  const yanFoothills = ridge(z - yanSpine - 3.1, 4) * window(x, 6, 40, 5) * 0.7;

  const southernExtent = smoothstep(10, 18, z) * window(x, -28, 30, 6);
  const southernHills = southernExtent * (0.57 + fbm(x * 0.19 + 67, z * 0.21 + 19) * 0.65);
  const easternHills = ridge(x - 28, 5) * ridge(z + 1, 5.5) * (0.75 + broad * 0.25);
  let relief = westernPlateau + westernRidge + westFoothills + qinling + qinlingFoothills
    + taihang + shanxiPlateau + yan + yanFoothills + southernHills + easternHills;

  // Warped branching channels interrupt the slopes without adding pointed peaks.
  const drainageField = Math.abs(fbm(x * 0.24 + warp * 0.55 + 101, z * 0.28 - 37));
  const gullies = 1 - smoothstep(0.025, 0.15, drainageField);
  relief *= 1 - gullies * 0.18;
  relief += detail * Math.min(0.26, relief * 0.07);
  let height = base + relief;

  // Both rivers carve through the same field used by the draped water ribbons.
  const channel = 1 - smoothstep(0.22, 1.65, drainageDistance(x, z));
  height = height * (1 - channel) + FLOOR * channel;

  for (const [cx, cz] of clearings) {
    const distance = Math.hypot(x - cx, z - cz);
    const clearing = 1 - smoothstep(1.3, 2.35, distance);
    height = height * (1 - clearing) + CAPITAL_LEVEL * clearing;
  }
  // Compress the very highest intersections smoothly; a hard ceiling would
  // shave flat shelves across the overlapping western mountain ranges.
  return Math.max(0.55, height <= 6.6 ? height : 6.6 + 1.2 * (1 - Math.exp(-(height - 6.6) / 1.2)));
}

/** Subtle large-scale mineral variation; the material supplies the fine grain. */
export function terrainTint(x: number, z: number): number {
  return clamp(0.97 + fbm(x * 0.23 + 71, z * 0.23 - 89) * 0.085, 0.88, 1.06);
}

/** Surface normal of y = elevation(x, z), including the river and city cutouts. */
export function terrainNormal(x: number, z: number): readonly [number, number, number] {
  const step = 0.075;
  const nx = (elevation(x - step, z) - elevation(x + step, z)) / (2 * step);
  const nz = (elevation(x, z - step) - elevation(x, z + step)) / (2 * step);
  const length = Math.hypot(nx, 1, nz);
  return [nx / length, 1 / length, nz / length];
}
