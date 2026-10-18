import manifest from "../assets/manifest.json";
import { type StateId } from "./atlas-data";
import { normalizeChapter, LATEST_RELEASE_CHAPTER } from "./progression";
import { ARCS, type StoryArc } from "./story-data";

export type AtlasVolume = { volume: number; file: string; chapters: readonly [number, number] };
export type AtlasCharacter = {
  id: string;
  name: string;
  thumbnail: string;
  portrait: string;
  stateId: StateId;
  debutArcId: string;
  debutChapter: number;
};

export const VOLUMES: AtlasVolume[] = manifest.volumes.map(volume => ({
  volume: volume.volume,
  file: `/assets/${volume.file.replace(/\.[^.]+$/, ".webp")}`,
  chapters: [volume.chapters[0], volume.chapters[1]],
}));

/** The pack currently ends at volume 80; later reading positions keep its cover. */
export function getCurrentVolume(value: number): AtlasVolume {
  const chapter = normalizeChapter(value);
  return VOLUMES.find(volume => chapter >= volume.chapters[0] && chapter <= volume.chapters[1])
    ?? VOLUMES[VOLUMES.length - 1];
}

/** A small shelf ending at the reader's current volume, never ahead of it. */
export function getRecentVolumes(chapter: number): AtlasVolume[] {
  const currentIndex = VOLUMES.indexOf(getCurrentVolume(chapter));
  return VOLUMES.slice(Math.max(0, currentIndex - 4), currentIndex + 1);
}

/** Prefer the largest overlap among arcs reached at the volume's first chapter. */
export function getVolumeArc(volumeOrNumber: AtlasVolume | number): StoryArc | undefined {
  const volume = typeof volumeOrNumber === "number" ? VOLUMES.find(item => item.volume === volumeOrNumber) : volumeOrNumber;
  if (!volume) return undefined;
  let result: StoryArc | undefined, largestOverlap = 0;
  for (const arc of ARCS) {
    // Cover navigation moves to this first chapter. Later arcs in the same
    // volume must not send the camera ahead of that new reading position.
    if (arc.chapterStart > volume.chapters[0]) continue;
    const overlap = Math.min(volume.chapters[1], arc.chapterEnd ?? LATEST_RELEASE_CHAPTER)
      - Math.max(volume.chapters[0], arc.chapterStart) + 1;
    if (overlap > largestOverlap) { largestOverlap = overlap; result = arc; }
  }
  return result;
}

// Affiliation is the state represented at introduction, keeping later defections
// out of the portrait. For mountain allies, Qin is the atlas grouping. Debut gates
// are arc-level when the supplied manifest has no exact chapter metadata.
// The pack's wiki links and research/arcs.md identify these narrative arcs.
const CHARACTER_INTRODUCTIONS: Record<string, [StateId, string, number?]> = {
  "Bajio": ["qin", "sei-kyou-rebellion"],
  "Ei Sei": ["qin", "sei-kyou-rebellion"],
  "Go Kei": ["wei", "keiyou-campaign"],
  "Haku Rei": ["chu", "sanyou-aftermath", 253],
  "Heki": ["qin", "sei-kyou-rebellion"],
  "Hou Ken": ["zhao", "battle-of-bayou"],
  "Ka Rin": ["chu", "coalition-invasion"],
  "Ka Ryo Ten": ["qin", "sei-kyou-rebellion"],
  "Kan Ki": ["qin", "sanyou-campaign"],
  "Kei Sha": ["zhao", "sanyou-aftermath"],
  "Ko Chou": ["zhao", "western-zhao"],
  "Kou Yoku": ["chu", "sanyou-aftermath", 253],
  "Kyou": ["qin", "battle-of-bayou", 113],
  "Kyou Kai": ["qin", "keiyou-campaign"],
  "Man'U": ["chu", "three-states"],
  "Mou Bu": ["qin", "assassination-plot"],
  "Mou Ten": ["qin", "third-faction", 183],
  "Ou Hon": ["qin", "alliance", 180],
  "Ou Ki": ["qin", "sei-kyou-rebellion"],
  "Ou Sen": ["qin", "sanyou-campaign"],
  "Ren Pa": ["wei", "sanyou-campaign", 193],
  "Ri Boku": ["zhao", "battle-of-bayou"],
  "Rin Ko": ["wei", "sanyou-campaign"],
  "Ryo Fui": ["qin", "assassination-plot"],
  "Sei Kyou": ["qin", "sei-kyou-rebellion"],
  "Shi Ka": ["zhao", "escape-from-zhao"],
  "Shin": ["qin", "sei-kyou-rebellion"],
  "Shou Hei Kun": ["qin", "assassination-plot", 96],
  "Tou": ["qin", "sei-kyou-rebellion"],
  "Yo Tan Wa": ["qin", "sei-kyou-rebellion"],
};

export const CHARACTERS: AtlasCharacter[] = manifest.characters.map(character => {
  const [stateId, debutArcId, exactChapter] = CHARACTER_INTRODUCTIONS[character.name];
  const arc = ARCS.find(candidate => candidate.id === debutArcId)!;
  const base = character.file.replace(/\.[^.]+$/, "");
  return {
    id: base.split("/").at(-1)!, name: character.name,
    thumbnail: `/assets/${base}-thumb.webp`, portrait: `/assets/${base}-portrait.webp`,
    stateId, debutArcId, debutChapter: exactChapter ?? arc.chapterStart,
  };
});

function normalizedName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getCharacterByName(name: string): AtlasCharacter | undefined {
  return CHARACTERS.find(character => normalizedName(character.name) === normalizedName(name));
}

export function getRevealedCharacters(value: number): AtlasCharacter[] {
  const chapter = normalizeChapter(value);
  return CHARACTERS.filter(character => character.debutChapter <= chapter);
}
