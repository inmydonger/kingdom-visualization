import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CHARACTERS, VOLUMES, getCharacterByName, getCurrentVolume, getRecentVolumes, getRevealedCharacters, getVolumeArc } from "../lib/media-data";
import { ARCS } from "../lib/story-data";
import { STATES } from "../lib/atlas-data";

assert.equal(VOLUMES.length, 80);
assert.equal(CHARACTERS.length, 30);
assert.equal(new Set(CHARACTERS.map(character => character.id)).size, 30);
assert.equal(getCurrentVolume(845).volume, 77);
assert.equal(getCurrentVolume(1).volume, 1);
assert.equal(getCurrentVolume(878).volume, 80);
assert.equal(getCurrentVolume(890).volume, 80);
assert.deepEqual(getRecentVolumes(845).map(volume => volume.volume), [73, 74, 75, 76, 77]);
assert.deepEqual(getRecentVolumes(1).map(volume => volume.volume), [1]);
assert.deepEqual(getRecentVolumes(890).map(volume => volume.volume), [76, 77, 78, 79, 80]);
for (const volume of VOLUMES) {
  const shelf = getRecentVolumes(volume.chapters[0]);
  assert(shelf.length <= 5);
  assert.equal(shelf.at(-1)?.volume, volume.volume);
  assert(shelf.every(book => book.chapters[0] <= volume.chapters[0]), 'Recent volumes never reveal a future cover');
}
assert.equal(getVolumeArc(60)?.id, "zhao-crisis");
assert.equal(getVolumeArc(77)?.id, "conquest-of-han");
assert.equal(getVolumeArc(78)?.id, "great-qin-zhao-war");
assert.equal(VOLUMES.filter(volume => volume.chapters[0] > 845).length, 3);
assert.equal(getCharacterByName("Man U")?.name, "Man'U");
assert.equal(getRevealedCharacters(845).length, 30);
assert(!getRevealedCharacters(100).some(character => character.id === "ri-boku"));
assert(!getRevealedCharacters(252).some(character => character.id === "haku-rei"));
assert(getRevealedCharacters(253).some(character => character.id === "haku-rei"));

for (const [index, volume] of VOLUMES.entries()) {
  assert.equal(volume.volume, index + 1);
  assert.equal(volume.chapters.length, 2);
  assert(volume.chapters[0] <= volume.chapters[1]);
  const arc = getVolumeArc(volume);
  assert(arc, `Volume ${volume.volume} has a target arc`);
  assert(arc.chapterStart <= volume.chapters[0], `Volume ${volume.volume} must not fly to an unreached arc`);
  if (index > 0) assert.equal(volume.chapters[0], VOLUMES[index - 1].chapters[1] + 1);
}
for (const character of CHARACTERS) {
  assert(STATES.some(state => state.id === character.stateId), character.id);
  const arc = ARCS.find(item => item.id === character.debutArcId);
  assert(arc, character.id);
  assert(character.debutChapter >= arc.chapterStart && character.debutChapter <= (arc.chapterEnd ?? 890), character.id);
}

async function checkGeneratedFiles() {
  const generated = JSON.parse(await readFile(path.join(process.cwd(), "public/assets/manifest.json"), "utf8"));
  assert.equal(generated.volumes.length, 80);
  assert.equal(generated.characters.length, 30);
  let totalBytes = 0;
  for (const file of [...VOLUMES.map(volume => volume.file), ...CHARACTERS.flatMap(character => [character.thumbnail, character.portrait])]) {
    const fullPath = path.join(process.cwd(), "public", file);
    totalBytes += (await stat(fullPath)).size;
    const metadata = await sharp(fullPath).metadata();
    assert.equal(metadata.format, "webp");
    const maximum = file.includes("-thumb") ? 96 : file.includes("-portrait") ? 420 : 200;
    assert((metadata.width ?? Infinity) <= maximum, file);
  }
  console.log(`Media checks passed: 80 contiguous volumes, 30 characters, 140 WebP images (${(totalBytes / 1024 / 1024).toFixed(2)} MB).`);
}
checkGeneratedFiles().catch(error => { console.error(error); process.exitCode = 1; });
