import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { LandmarkKind } from "./story-data";

/** Small, static map models. Every resource belongs to the returned group. */
export function createStoryMiniature(kind: LandmarkKind, tier: "major" | "standard", color: string): THREE.Group {
  const group = new THREE.Group();
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const accent = new THREE.Color(color).lerp(new THREE.Color("#776b50"), 0.36);
  const palette = { stone: "#998e71", pale: "#c1b394", dark: "#52564b", wood: "#72543b", timber: "#443c2e", roof: "#4b554b", bronze: "#ad8c4d", earth: "#79775a", paper: "#cbbd93", ink: "#554e3d", grain: "#b2a36c", accent };
  type Paint = keyof typeof palette;

  function material(paint: Paint) {
    let result = materials.get(paint);
    if (!result) {
      result = new THREE.MeshStandardMaterial({ color: palette[paint], roughness: paint === "bronze" ? 0.65 : 0.94, metalness: paint === "bronze" ? 0.35 : 0.02, side: THREE.DoubleSide });
      materials.set(paint, result);
    }
    return result;
  }
  function geometry(key: string, make: () => THREE.BufferGeometry) {
    let result = geometries.get(key);
    if (!result) { result = make(); geometries.set(key, result); }
    return result;
  }
  function mesh(shape: THREE.BufferGeometry, paint: Paint, x = 0, y = 0, z = 0) {
    const result = new THREE.Mesh(shape, material(paint));
    result.position.set(x, y, z);
    result.castShadow = true;
    result.receiveShadow = true;
    group.add(result);
    return result;
  }
  function box(paint: Paint, w: number, h: number, d: number, x = 0, y = h / 2, z = 0) {
    const result = mesh(geometry("box", () => new THREE.BoxGeometry(1, 1, 1)), paint, x, y, z);
    result.scale.set(w, h, d);
    return result;
  }
  function cylinder(paint: Paint, top: number, bottom: number, height: number, x = 0, y = height / 2, z = 0, segments = 16) {
    return mesh(geometry(`cylinder:${top}:${bottom}:${height}:${segments}`, () => new THREE.CylinderGeometry(top, bottom, height, segments)), paint, x, y, z);
  }
  function orb(paint: Paint, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    const result = mesh(geometry("orb", () => new THREE.SphereGeometry(1, 20, 12)), paint, x, y, z);
    result.scale.set(sx, sy, sz);
    return result;
  }
  function beam(paint: Paint, from: THREE.Vector3, to: THREE.Vector3, radius: number) {
    const direction = to.clone().sub(from);
    const center = from.clone().add(to).multiplyScalar(0.5);
    const result = cylinder(paint, radius * 0.8, radius, direction.length(), center.x, center.y, center.z, 8);
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return result;
  }

  // Four rings soften the hip roof while lifting each corner of the eaves.
  function roof(w: number, d: number, x: number, y: number, z: number, h = 0.48) {
    const shape = geometry(`roof:${w}:${d}:${h}`, () => {
      const outline = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
      const positions: number[] = [], indices: number[] = [];
      const rings = [[1, 1, 0], [0.87, 0.83, 0.12], [0.57, 0.44, 0.52], [0.24, 0.025, 1]];
      rings.forEach(([sx, sz, sy], ring) => outline.forEach(([px, pz], i) => positions.push(px * w * sx / 2, h * (sy + (ring === 0 && i % 2 === 0 ? 0.16 : 0)), pz * d * sz / 2)));
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8; i++) {
        const a = ring * 8 + i, b = ring * 8 + (i + 1) % 8;
        indices.push(a, a + 8, b, b, a + 8, b + 8);
      }
      indices.push(24, 28, 26, 24, 30, 28);
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      result.setIndex(indices); result.computeVertexNormals();
      return result;
    });
    mesh(shape, "roof", x, y, z);
    box("bronze", w * 0.31, 0.045, 0.055, x, y + h + 0.015, z);
  }
  function hall(x: number, z: number, w: number, d: number, h: number, bottom = 0.1) {
    box("stone", w + 0.16, 0.12, d + 0.14, x, bottom + 0.06, z);
    box("wood", w, h, d, x, bottom + 0.12 + h / 2, z);
    for (const sx of [-1, 1]) box("timber", 0.075, h, 0.075, x + sx * w * 0.42, bottom + 0.12 + h / 2, z + d / 2 + 0.015);
    box("dark", w * 0.24, h * 0.75, 0.018, x, bottom + 0.12 + h * 0.375, z + d / 2 + 0.025);
    roof(w + 0.45, d + 0.42, x, bottom + 0.12 + h, z, h * 0.43 + 0.15);
  }
  function pennant(x: number, z: number, height = 2.4, width = 0.7, paint: Paint = "accent") {
    cylinder("timber", 0.025, 0.04, height, x, height / 2, z, 10);
    cylinder("bronze", 0.06, 0.035, 0.13, x, height + 0.065, z, 10);
    const shape = geometry(`pennant:${width}`, () => {
      const cloth = new THREE.PlaneGeometry(width, width * 0.68, 8, 3);
      const positions = cloth.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        const along = positions.getX(i) + width / 2;
        positions.setZ(i, Math.sin(along * 8) * along * 0.12);
        positions.setY(i, positions.getY(i) - along * 0.12);
      }
      cloth.computeVertexNormals(); return cloth;
    });
    mesh(shape, paint, x + width / 2, height - width * 0.39, z);
  }
  function mound(x: number, z: number, radius: number, height: number, seed: number, paint: Paint = "stone") {
    const shape = geometry(`mound:${radius}:${height}:${seed}`, () => {
      const positions: number[] = [], indices: number[] = [], segments = 32, rings = 14;
      for (let ring = 0; ring <= rings; ring++) {
        const v = ring / rings, r = Math.pow(1 - v, 0.83), tip = Math.sin(v * Math.PI);
        for (let i = 0; i <= segments; i++) {
          const a = i / segments * Math.PI * 2;
          const ridge = 1 + 0.12 * Math.sin(a * 5 + seed) + 0.07 * Math.sin(a * 9 + v * 3);
          positions.push(Math.cos(a) * radius * r * ridge + v * 0.18, height * v + tip * 0.12 * Math.sin(a * 5 + seed), Math.sin(a) * radius * r * ridge * 0.78);
        }
      }
      for (let ring = 0; ring < rings; ring++) for (let i = 0; i < segments; i++) {
        const a = ring * (segments + 1) + i, b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      result.setIndex(indices); result.computeVertexNormals(); return result;
    });
    mesh(shape, paint, x, 0, z);
  }
  function wall(x: number, z: number, w: number, d: number, h = 0.75) {
    box("stone", w, h, d, x, h / 2, z);
    const alongX = w > d, length = Math.max(w, d), count = Math.max(2, Math.round(length / 0.4));
    for (let i = 0; i < count; i++) box("pale", alongX ? 0.19 : w, 0.16, alongX ? d : 0.19, x + (alongX ? (i / (count - 1) - 0.5) * (w - 0.18) : 0), h + 0.08, z + (alongX ? 0 : (i / (count - 1) - 0.5) * (d - 0.18)));
  }
  function gateway(w: number, height: number, depth: number) {
    const opening = w * 0.14;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0); shape.lineTo(-opening, 0); shape.lineTo(-opening, height * 0.4);
    shape.absarc(0, height * 0.4, opening, Math.PI, 0, true);
    shape.lineTo(opening, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, height); shape.lineTo(-w / 2, height); shape.closePath();
    const curtain = mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 10 }), "stone", 0, 0.025, -depth / 2);
    return curtain;
  }

  if (kind === "palace") {
    box("stone", 3.15, 0.12, 2.65);
    box("pale", 2.85, 0.06, 2.35, 0, 0.15);
    hall(0, -0.38, 1.65, 1.05, 0.85, 0.18);
    hall(-1.02, 0.5, 0.56, 0.8, 0.52, 0.18); hall(1.02, 0.5, 0.56, 0.8, 0.52, 0.18);
    hall(0, -0.38, 0.8, 0.54, 0.36, 1.44);
    box("pale", 0.85, 0.1, 0.32, 0, 0.05, 1.43);
  } else if (kind === "chariot") {
    box("wood", 1.4, 0.18, 1.35, 0, 0.65, -0.25);
    for (const x of [-0.68, 0.68]) box("wood", 0.12, 0.72, 1.3, x, 1.02, -0.25);
    box("wood", 1.3, 0.72, 0.12, 0, 1.02, -0.86);
    for (const z of [-0.72, 0.34]) {
      const axle = cylinder("bronze", 0.055, 0.055, 2.08, 0, 0.48, z); axle.rotation.z = Math.PI / 2;
      for (const x of [-0.95, 0.95]) {
        const wheel = mesh(geometry("wheel", () => new THREE.TorusGeometry(0.43, 0.065, 6, 20)), "timber", x, 0.48, z); wheel.rotation.y = Math.PI / 2;
        for (let i = 0; i < 6; i++) { const spoke = box("wood", 0.06, 0.76, 0.055, x, 0.48, z); spoke.rotation.x = i * Math.PI / 3; }
        const hub = cylinder("bronze", 0.12, 0.12, 0.16, x, 0.48, z); hub.rotation.z = Math.PI / 2;
      }
    }
    for (const x of [-0.45, 0.45]) { const shaft = box("timber", 0.08, 0.08, 1.6, x, 0.64, 1.1); shaft.rotation.x = -0.1; }
    pennant(-0.48, -0.6, 2.45, 0.56);
  } else if (kind === "siege") {
    for (const x of [-0.65, 0.65]) for (const z of [-0.75, 0.75]) box("timber", 0.13, 2.5, 0.13, x, 1.3, z);
    for (const y of [0.55, 1.45, 2.45]) box("wood", 1.65, 0.12, 1.8, 0, y);
    for (const x of [-0.7, 0.7]) { beam("wood", new THREE.Vector3(x, 0.5, -0.7), new THREE.Vector3(x, 2.4, 0.7), 0.055); box("wood", 0.08, 0.34, 1.75, x, 2.67); }
    box("wood", 1.45, 0.34, 0.08, 0, 2.67, -0.82);
    for (const x of [-0.9, 0.9]) for (const z of [-0.7, 0.7]) { const wheel = cylinder("timber", 0.26, 0.26, 0.17, x, 0.28, z); wheel.rotation.z = Math.PI / 2; }
    const ladder = new THREE.Group();
    for (const x of [-0.29, 0.29]) { const rail = box("timber", 0.065, 2.7, 0.065, x, 1.35, 0); group.remove(rail); ladder.add(rail); }
    for (let i = 0; i < 8; i++) { const rung = box("wood", 0.65, 0.055, 0.055, 0, 0.2 + i * 0.32, 0); group.remove(rung); ladder.add(rung); }
    ladder.rotation.x = -0.3; ladder.position.set(0, 0.05, 1.65); group.add(ladder);
  } else if (kind === "dragon") {
    box("stone", 2.8, 0.18, 1.65);
    box("pale", 2.55, 0.08, 1.43, 0, 0.22);
    const points = [new THREE.Vector3(-1.14, 0.35, 0.1), new THREE.Vector3(-0.75, 0.65, -0.22), new THREE.Vector3(-0.3, 0.5, 0.12), new THREE.Vector3(0.08, 1.05, 0.03), new THREE.Vector3(0.38, 1.6, 0), new THREE.Vector3(0.65, 1.9, 0.03)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 36, 0.16, 10, false), "bronze");
    orb("bronze", 0.72, 2.03, 0.02, 0.35, 0.24, 0.23); orb("bronze", 1.04, 1.99, 0.02, 0.3, 0.12, 0.16);
    for (const z of [-0.15, 0.17]) {
      beam("bronze", new THREE.Vector3(0.57, 2.17, z), new THREE.Vector3(0.35, 2.56, z * 1.5), 0.055);
      orb("dark", 0.86, 2.13, z, 0.045);
      beam("bronze", new THREE.Vector3(0.05, 1.13, z), new THREE.Vector3(-0.34, 0.85, z * 2.4), 0.065);
    }
    for (let i = 0; i < 5; i++) cylinder("bronze", 0, 0.095, 0.26, -0.75 + i * 0.25, 0.87 + i * 0.17, -0.06, 8);
  } else if (kind === "mountain") {
    mound(-0.88, 0.24, 0.86, 1.8, 1); mound(0.06, -0.2, 1.07, 3.05, 4); mound(0.98, 0.28, 0.72, 2.03, 7, "pale");
  } else if (kind === "hills") {
    mound(-0.85, 0.25, 0.93, 1.2, 2, "earth"); mound(0.03, -0.35, 1.06, 1.7, 5, "stone"); mound(0.93, 0.4, 0.8, 1.02, 8, "earth");
    for (let i = 0; i < 3; i++) cylinder("timber", 0.028, 0.045, 0.42, -0.62 + i * 0.32, 0.23, 1.03);
  } else if (kind === "granary") {
    const major = tier === "major";
    const xs = major ? [-1.6, 0, 1.6] : [-0.73, 0.73];
    for (const x of xs) for (const z of major ? [-0.95, 0.95] : [0]) {
      for (const px of [-0.42, 0.42]) for (const pz of [-0.38, 0.38]) box("timber", 0.11, 0.4, 0.11, x + px, 0.2, z + pz);
      hall(x, z, major ? 1.1 : 0.93, major ? 1.22 : 1.4, 0.72, 0.3);
      for (const sx of [-0.27, 0.27]) { const jar = cylinder("grain", 0.13, 0.2, 0.42, x + sx, 0.21, z + 0.92); cylinder("paper", 0.14, 0.13, 0.06, x + sx, 0.45, z + 0.92); jar.rotation.z = sx * 0.08; }
    }
    if (major) {
      wall(0, -2.05, 5.35, 0.22, 0.65); wall(-2.57, 0, 0.22, 4.1, 0.65); wall(2.57, 0, 0.22, 4.1, 0.65);
      for (const x of [-2.5, 2.5]) { box("stone", 0.62, 1.1, 0.64, x, 0.55, 1.88); roof(0.86, 0.86, x, 1.1, 1.88, 0.33); }
      pennant(-2.4, -1.83, 2.45, 0.6);
    } else { box("wood", 2.8, 0.08, 0.08, 0, 0.3, -0.98); pennant(-1.2, 0.65, 2.3, 0.5); }
  } else if (kind === "banner") {
    orb("stone", -0.5, 0.15, 0.02, 0.48, 0.15, 0.38); orb("pale", -0.13, 0.12, 0.26, 0.3, 0.12, 0.3);
    pennant(-0.52, 0, 3, 1.35);
    const crossbar = cylinder("bronze", 0.035, 0.035, 1.55, 0.15, 2.99, 0); crossbar.rotation.z = Math.PI / 2;
    box("bronze", 0.13, 0.48, 0.015, 0.12, 2.44, 0.04);
  } else if (kind === "battlefield") {
    for (const x of [-0.65, 0.65]) {
      beam("timber", new THREE.Vector3(-x, 0.05, -0.3), new THREE.Vector3(x, 2.35, -0.3), 0.035);
      const spear = cylinder("bronze", 0, 0.105, 0.38, x, 2.51, -0.3, 6); spear.rotation.z = x > 0 ? -0.5 : 0.5;
    }
    for (const x of [-1.1, 0, 1.1]) { const shield = cylinder("bronze", 0.3, 0.3, 0.09, x, 0.34, 0.58); shield.rotation.x = Math.PI / 2 - 0.25; orb("dark", x, 0.35, 0.64, 0.11, 0.11, 0.07); }
    pennant(-1.15, -0.65, 2.05, 0.56); pennant(0.85, -0.8, 1.85, 0.5, "paper");
    for (const x of [-0.6, 0.6]) box("timber", 0.9, 0.07, 0.07, x, 0.035, 0.06).rotation.y = x;
  } else if (kind === "scroll") {
    const paper = new THREE.PlaneGeometry(2.2, 1.72, 18, 10), positions = paper.getAttribute("position");
    for (let i = 0; i < positions.count; i++) { const x = positions.getX(i), z = positions.getY(i); positions.setXYZ(i, x, 0.32 + Math.pow(Math.abs(x) / 1.1, 4) * 0.16, z); }
    paper.computeVertexNormals(); mesh(paper, "paper");
    for (const x of [-1.21, 1.21]) { const roller = cylinder("wood", 0.17, 0.17, 2.03, x, 0.35, 0); roller.rotation.x = Math.PI / 2; for (const z of [-1.08, 1.08]) { const end = cylinder("bronze", 0.11, 0.11, 0.12, x, 0.35, z); end.rotation.x = Math.PI / 2; } }
    for (let row = 0; row < 5; row++) for (let column = 0; column < 4; column++) box("ink", 0.18 + (column % 2) * 0.06, 0.012, 0.025, -0.65 + column * 0.4, 0.337, -0.57 + row * 0.25);
    const brush = cylinder("timber", 0.026, 0.05, 2.4, 0.05, 0.53, 0.05, 10); brush.rotation.z = Math.PI / 2; brush.rotation.y = -0.35;
  } else if (kind === "castle") {
    wall(0, -1.05, 2.8, 0.2); wall(-1.3, 0, 0.2, 2.1); wall(1.3, 0, 0.2, 2.1);
    const gate = gateway(2.8, 0.75, 0.22); gate.position.z = 0.94;
    for (const x of [-1.25, 1.25]) for (const z of [-0.98, 1.02]) { box("stone", 0.55, 1.05, 0.55, x, 0.525, z); roof(0.77, 0.77, x, 1.05, z, 0.3); }
    hall(0, -0.12, 0.95, 0.75, 0.85, 0.05); pennant(0.72, -0.65, 2.4, 0.48);
  } else if (kind === "pass") {
    gateway(3.75, 1.25, 0.46);
    for (const x of [-1.6, 1.6]) { box("stone", 0.85, 1.65, 0.88, x, 0.825); box("pale", 0.91, 0.1, 0.94, x, 1.7); hall(x, 0, 0.66, 0.68, 0.46, 1.68); }
    for (let i = 0; i < 5; i++) box("pale", 0.22, 0.19, 0.48, -0.84 + i * 0.42, 1.37);
    mound(-2.12, -0.25, 0.66, 1.55, 3); mound(2.16, -0.23, 0.66, 1.8, 6);
    pennant(-1.6, -0.1, 3.2, 0.62);
    if (tier === "standard") group.scale.setScalar(0.6);
  } else if (kind === "streets") {
    for (let i = 0; i < 8; i++) box(i % 2 ? "stone" : "pale", 0.63, 0.045, 0.32, (i % 2) * 0.08, 0.0225, -1.24 + i * 0.35);
    for (const x of [-1, 1]) for (const z of [-0.69, 0.77]) hall(x, z, 0.69, 0.72, x < 0 ? 0.7 : 0.54, 0);
    box("wood", 0.52, 0.45, 0.5, 0.78, 0.225, -0.02); roof(0.82, 0.78, 0.78, 0.45, -0.02, 0.24);
    pennant(-1.34, -1.1, 1.9, 0.42);
  }

  // Static parts share a draw call by paint, including the larger city granary.
  const scale = group.scale.x;
  group.scale.setScalar(1);
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const originals = new Set<THREE.BufferGeometry>();
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const shape = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    shape.deleteAttribute("uv");
    shape.applyMatrix4(object.matrixWorld);
    const paint = object.material as THREE.Material;
    if (!batches.has(paint)) batches.set(paint, []);
    batches.get(paint)!.push(shape);
    originals.add(object.geometry);
  });
  group.clear();
  for (const [paint, shapes] of batches) {
    const combined = mergeGeometries(shapes);
    for (const shape of shapes) shape.dispose();
    if (!combined) throw new Error("Miniature geometry could not be combined");
    const result = new THREE.Mesh(combined, paint);
    result.castShadow = true;
    result.receiveShadow = true;
    group.add(result);
  }
  for (const shape of originals) shape.dispose();
  const ground = new THREE.Box3().setFromObject(group).min.y;
  for (const part of group.children) part.position.y -= ground;
  group.scale.setScalar(scale);
  return group;
}
