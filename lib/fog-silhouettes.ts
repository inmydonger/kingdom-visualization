import * as THREE from "three";

type SilhouetteKind = "fortress" | "gate" | "banner" | "mountain";

/** Unnamed shapes suggest places in the mist without revealing their identity. */
export function createFogSilhouette(kind: SilhouetteKind): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: "#b5babe",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  function add(geometry: THREE.BufferGeometry, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    return mesh;
  }

  function wall(width: number, height: number, depth: number, x = 0, z = 0, bottom = 0) {
    return add(new THREE.BoxGeometry(width, height, depth), x, bottom + height / 2, z);
  }

  if (kind === "fortress") {
    const tower = new THREE.CylinderGeometry(0.29, 0.36, 1.48, 16);
    const crown = new THREE.CylinderGeometry(0.36, 0.31, 0.15, 16);
    for (const x of [-1, 1]) {
      for (const z of [-0.85, 0.85]) {
        add(tower, x, 0.74, z);
        add(crown, x, 1.53, z);
      }
      wall(0.2, 0.9, 1.7, x);
      wall(2, 0.9, 0.2, 0, x * 0.85);
    }
    wall(0.9, 1.15, 0.8, 0, -0.12);
  } else if (kind === "gate") {
    const tower = new THREE.CylinderGeometry(0.32, 0.4, 1.65, 16);
    const crown = new THREE.CylinderGeometry(0.4, 0.34, 0.16, 16);
    for (const x of [-1, 1]) {
      add(tower, x, 0.825);
      add(crown, x, 1.73);
    }
    wall(1.6, 0.42, 0.38, 0, 0, 1.1);
  } else if (kind === "banner") {
    add(new THREE.CylinderGeometry(0.025, 0.04, 2.6, 12), -0.75, 1.3);
    add(new THREE.CylinderGeometry(0.28, 0.36, 0.12, 16), -0.75, 0.06);
    const cloth = new THREE.PlaneGeometry(1.65, 0.78, 10, 4);
    const positions = cloth.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const along = positions.getX(i) + 0.825;
      positions.setZ(i, Math.sin(along * 5) * along * 0.12);
      positions.setY(i, positions.getY(i) - along * 0.1);
    }
    cloth.computeVertexNormals();
    add(cloth, 0.075, 2.1);
  } else {
    for (const [x, z, radius, height] of [
      [-0.75, 0.12, 0.72, 1.55],
      [0.1, -0.15, 0.88, 2.55],
      [0.85, 0.22, 0.67, 1.85],
    ]) {
      const peak = new THREE.ConeGeometry(radius, height, 20, 6);
      const positions = peak.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        const angle = Math.atan2(positions.getZ(i), positions.getX(i));
        const contour = 1 + Math.sin(angle * 3 + y * 1.2) * 0.06;
        positions.setX(i, positions.getX(i) * contour);
        positions.setZ(i, positions.getZ(i) * contour);
      }
      peak.computeVertexNormals();
      add(peak, x, height / 2, z);
    }
  }

  return group;
}
