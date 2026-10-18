import type { Point } from './atlas-data';
import { worldPoint } from './map-geometry';

// Expand the landscape without enlarging the miniature models.
export const MAP_WORLD_SCALE = 2.5;

export function mapWorldPoint(point: Point, lift = 0) {
  const position = worldPoint(point, lift);
  position.x *= MAP_WORLD_SCALE;
  position.z *= MAP_WORLD_SCALE;
  return position;
}

export function atlasCoordinates(position: { x: number; z: number }): Point {
  return [position.x / MAP_WORLD_SCALE + 50, position.z / MAP_WORLD_SCALE + 36];
}
