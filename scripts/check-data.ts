import assert from "node:assert/strict";
import { STATES, HANGU_PASS, pointInPolygon } from "../lib/atlas-data";

assert.equal(STATES.length, 7);
assert.equal(new Set(STATES.map(s => s.id)).size, 7);
assert.equal(new Set(STATES.map(s => s.color)).size, 7);
for (const state of STATES) {
  assert(pointInPolygon(state.capital.position, state.territory), `${state.name}'s capital must be inside its territory`);
  assert(pointInPolygon(state.label, state.territory), `${state.name}'s label must be inside its territory`);
  assert(state.territory.every(p => p.every(Number.isFinite)), `${state.name} has invalid coordinates`);
}
const qin = STATES.find(s => s.id === "qin")!;
const wei = STATES.find(s => s.id === "wei")!;
assert(pointInPolygon(HANGU_PASS, qin.territory) && pointInPolygon(HANGU_PASS, wei.territory));
for (let y = 0.17; y < 72; y += 0.63) {
  for (let x = 0.13; x < 100; x += 0.61) {
    const owners = STATES.filter(s => pointInPolygon([x, y], s.territory));
    const onBorder=(polygon:readonly (readonly [number,number])[])=>polygon.some((a,i)=>{
      const b=polygon[(i+1)%polygon.length],cross=(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
      return Math.abs(cross)<1e-7&&x>=Math.min(a[0],b[0])-1e-7&&x<=Math.max(a[0],b[0])+1e-7&&y>=Math.min(a[1],b[1])-1e-7&&y<=Math.max(a[1],b[1])+1e-7;
    });
    assert(owners.length <= 1 || owners.every(s=>onBorder(s.territory)), `Territories overlap at ${x},${y}: ${owners.map(s => s.name)}`);
  }
}
console.log("Seven states validated: distinct colors, contained capitals and labels, shared Hangu border, and no sampled territorial overlaps.");
