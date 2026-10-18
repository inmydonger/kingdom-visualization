export type Point = readonly [number, number];

export type StateId = "qin" | "zhao" | "wei" | "han" | "chu" | "yan" | "qi";

export type AtlasState = {
  id: StateId;
  name: string;
  hanzi: string;
  color: string;
  territory: Point[];
  label: Point;
  capital: { name: string; alternate: string; position: Point };
  region: string;
  description: string;
};

// Shared borders repeat the same vertices; coordinates run east and south.
export const STATES: AtlasState[] = [
  {
    id: "qin",
    name: "Qin",
    hanzi: "秦",
    color: "#557b68",
    territory: [
      [9, 17], [16, 15], [20, 12], [28, 13], [35, 11],
      [34, 16], [36, 20], [35, 24], [39, 28], [42, 31],
      [43, 34], [42, 36], [40, 39], [41, 43],
      [37, 44], [35, 48], [30, 49], [28, 53], [23, 54], [20, 57],
      [12, 56], [10, 50], [6, 47], [7, 39], [5, 34], [7, 28], [6, 23],
    ],
    label: [21, 32],
    capital: { name: "Xianyang", alternate: "Kanyou", position: [31, 33] },
    region: "Shaanxi · Gansu · Sichuan basin",
    description:
      "Western highlands descend into the fertile Wei River valley and the Sichuan basin. Xianyang anchors the Qin heartland, with mountain passes guarding its eastern approaches.",
  },
  {
    id: "zhao",
    name: "Zhao",
    hanzi: "趙",
    color: "#985c58",
    territory: [
      [35, 11], [41, 7], [48, 8], [52, 11], [57, 9],
      [59, 14], [57, 18], [61, 20], [65, 25], [65, 28], [62, 32],
      [57, 33], [52, 32], [48, 34], [42, 31],
      [39, 28], [35, 24], [36, 20], [34, 16],
    ],
    label: [48, 22],
    capital: { name: "Kantan", alternate: "Handan", position: [56, 28] },
    region: "Shanxi · Hebei · northern Henan",
    description:
      "Mountain corridors in the west open onto the northern plains. Kantan, known today as Handan, sits near the southern edge of this broad northern state.",
  },
  {
    id: "wei",
    name: "Wei",
    hanzi: "魏",
    color: "#9d795d",
    territory: [
      [42, 31], [48, 34], [52, 32], [57, 33], [62, 32],
      [64, 36], [63, 39], [65, 43],
      [61, 44], [57, 42], [54, 44], [49, 43],
      [50, 40], [49, 37], [46, 35], [42, 36], [43, 34],
    ],
    label: [56, 36.5],
    capital: { name: "Daliang", alternate: "Kaifeng", position: [58, 40] },
    region: "Central Henan · southern Shanxi",
    description:
      "Wei occupies the central plains east of Han, along important river routes and overland crossings. Its capital Daliang lies near modern Kaifeng.",
  },
  {
    id: "han",
    name: "Han",
    hanzi: "韓",
    color: "#b49b56",
    territory: [
      [42, 36], [46, 35], [49, 37], [50, 40], [49, 43],
      [47, 42], [44, 44], [41, 43], [40, 39],
    ],
    label: [45, 37.4],
    capital: { name: "Shintei", alternate: "Xinzheng", position: [45, 41] },
    region: "Central Henan · Xinzheng corridor",
    description:
      "The smallest of the seven states holds a compact corridor between larger neighbors. Shintei, modern Xinzheng, stands among the central plains of Henan.",
  },
  {
    id: "chu",
    name: "Chu",
    hanzi: "楚",
    color: "#567c8b",
    territory: [
      [20, 57], [23, 54], [28, 53], [30, 49], [35, 48], [37, 44], [41, 43],
      [44, 44], [47, 42], [49, 43], [54, 44], [57, 42], [61, 44], [65, 43],
      [68, 44], [72, 43], [77, 46],
      [82, 50], [84, 54], [81, 59], [77, 66], [70, 69], [63, 68],
      [58, 72], [49, 71], [44, 72], [35, 70], [29, 68], [23, 66], [20, 61],
    ],
    label: [51, 59],
    capital: { name: "Shouchun", alternate: "Shou County", position: [70, 51] },
    region: "Hubei · Hunan · Anhui · Jiangsu",
    description:
      "The largest southern territory spans the Yangtze basin, with river valleys, wooded hills, and wide lowlands. Shouchun lies in the eastern part of this extensive domain.",
  },
  {
    id: "yan",
    name: "Yan",
    hanzi: "燕",
    color: "#8b8660",
    territory: [
      [57, 9], [63, 6], [73, 5], [79, 8], [82, 6], [89, 8], [94, 13],
      [91, 19], [85, 20], [82, 25], [80, 28],
      [77, 25], [73, 26], [70, 24], [65, 25],
      [61, 20], [57, 18], [59, 14],
    ],
    label: [77, 14],
    capital: { name: "Ji", alternate: "Beijing", position: [67, 18] },
    region: "Northern Hebei · Beijing · Liaoning",
    description:
      "Yan stretches northeast from Ji toward the northern frontier and the Liaodong region. Mountain ridges separate its inland approaches from the coastal plains.",
  },
  {
    id: "qi",
    name: "Qi",
    hanzi: "齊",
    color: "#92738d",
    territory: [
      [65, 25], [70, 24], [73, 26], [77, 25], [80, 28],
      [86, 30], [91, 32], [88, 37], [83, 39], [80, 44], [77, 46],
      [72, 43], [68, 44], [65, 43], [63, 39], [64, 36], [62, 32], [65, 28],
    ],
    label: [76, 32],
    capital: { name: "Linzi", alternate: "Zibo", position: [77, 37] },
    region: "Shandong · eastern coastal plains",
    description:
      "Qi occupies the eastern plains and the Shandong peninsula. Its capital Linzi connects the agricultural interior with routes leading toward the coast.",
  },
];

export const RIVERS: { name: string; points: Point[] }[] = [
  {
    name: "Yellow River",
    points: [
      [10, 25], [14, 22], [16, 17], [20, 15], [25, 16], [28, 19],
      [28, 24], [31, 28], [34, 32], [39, 34], [43, 35], [48, 34],
      [53, 35], [57, 34], [62, 35], [66, 34], [69, 32], [74, 33],
      [78, 32], [84, 33], [88, 34],
    ],
  },
  {
    name: "Yangtze River",
    points: [
      [13, 50], [16, 53], [21, 54], [25, 56], [30, 55], [35, 57],
      [39, 55], [44, 56], [48, 54], [53, 55], [58, 54], [62, 55],
      [67, 54], [72, 55], [78, 54], [80.5, 55],
    ],
  },
];

export const HANGU_PASS: Point = [42.5, 35];

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3) return false;
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j];
    const [bx, by] = polygon[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);

    if (
      Math.abs(cross) < 1e-7 &&
      x >= Math.min(ax, bx) - 1e-7 && x <= Math.max(ax, bx) + 1e-7 &&
      y >= Math.min(ay, by) - 1e-7 && y <= Math.max(ay, by) + 1e-7
    ) return true;

    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) {
      inside = !inside;
    }
  }

  return inside;
}
