import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "assets/manifest.json"), "utf8"));
const source = join(root, "assets/source");
const output = join(root, "public/assets");
await Promise.all([mkdir(join(output, "covers"), { recursive: true }), mkdir(join(output, "characters"), { recursive: true })]);

function stem(file) { return file.slice(0, -extname(file).length); }
async function encode(file, target, width, height, quality) {
  await sharp(join(source, file)).rotate().resize({ width, height, fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 5 }).toFile(join(output, target));
}

// Limit concurrency so a build never decodes all 110 source images at once.
async function prepare(items, action) {
  const result = [];
  for (let index = 0; index < items.length; index += 6) {
    result.push(...await Promise.all(items.slice(index, index + 6).map(action)));
  }
  return result;
}

const volumes = await prepare(manifest.volumes, async item => {
  const file = `${stem(item.file)}.webp`;
  await encode(item.file, file, 200, 300, 78);
  return { ...item, file };
});
const characters = await prepare(manifest.characters, async item => {
  const thumbnail = `${stem(item.file)}-thumb.webp`;
  const portrait = `${stem(item.file)}-portrait.webp`;
  await Promise.all([encode(item.file, thumbnail, 96, 120, 78), encode(item.file, portrait, 420, 560, 84)]);
  return { ...item, file: portrait, thumbnail, portrait };
});
await writeFile(join(output, "manifest.json"), `${JSON.stringify({ volumes, characters }, null, 2)}\n`);
console.log(`Prepared ${volumes.length} covers and ${characters.length} character thumbnail/portrait pairs.`);
