import { type Point, type StateId } from "./atlas-data";
import { isDiscovered, normalizeChapter } from "./progression";

export type LandmarkKind = "palace" | "chariot" | "siege" | "dragon" | "mountain" | "hills" | "granary" | "banner" | "battlefield" | "scroll" | "castle" | "pass" | "streets";

export type StoryArc = {
  id: string;
  name: string;
  chapterStart: number;
  chapterEnd: number | null;
  stateId: StateId | "multi";
  region: string;
  siteId: string;
  premise: string;
  summary: string;
  keyFigures: string[];
  territoryDelta: string;
};

export type StorySite = {
  id: string;
  name: string;
  position: Point;
  stateId: StateId | "multi";
  kind: LandmarkKind;
  tier: "major" | "standard";
  arcIds: string[];
};

// Chapter ranges follow the user's supplied 28-arc dataset. Coordinates are
// schematic atlas locations, rather than claims of precise archaeological sites.
export const ARCS: StoryArc[] = [
  {
    id: "sei-kyou-rebellion", name: "Sei Kyou’s Rebellion", chapterStart: 1, chapterEnd: 47,
    stateId: "qin", region: "Kanyou · Qin heartland", siteId: "kanyou-court",
    premise: "A succession struggle reaches the palace at Kanyou as Shin becomes involved in Ei Sei’s fight for the throne.",
    summary: "Shin joins Ei Sei’s struggle against Sei Kyou’s rebellion. Their return to Kanyou restores Sei to the throne and begins their shared ambition.",
    keyFigures: ["Shin", "Ei Sei", "Sei Kyou", "Hyou", "Yo Tan Wa"],
    territoryDelta: "Qin’s capital returns to Ei Sei’s control; the state’s outer borders remain unchanged.",
  },
  {
    id: "keiyou-campaign", name: "Keiyou Campaign", chapterStart: 48, chapterEnd: 73,
    stateId: "wei", region: "Keiyou · Dakan Plains", siteId: "keiyou",
    premise: "Shin enters his first campaign as a Qin foot soldier on the plains facing Wei.",
    summary: "Shin experiences large-scale war during Qin’s campaign against Wei on the Dakan Plains. The fighting introduces him to the demands of serving in an army.",
    keyFigures: ["Shin", "Kyou Kai", "Duke Hyou", "Go Kei"],
    territoryDelta: "Qin wins the field at Keiyou; no complete state conquest occurs.",
  },
  {
    id: "escape-from-zhao", name: "Escape from Zhao", chapterStart: 74, chapterEnd: 81,
    stateId: "zhao", region: "Kantan · Zhao capital", siteId: "kantan-streets",
    premise: "A flashback follows the young Ei Sei in Kantan and the dangerous journey toward Qin.",
    summary: "Ei Sei’s childhood in Zhao is revisited through his escape from Kantan. Shi Ka helps him make the journey out of the city toward Qin.",
    keyFigures: ["Ei Sei", "Shi Ka"],
    territoryDelta: "A personal escape from Zhao; no territory changes hands.",
  },
  {
    id: "assassination-plot", name: "Assassination Plot", chapterStart: 82, chapterEnd: 100,
    stateId: "qin", region: "Kanyou palace · Qin", siteId: "kanyou-court",
    premise: "An assassination plot threatens Ei Sei inside the Qin court.",
    summary: "Shin and his allies confront an attempt on Ei Sei’s life. The danger exposes how the struggle for power continues within Kanyou.",
    keyFigures: ["Shin", "Ei Sei", "Kyou Kai", "Ka Ryo Ten"],
    territoryDelta: "Ei Sei survives the palace threat; Qin’s borders remain unchanged.",
  },
  {
    id: "training", name: "Training", chapterStart: 101, chapterEnd: 107,
    stateId: "qin", region: "Qin heartland", siteId: "kanyou-court",
    premise: "Shin prepares for the next stage of military service in Qin.",
    summary: "Shin trains and seeks the skills he will need in the campaigns ahead. The short interval connects his first battlefield experience with his next deployment.",
    keyFigures: ["Shin", "Ou Ki"],
    territoryDelta: "A period of preparation; no territorial change is recorded.",
  },
  {
    id: "battle-of-bayou", name: "Battle of Bayou", chapterStart: 108, chapterEnd: 173,
    stateId: "zhao", region: "Bayou · Qin–Zhao approaches", siteId: "bayou",
    premise: "Qin and Zhao armies meet around Bayou, where Shin serves under Ou Ki.",
    summary: "Ou Ki leads Qin’s response to Zhao at Bayou while Shin’s unit takes part in the campaign. Zhao’s strategy forces a Qin withdrawal after a costly battle.",
    keyFigures: ["Shin", "Ou Ki", "Tou", "Hou Ken", "Ri Boku"],
    territoryDelta: "Qin withdraws from the Bayou battlefield; Zhao remains unconquered.",
  },
  {
    id: "alliance", name: "Alliance", chapterStart: 174, chapterEnd: 182,
    stateId: "qin", region: "Kanyou · Qin court", siteId: "kanyou-court",
    premise: "Diplomacy brings Qin and Zhao representatives together after Bayou.",
    summary: "Qin and Zhao negotiate an alliance in the aftermath of Bayou. The meeting shifts the immediate balance from open fighting to diplomacy.",
    keyFigures: ["Ei Sei", "Ryo Fui", "Ri Boku"],
    territoryDelta: "A diplomatic agreement changes relations between Qin and Zhao, without a border transfer.",
  },
  {
    id: "third-faction", name: "Third Faction", chapterStart: 183, chapterEnd: 188,
    stateId: "qin", region: "Kanyou · Qin court", siteId: "kanyou-court",
    premise: "A further faction emerges within Qin’s divided court.",
    summary: "The balance among Qin’s court factions changes as another political force enters the struggle. Ei Sei must navigate competing interests within his own state.",
    keyFigures: ["Ei Sei", "Ryo Fui", "Queen Mother"],
    territoryDelta: "Internal political influence shifts; Qin’s external borders do not change.",
  },
  {
    id: "sanyou-campaign", name: "Sanyou Campaign", chapterStart: 189, chapterEnd: 243,
    stateId: "wei", region: "Sanyou · Wei frontier", siteId: "sanyou",
    premise: "Qin advances on Sanyou, with the younger commanders serving in a major campaign against Wei.",
    summary: "Qin’s army fights Wei for control of Sanyou under Mou Gou’s command. The victory establishes a new Qin foothold on the central plains.",
    keyFigures: ["Shin", "Mou Gou", "Kan Ki", "Ou Sen", "Ren Pa", "Ou Hon", "Mou Ten"],
    territoryDelta: "Sanyou passes from Wei to Qin, advancing Qin’s eastern position.",
  },
  {
    id: "sanyou-aftermath", name: "Sanyou Aftermath", chapterStart: 244, chapterEnd: 256,
    stateId: "wei", region: "Sanyou · Qin–Wei border", siteId: "sanyou",
    premise: "Qin consolidates its position after the Sanyou campaign.",
    summary: "The consequences of Sanyou are felt in Qin’s army and its eastern strategy. The captured territory becomes a base for further ambitions on the central plains.",
    keyFigures: ["Shin", "Ei Sei", "Shou Hei Kun"],
    territoryDelta: "Qin consolidates the territory won at Sanyou.",
  },
  {
    id: "coalition-invasion", name: "Coalition Invasion", chapterStart: 257, chapterEnd: 356,
    stateId: "multi", region: "Kankoku / Hangu Pass · Sai · Qin", siteId: "hangu-pass",
    premise: "A coalition of states invades Qin, forcing its armies to defend Kankoku Pass and the road toward Kanyou.",
    summary: "Qin faces a coalition invasion at Kankoku Pass while another threat reaches Sai. The defense of both approaches preserves Qin’s heartland and breaks the invasion.",
    keyFigures: ["Ei Sei", "Shin", "Ri Boku", "Mou Bu", "Tou", "Duke Hyou", "Yo Tan Wa"],
    territoryDelta: "Qin retains Kankoku Pass and Sai; the coalition does not take its heartland.",
  },
  {
    id: "kyou-kai-revenge", name: "Kyou Kai’s Revenge", chapterStart: 357, chapterEnd: 365,
    stateId: "zhao", region: "Zhao mountains", siteId: "zhao-mountains",
    premise: "Kyou Kai follows her personal vendetta into the mountains of Zhao.",
    summary: "Kyou Kai confronts the Shiyuu connected to her sister’s death. Resolving the confrontation allows her to choose her path beyond revenge.",
    keyFigures: ["Kyou Kai", "Yuu Ren", "Kyou Shou"],
    territoryDelta: "A personal conflict in Zhao’s mountains; no state border changes.",
  },
  {
    id: "conspiracy-in-court", name: "Conspiracy in the Court", chapterStart: 366, chapterEnd: 378,
    stateId: "qin", region: "Tonryuu · Qin", siteId: "tonryuu",
    premise: "A crisis at Tonryuu draws Sei Kyou into a court conspiracy.",
    summary: "The unrest at Tonryuu becomes entangled with a plot against Sei Kyou. Qin suppresses the crisis, and Sei Kyou’s faction becomes part of Ei Sei’s political struggle.",
    keyFigures: ["Sei Kyou", "Rui", "Ei Sei", "Shin"],
    territoryDelta: "Tonryuu remains within Qin following the internal uprising.",
  },
  {
    id: "fire-dragons", name: "Fire Dragons of Wei", chapterStart: 379, chapterEnd: 401,
    stateId: "wei", region: "Choyou · Wei", siteId: "choyou",
    premise: "Qin’s forces challenge Wei’s defenses at Choyou and face the Fire Dragons.",
    summary: "Tou’s army contests Choyou with Wei’s defenders, including the Fire Dragons. Qin’s younger commanders help break the position through coordinated attacks.",
    keyFigures: ["Shin", "Ou Hon", "Tou", "Go Hou Mei", "Gai Mou", "Earl Shi"],
    territoryDelta: "Qin breaks Wei’s position at Choyou and strengthens its eastern route.",
  },
  {
    id: "state-of-ai", name: "State of Ai", chapterStart: 402, chapterEnd: 437,
    stateId: "qin", region: "Taigen · northern Qin · Qin–Zhao border", siteId: "ai",
    premise: "The creation of Ai at Taigen on Qin’s northern frontier threatens Qin as Ei Sei approaches his coming-of-age ceremony.",
    summary: "The State of Ai’s rebellion reaches toward Kanyou during Ei Sei’s coming of age. Its defeat settles a decisive stage of the struggle for control of Qin’s court.",
    keyFigures: ["Ei Sei", "Shin", "Ryo Fui", "Rou Ai", "Queen Mother"],
    territoryDelta: "The breakaway State of Ai is suppressed and its territory returns to Qin.",
  },
  {
    id: "koku-you", name: "Koku You Campaign", chapterStart: 438, chapterEnd: 484,
    stateId: "zhao", region: "Koku You hills · western Zhao", siteId: "koku-you",
    premise: "Kan Ki and the Hi Shin Unit enter the wooded hills of Koku You against Zhao’s defenders.",
    summary: "Qin and Zhao contest the hills of Koku You through maneuver and ambush. Kan Ki secures the area, while his methods deepen the conflict with Shin.",
    keyFigures: ["Shin", "Kan Ki", "Kyou Kai", "Kei Sha", "Ki Sui"],
    territoryDelta: "Qin gains the Koku You hills on Zhao’s western approaches.",
  },
  {
    id: "bureaucrats-job", name: "Bureaucrats Job", chapterStart: 485, chapterEnd: 495,
    stateId: "qin", region: "Kanyou · Qin administration", siteId: "kanyou-court",
    premise: "Qin’s plans for unification require work in the court as well as on the battlefield.",
    summary: "Attention turns to Qin’s officials and the administrative work supporting the state’s ambitions. Court decisions prepare the ground for the next major campaign.",
    keyFigures: ["Ei Sei", "Ri Shi", "Shou Bun Kun", "Sai Taku"],
    territoryDelta: "Administrative and diplomatic preparations; no immediate territorial conquest.",
  },
  {
    id: "western-zhao", name: "Western Zhao Invasion", chapterStart: 496, chapterEnd: 642,
    stateId: "zhao", region: "Retsubi → Gyou → Shukai Plains · Zhao", siteId: "gyou",
    premise: "Qin launches a deep invasion of western Zhao, linking Retsubi, Gyou, and the Shukai Plains in one campaign.",
    summary: "Ou Sen’s invasion places the armies around Gyou and the Shukai Plains under severe pressure over supplies and time. Qin captures Gyou, establishing a foothold deep in Zhao.",
    keyFigures: ["Shin", "Ou Sen", "Ri Boku", "Kyou Kai", "Ou Hon", "Mou Ten", "Kan Ki"],
    territoryDelta: "Gyou and its surrounding position fall to Qin, opening a route farther into Zhao.",
  },
  {
    id: "zhao-crisis", name: "Zhao Crisis", chapterStart: 643, chapterEnd: 648,
    stateId: "zhao", region: "Kantan court · Zhao", siteId: "kantan-streets",
    premise: "Political upheaval in Kantan unsettles Zhao after the western invasion.",
    summary: "Zhao’s royal court enters a succession crisis after its losses in the west. The struggle in Kantan disrupts the position of Ri Boku and his supporters.",
    keyFigures: ["Ri Boku", "Prince Ka", "Kaku Kai"],
    territoryDelta: "Power changes inside Zhao’s court; Kantan remains part of Zhao.",
  },
  {
    id: "three-states", name: "War of the Three States", chapterStart: 649, chapterEnd: 661,
    stateId: "chu", region: "Juuko · Chu", siteId: "juuko",
    premise: "Qin and Wei cooperate against Chu’s stronghold at Juuko.",
    summary: "An alliance between Qin and Wei takes the fight to Juuko’s defenders. The campaign captures the fortress and reshapes the balance along the three states’ frontier.",
    keyFigures: ["Mou Bu", "Tou", "Go Hou Mei", "Man U", "Sen To Un"],
    territoryDelta: "Juuko is taken from Chu and passes to Wei under the alliance agreement.",
  },
  {
    id: "shiyuu-conflict", name: "Shiyuu Conflict", chapterStart: 662, chapterEnd: 670,
    stateId: "multi", region: "Qin–Zhao border", siteId: "shiyuu-border",
    premise: "A new arrival connected to the Shiyuu brings a personal conflict to Kyou Kai and the Hi Shin Unit.",
    summary: "Kyou Rei’s arrival forces Kyou Kai to confront the legacy of the Shiyuu once more. Their conflict is resolved within the Hi Shin Unit rather than through a campaign for territory.",
    keyFigures: ["Kyou Kai", "Kyou Rei", "Shin"],
    territoryDelta: "No state territory changes hands during this personal conflict.",
  },
  {
    id: "eikyuu", name: "Battle of Eikyuu", chapterStart: 671, chapterEnd: 701,
    stateId: "zhao", region: "Eikyuu cliffs · Zhao", siteId: "eikyuu",
    premise: "Qin attacks Zhao’s difficult cliff defenses at Eikyuu under Kan Ki’s campaign.",
    summary: "The Hi Shin Unit assaults the cliffs at Eikyuu as Kan Ki’s army contests Zhao’s defensive line. Qin’s victory carries a severe human cost beyond the battlefield.",
    keyFigures: ["Shin", "Kan Ki", "Ou Hon", "Ko Chou"],
    territoryDelta: "Qin breaks Zhao’s Eikyuu defensive position and advances its invasion.",
  },
  {
    id: "zhao-retaliation", name: "Zhao’s Retaliation", chapterStart: 702, chapterEnd: 755,
    stateId: "zhao", region: "Gian · northern Zhao", siteId: "gian",
    premise: "Qin’s northern advance toward Gian meets Zhao’s prepared response.",
    summary: "Ri Boku turns Qin’s advance toward Gian into a trap for Kan Ki’s army. Qin’s defeat halts this northern offensive and forces the surviving units to withdraw.",
    keyFigures: ["Ri Boku", "Kan Ki", "Shin", "Mou Ten"],
    territoryDelta: "Zhao stops Qin’s Gian offensive and recovers the initiative in the north.",
  },
  {
    id: "nature-of-humanity", name: "Nature of Humanity", chapterStart: 756, chapterEnd: 768,
    stateId: "han", region: "Shintei · Han capital", siteId: "shintei",
    premise: "A mission to Han leads Qin’s representatives into a debate over law and human nature.",
    summary: "Qin’s delegation encounters Kan Pishi in Han and debates the nature of humanity. His journey to Qin draws the philosophical encounter into the politics of Kanyou.",
    keyFigures: ["Shin", "Tou", "Kan Pishi", "Ri Shi"],
    territoryDelta: "A diplomatic and philosophical encounter; Han’s borders remain unchanged.",
  },
  {
    id: "hango", name: "Hango Campaign", chapterStart: 769, chapterEnd: 799,
    stateId: "zhao", region: "Hango · northern Zhao", siteId: "hango",
    premise: "Qin launches another major offensive into northern Zhao around Hango.",
    summary: "Ou Sen’s army encounters Zhao’s prepared forces around Hango. Zhao wins the campaign and Qin’s offensive ends in retreat.",
    keyFigures: ["Ou Sen", "Ri Boku", "Shi Ba Shou", "Shin", "Yo Tan Wa"],
    territoryDelta: "Zhao retains the Hango region and repels Qin’s offensive.",
  },
  {
    id: "three-pillars", name: "Three Pillars", chapterStart: 800, chapterEnd: 812,
    stateId: "han", region: "Nanyou · Han", siteId: "nanyou",
    premise: "Qin prepares a renewed unification effort while its advance into Han reaches Nanyou.",
    summary: "Qin reorganizes the resources needed for its next conquests and advances on Nanyou. The city’s surrender provides a foothold for the campaign into Han.",
    keyFigures: ["Ei Sei", "Shou Hei Kun", "Tou", "Shin"],
    territoryDelta: "Nanyou comes under Qin’s control ahead of the attack on Han’s capital region.",
  },
  {
    id: "conquest-of-han", name: "Conquest of Han", chapterStart: 813, chapterEnd: 844,
    stateId: "han", region: "Shintei · Tousa · Han", siteId: "shintei",
    premise: "Qin’s invasion advances toward Han’s capital at Shintei through the fighting around Tousa.",
    summary: "Tou and Shin lead Qin’s campaign through Han’s remaining defenses toward Shintei. Han falls to Qin, becoming the first of the six rival states to be conquered.",
    keyFigures: ["Tou", "Shin", "Raku A Kan", "King An"],
    territoryDelta: "Han’s territory is incorporated into Qin; the map adopts Qin’s color after chapter 844.",
  },
  {
    id: "great-qin-zhao-war", name: "The Great Qin-Zhao War", chapterStart: 845, chapterEnd: null,
    stateId: "zhao", region: "Atsuyo → Kantan · Zhao", siteId: "zhao-endgame",
    premise: "Qin renews its war against Zhao along the approaches from Atsuyo toward Kantan. This arc is ongoing.",
    summary: "Qin renews its war against Zhao along the approaches from Atsuyo toward Kantan. This arc is ongoing.",
    keyFigures: [], territoryDelta: "Ongoing campaign; no outcome is recorded.",
  },
];

export const STORY_SITES: StorySite[] = [
  { id: "kanyou-court", name: "Kanyou Court", position: [29.7, 33.8], stateId: "qin", kind: "palace", tier: "standard", arcIds: ["sei-kyou-rebellion", "assassination-plot", "training", "alliance", "third-faction", "bureaucrats-job"] },
  { id: "tonryuu", name: "Tonryuu", position: [34.8, 29.8], stateId: "qin", kind: "castle", tier: "standard", arcIds: ["conspiracy-in-court"] },
  { id: "ai", name: "Taigen", position: [33, 14.5], stateId: "qin", kind: "palace", tier: "standard", arcIds: ["state-of-ai"] },
  { id: "keiyou", name: "Keiyou", position: [44, 33.5], stateId: "wei", kind: "chariot", tier: "standard", arcIds: ["keiyou-campaign"] },
  { id: "sanyou", name: "Sanyou", position: [51.5, 35], stateId: "wei", kind: "siege", tier: "standard", arcIds: ["sanyou-campaign", "sanyou-aftermath"] },
  { id: "choyou", name: "Choyou", position: [60, 37.4], stateId: "wei", kind: "dragon", tier: "standard", arcIds: ["fire-dragons"] },
  { id: "kantan-streets", name: "Kantan Streets", position: [57.2, 29], stateId: "zhao", kind: "streets", tier: "standard", arcIds: ["escape-from-zhao", "zhao-crisis"] },
  { id: "bayou", name: "Bayou", position: [36.6, 25], stateId: "zhao", kind: "mountain", tier: "standard", arcIds: ["battle-of-bayou"] },
  { id: "zhao-mountains", name: "Zhao Mountains", position: [39, 23.5], stateId: "zhao", kind: "mountain", tier: "standard", arcIds: ["kyou-kai-revenge"] },
  { id: "koku-you", name: "Koku You", position: [43.2, 27.4], stateId: "zhao", kind: "hills", tier: "standard", arcIds: ["koku-you"] },
  { id: "gyou", name: "Gyou", position: [48, 31], stateId: "zhao", kind: "granary", tier: "major", arcIds: ["western-zhao"] },
  { id: "eikyuu", name: "Eikyuu", position: [43.6, 18.7], stateId: "zhao", kind: "banner", tier: "standard", arcIds: ["eikyuu"] },
  { id: "gian", name: "Gian", position: [45.7, 12.4], stateId: "zhao", kind: "battlefield", tier: "standard", arcIds: ["zhao-retaliation"] },
  { id: "hango", name: "Hango", position: [50.5, 15.3], stateId: "zhao", kind: "battlefield", tier: "standard", arcIds: ["hango"] },
  { id: "zhao-endgame", name: "Kantan Approach", position: [49.5, 27.1], stateId: "zhao", kind: "siege", tier: "standard", arcIds: ["great-qin-zhao-war"] },
  { id: "shintei", name: "Shintei", position: [46.2, 40.7], stateId: "han", kind: "scroll", tier: "standard", arcIds: ["nature-of-humanity", "conquest-of-han"] },
  { id: "nanyou", name: "Nanyou", position: [43.5, 38.4], stateId: "han", kind: "castle", tier: "standard", arcIds: ["three-pillars"] },
  { id: "juuko", name: "Juuko", position: [50.5, 47], stateId: "chu", kind: "castle", tier: "standard", arcIds: ["three-states"] },
  { id: "hangu-pass", name: "Kankoku / Hangu Pass", position: [42.5, 35], stateId: "multi", kind: "pass", tier: "major", arcIds: ["coalition-invasion"] },
  { id: "shiyuu-border", name: "Qin–Zhao Border", position: [35.9, 20.9], stateId: "multi", kind: "banner", tier: "standard", arcIds: ["shiyuu-conflict"] },
];

/** Only return titles the reader has reached; future shared-site arcs stay absent. */
export function getSiteArcs(siteId: string, value: number): StoryArc[] {
  const chapter = normalizeChapter(value);
  return ARCS.filter(arc => arc.siteId === siteId && arc.chapterStart <= chapter);
}

export function isSiteDiscovered(siteId: string, value: number): boolean {
  const site = STORY_SITES.find(candidate => candidate.id === siteId);
  if (!site || getSiteArcs(siteId, value).length === 0) return false;
  // A known story location can be a pin within otherwise uncharted terrain.
  // The dedicated ongoing campaign remains behind the spatial endgame frontier.
  const onlyOngoing = ARCS.filter(arc => arc.siteId === siteId).every(arc => arc.chapterEnd === null);
  return !onlyOngoing || isDiscovered(site.position, value);
}

/** Completion-only details are withheld even when an arc is already selectable. */
export function getArcDetails(arc: StoryArc, value: number): {
  inProgress: boolean;
  summary: string;
  keyFigures: string[];
  territoryDelta: string;
} {
  const chapter = normalizeChapter(value);
  const inProgress = arc.chapterEnd === null || chapter < arc.chapterEnd;
  return {
    inProgress,
    summary: inProgress ? arc.premise : arc.summary,
    keyFigures: inProgress ? [] : [...arc.keyFigures],
    territoryDelta: inProgress ? "Not yet concluded at your chapter." : arc.territoryDelta,
  };
}
