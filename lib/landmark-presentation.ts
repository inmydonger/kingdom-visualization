import * as THREE from 'three';

export const LANDMARK_SCALE = 1.7;

/** Each miniature owns its materials, so emphasis can be restored without rebuilding it. */
export function muteLandmark(object: THREE.Object3D, muted: boolean) {
  object.traverse(part => {
    if (!(part instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      const original = material.userData.atlasColor ??= material.color.clone();
      material.color.copy(original);
      if (muted) {
        const grey = original.r * .2126 + original.g * .7152 + original.b * .0722;
        material.color.setRGB(grey * .75, grey * .79, grey * .8);
      }
    }
  });
}
