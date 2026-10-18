/** Camera flights use the atlas' strong ease-out, and always settle at the target. */
export function cameraFlightProgress(elapsed: number, duration: number): number {
  if (elapsed <= 0) return 0;
  if (duration <= 0 || elapsed >= duration) return 1;
  const x = elapsed / duration;
  // Invert x for cubic-bezier(0.23, 1, 0.32, 1), then evaluate y.
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) {
    const t = (lo + hi) / 2, u = 1 - t;
    const curveX = 3 * u * u * t * 0.23 + 3 * u * t * t * 0.32 + t * t * t;
    if (curveX < x) lo = t; else hi = t;
  }
  const t = (lo + hi) / 2;
  return 1 - (1 - t) ** 3;
}

export function cameraFlightDuration(distance: number, fromZoom: number, toZoom: number): number {
  const travel = Math.max(0, distance) / 120 + Math.abs(Math.log(Math.max(0.01, toZoom) / Math.max(0.01, fromZoom)));
  return Math.min(650, Math.max(300, 300 + travel * 160));
}

export function clampCameraTarget(x: number, z: number, worldScale: number): [number, number] {
  return [Math.max(-43 * worldScale, Math.min(43 * worldScale, x)), Math.max(-28 * worldScale, Math.min(28 * worldScale, z))];
}
