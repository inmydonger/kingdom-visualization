import * as THREE from "three";

const SIZE = 512;

function hash(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function fade(value: number): number {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

// Wrapping lattice coordinates keeps every octave continuous across the tile.
function noise(u: number, v: number, columns: number, rows: number, seed: number): number {
  const x = u * columns;
  const y = v * rows;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const tx = fade(x - ix);
  const ty = fade(y - iy);
  const x0 = wrap(ix, columns);
  const x1 = wrap(ix + 1, columns);
  const y0 = wrap(iy, rows);
  const y1 = wrap(iy + 1, rows);
  const a = hash(x0, y0, seed);
  const b = hash(x1, y0, seed);
  const c = hash(x0, y1, seed);
  const d = hash(x1, y1, seed);
  return ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty) * 2 - 1;
}

function fbm(u: number, v: number): number {
  let value = 0;
  let amplitude = 0.56;
  let frequency = 4;
  for (let octave = 0; octave < 5; octave++) {
    value += noise(u, v, frequency, frequency, 137 + octave * 971) * amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value;
}

function smoothstep(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function texture(data: Uint8Array, colorSpace: THREE.ColorSpace): THREE.DataTexture {
  const result = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  result.colorSpace = colorSpace;
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.magFilter = THREE.LinearFilter;
  result.minFilter = THREE.LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.anisotropy = 4;
  result.needsUpdate = true;
  return result;
}

/**
 * Shared mineral/parchment maps for relief and cliffs. Use world-space UVs
 * (x / 28, z / 28); the caller owns both textures and must dispose them.
 * Generation is deterministic and also works without a browser or canvas.
 */
export function createTerrainTextures(): {
  color: THREE.DataTexture;
  bump: THREE.DataTexture;
} {
  const colorData = new Uint8Array(SIZE * SIZE * 4);
  const bumpData = new Uint8Array(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE;
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const warpX = noise(u, v, 4, 4, 733) * 0.035;
      const warpY = noise(u, v, 4, 4, 919) * 0.035;
      const mottle = fbm(u + warpX, v + warpY);
      const fine = noise(u, v, 128, 128, 4451);
      const grain = hash(x, y, 9527) * 2 - 1;
      const pores = smoothstep(0.38, 0.8, -noise(u, v, 256, 256, 2879));
      const sediment = noise(u + warpX, v + warpY * 0.25, 4, 96, 1259);
      // A narrow ridge in a warped field reads as a faint natural mineral vein.
      const veinField = Math.abs(noise(u + warpX, v + warpY, 16, 16, 1877));
      const vein = 1 - smoothstep(0.015, 0.075, veinField);
      const tone = mottle * 16 + fine * 2 + grain * 1.4 - vein * 3 - pores * 2;
      const offset = (y * SIZE + x) * 4;

      colorData[offset] = byte(232 + tone);
      colorData[offset + 1] = byte(230 + tone);
      colorData[offset + 2] = byte(222 + tone * 0.92);
      colorData[offset + 3] = 255;

      const height = byte(128 + mottle * 9 + sediment * 9 + fine * 4 + grain * 2 - pores * 11 - vein * 2);
      bumpData[offset] = height;
      bumpData[offset + 1] = height;
      bumpData[offset + 2] = height;
      bumpData[offset + 3] = 255;
    }
  }

  const color = texture(colorData, THREE.SRGBColorSpace);
  const bump = texture(bumpData, THREE.NoColorSpace);
  color.name = "Atlas mineral parchment";
  bump.name = "Atlas sediment and stone pores";
  return { color, bump };
}
