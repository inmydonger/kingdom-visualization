import * as THREE from "three";

function material(color: THREE.ColorRepresentation) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.08, flatShading: true });
}

function box(group: THREE.Group, mat: THREE.Material, size: [number, number, number], at: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...at);
  group.add(mesh);
  return mesh;
}

/** Three bands give the eaves a lifted corner and a shallow, Chinese hip roof. */
function roof(width: number, depth: number, height: number) {
  const outline = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < 3; ring++) {
    const sx = [1, 0.78, 0.3][ring];
    const sz = [1, 0.72, 0.025][ring];
    for (let i = 0; i < 8; i++) {
      const [x, z] = outline[i];
      const y = ring === 0 ? (i % 2 === 0 ? height * 0.18 : 0) : height * (ring === 1 ? 0.35 : 1);
      positions.push(x * width * sx * 0.5, y, z * depth * sz * 0.5);
    }
  }
  for (let ring = 0; ring < 2; ring++) {
    for (let i = 0; i < 8; i++) {
      const a = ring * 8 + i;
      const b = ring * 8 + (i + 1) % 8;
      const c = a + 8;
      const d = b + 8;
      indices.push(a, c, b, b, c, d);
    }
  }
  indices.push(16, 20, 18, 16, 22, 20);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addRoof(group: THREE.Group, mat: THREE.Material, width: number, depth: number, y: number, height: number) {
  const mesh = new THREE.Mesh(roof(width, depth, height), mat);
  mesh.position.y = y;
  group.add(mesh);
  return mesh;
}

/** A shared palace miniature; callers position the capital's root on the map. */
export function createCapital(color: string): THREE.Group {
  const group = new THREE.Group();
  group.name = "Capital palace";
  const stone = material("#86785b");
  const paleStone = material("#b2a383");
  const timber = material("#62503a");
  const ink = new THREE.Color("#292d29").lerp(new THREE.Color(color), 0.14);
  const roofMaterial = material(ink);
  const brass = material("#b99b5a");

  box(group, stone, [1.36, 0.11, 1.13], [0, 0.055, 0]);
  box(group, paleStone, [1.2, 0.045, 0.98], [0, 0.132, 0]);
  box(group, stone, [0.43, 0.045, 0.16], [0, 0.023, 0.645]);
  box(group, paleStone, [0.43, 0.05, 0.13], [0, 0.07, 0.57]);

  // Low enclosure and four corner piers make the capital read as fortified.
  box(group, stone, [1.24, 0.14, 0.075], [0, 0.19, -0.49]);
  for (const x of [-0.58, 0.58]) {
    box(group, stone, [0.075, 0.14, 0.94], [x, 0.19, 0]);
    for (const z of [-0.45, 0.45]) box(group, paleStone, [0.13, 0.2, 0.13], [x, 0.22, z]);
  }
  box(group, timber, [0.68, 0.28, 0.53], [0, 0.295, -0.035]);
  for (const x of [-0.29, 0.29]) {
    box(group, brass, [0.035, 0.29, 0.035], [x, 0.3, 0.255]);
  }
  box(group, roofMaterial, [0.13, 0.21, 0.018], [0, 0.26, 0.24]);
  addRoof(group, roofMaterial, 1.04, 0.84, 0.43, 0.22);
  box(group, timber, [0.38, 0.17, 0.31], [0, 0.68, -0.02]);
  addRoof(group, roofMaterial, 0.69, 0.56, 0.745, 0.19);
  box(group, brass, [0.28, 0.025, 0.035], [0, 0.944, 0]);

  // A tiny rigid pennant, deliberately static at map scale.
  box(group, brass, [0.018, 0.7, 0.018], [0.48, 0.49, -0.3]);
  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.2, -0.035);
  flagShape.lineTo(0.17, -0.16);
  flagShape.lineTo(0, -0.14);
  flagShape.closePath();
  const flagMaterial = new THREE.MeshStandardMaterial({ color: brass.color, roughness: 0.95, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), flagMaterial);
  flag.position.set(0.49, 0.84, -0.3);
  group.add(flag);
  return group;
}

/** Hangu Pass: a stone arch flanked by roofed watchtowers. */
export function createPass(): THREE.Group {
  const group = new THREE.Group();
  group.name = "Hangu Pass";
  const stone = material("#8b8065");
  const capstone = material("#ac9a75");
  const timber = material("#62513c");
  const ink = material("#33382f");
  const wall = new THREE.Shape();
  wall.moveTo(-1.35, 0);
  wall.lineTo(-0.3, 0);
  wall.lineTo(-0.3, 0.4);
  wall.absarc(0, 0.4, 0.3, Math.PI, 0, true);
  wall.lineTo(0.3, 0);
  wall.lineTo(1.35, 0);
  wall.lineTo(1.35, 0.83);
  wall.lineTo(-1.35, 0.83);
  wall.closePath();
  const curtain = new THREE.Mesh(new THREE.ExtrudeGeometry(wall, { depth: 0.28, bevelEnabled: false, curveSegments: 6 }), stone);
  curtain.position.z = -0.14;
  group.add(curtain);
  for (const x of [-1.03, 1.03]) {
    box(group, stone, [0.62, 0.83, 0.65], [x, 0.415, 0]);
    box(group, capstone, [0.69, 0.08, 0.71], [x, 0.85, 0]);
    box(group, timber, [0.4, 0.26, 0.42], [x, 1.02, 0]);
    const towerRoof = addRoof(group, ink, 0.81, 0.76, 1.14, 0.24);
    towerRoof.position.x = x;
    box(group, ink, [0.13, 0.19, 0.025], [x, 0.5, 0.335]);
  }
  for (const x of [-0.54, -0.18, 0.18, 0.54]) {
    box(group, capstone, [0.17, 0.15, 0.3], [x, 0.885, 0]);
  }
  return group;
}
