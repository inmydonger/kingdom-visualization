import * as THREE from "three";
import { HANGU_PASS, pointInPolygon, RIVERS, STATES } from "./atlas-data";
import { terrainNormal } from "./terrain-height";
import { elevation } from "./map-geometry";

const FORESTS = [
  { x: 22, y: 48, radiusX: 5.3, radiusY: 4.4, trees: 54 },
  { x: 29, y: 45, radiusX: 5.1, radiusY: 4.0, trees: 42 },
  { x: 35, y: 53, radiusX: 5.6, radiusY: 4.2, trees: 48 },
  { x: 47, y: 61, radiusX: 6.0, radiusY: 4.5, trees: 62 },
  { x: 66, y: 58, radiusX: 6.4, radiusY: 4.1, trees: 62 },
  { x: 49, y: 17, radiusX: 5.7, radiusY: 4.4, trees: 42 },
  { x: 79, y: 11, radiusX: 5.8, radiusY: 4.3, trees: 40 },
];

const PINE_COLORS = ["#465b3d", "#536447", "#62724c", "#4e6650", "#74805b"];

export function createVegetation(): THREE.Group {
  const group = new THREE.Group();
  group.name = "Miniature forest groves";
  let seed = 83741;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const clearings = STATES.flatMap(state => [state.capital.position, state.label]);
  const riverSegments = RIVERS.flatMap(river => river.points.slice(1).map((end, index) => ({
    start: river.points[index], end,
  })));
  const trees: { x: number; z: number; y: number; height: number; width: number; turn: number; color: THREE.Color }[] = [];

  for (const forest of FORESTS) {
    let planted = 0;
    for (let attempt = 0; planted < forest.trees && attempt < 1800; attempt++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const mapX = forest.x + Math.cos(angle) * radius * forest.radiusX;
      const mapY = forest.y + Math.sin(angle) * radius * forest.radiusY;
      const x = mapX - 50;
      const z = mapY - 36;
      // Broken edges and small glades keep the groves from reading as solid discs.
      if (Math.sin(mapX * 1.35 + Math.sin(mapY * 0.9)) + Math.cos(mapY * 1.15) > 1.38) continue;
      if (!STATES.some(state => pointInPolygon([mapX, mapY], state.territory))) continue;
      if (clearings.some(([cx, cy]) => Math.hypot(mapX - cx, mapY - cy) < 3)) continue;
      if (Math.hypot(mapX - HANGU_PASS[0], mapY - HANGU_PASS[1]) < 2) continue;
      if (trees.some(tree => Math.hypot(x - tree.x, z - tree.z) < 0.56)) continue;
      if (riverSegments.some(({ start, end }) => {
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const t = THREE.MathUtils.clamp(((mapX - start[0]) * dx + (mapY - start[1]) * dy) / (dx * dx + dy * dy), 0, 1);
        return Math.hypot(mapX - start[0] - t * dx, mapY - start[1] - t * dy) < 1.2;
      })) continue;
      const y = elevation(x, z);
      if (y > 5.6 || terrainNormal(x, z)[1] < 0.72) continue;
      trees.push({
        x, z, y: y + 0.015,
        height: 0.55 + random() * 0.85,
        width: 0.28 + random() * 0.37,
        turn: random() * Math.PI * 2,
        color: new THREE.Color(PINE_COLORS[Math.floor(random() * PINE_COLORS.length)]),
      });
      planted++;
    }
  }

  const canopyGeometry = new THREE.ConeGeometry(1, 1, 10);
  const canopyMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.94, metalness: 0 });
  const trunkGeometry = new THREE.CylinderGeometry(0.65, 1, 1, 6);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#5c4a35", roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length);
  const lowerCanopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, trees.length);
  const upperCanopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, trees.length);
  trunks.name = "Forest trunks";
  lowerCanopies.name = "Forest lower boughs";
  upperCanopies.name = "Forest crowns";
  const transform = new THREE.Object3D();

  trees.forEach((tree, index) => {
    transform.rotation.set(0, tree.turn, 0);
    transform.position.set(tree.x, tree.y + tree.height * 0.18, tree.z);
    transform.scale.set(0.045, tree.height * 0.36, 0.045);
    transform.updateMatrix();
    trunks.setMatrixAt(index, transform.matrix);

    transform.position.y = tree.y + tree.height * 0.47;
    transform.scale.set(tree.width, tree.height * 0.68, tree.width);
    transform.updateMatrix();
    lowerCanopies.setMatrixAt(index, transform.matrix);
    lowerCanopies.setColorAt(index, tree.color);

    transform.position.y = tree.y + tree.height * 0.73;
    transform.scale.set(tree.width * 0.75, tree.height * 0.54, tree.width * 0.75);
    transform.updateMatrix();
    upperCanopies.setMatrixAt(index, transform.matrix);
    upperCanopies.setColorAt(index, tree.color.clone().multiplyScalar(1.06));
  });

  for (const mesh of [trunks, lowerCanopies, upperCanopies]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
