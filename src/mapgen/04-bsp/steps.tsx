import type { BaseStep } from "../../components/ChapterStage";
import { H, MAX_DEPTH, MIN_LEAF, MIN_ROOM, SEED, W, cuts, hallCells, halls, leafList, root, tiles } from "./model";

export type Step = BaseStep & {
  tiles: number[];
  /** 已經切到第幾層（顯示深度 < cutLevel 的隔板） */
  cutLevel: number;
  /** 隔板是否還立著 */
  fences: boolean;
  /** 亮起的隔板深度 */
  litDepth?: number;
  /** 亮起的格子 */
  lit?: Set<number>;
  /** 面板上樹要展開到第幾層、是否標出房間 */
  treeDepth: number;
  rooms: boolean;
  tag: string;
  code: string;
};

const atDepth = (d: number) => cuts.filter((c) => c.depth === d).length;
const leavesUpTo = (d: number) => {
  let n = 0;
  const walk = (node: typeof root) => {
    if (!node.kids || node.depth >= d) { n++; return; }
    walk(node.kids[0]);
    walk(node.kids[1]);
  };
  walk(root);
  return n;
};
const rock = tiles(false, null, false);
const roomTiles = tiles(true, null, false);
const roomCells = new Set(roomTiles.flatMap((v, i) => (v ? [i] : [])));
const deep = hallCells([2, 3]);
const top = hallCells([0, 1]);
const firstCut = root.split!;

export const steps: Step[] = [
  {
    title: "整塊空間就是根節點",
    tiles: rock,
    cutLevel: 0,
    fences: true,
    treeDepth: 0,
    rooms: false,
    tag: "根節點",
    code: `const root = { x: 0, y: 0, w: ${W}, h: ${H}, depth: 0 };`,
    desc: (
      <>
        <p>前兩章是「由下而上」：每格看鄰居，形狀自己浮現。BSP（Binary Space Partitioning，二元空間分割）反過來，是<b>由上而下的規劃</b>。</p>
        <p>整張 {W} × {H} 的地圖先當成一個大矩形，也就是一棵樹的<b>根節點</b>。接下來反覆把矩形切成兩半，直到每塊都小到剛好放一間房。</p>
        <p>BSP 原本是 3D 繪圖用來排序牆面的資料結構，《毀滅戰士》（Doom）的地圖就存成 BSP 樹。拿來切地牢，用的是同一個「一刀兩半、遞迴下去」的想法。</p>
      </>
    ),
  },
  {
    title: "第一刀：沿長邊切",
    tiles: rock,
    cutLevel: 1,
    fences: true,
    litDepth: 0,
    treeDepth: 1,
    rooms: false,
    tag: "第 1 層",
    code: `const dir = node.w > node.h * 1.25 ? "v"
          : node.h > node.w * 1.25 ? "h"
          : rng() < 0.5 ? "v" : "h";
const cut = randInt(rng, lo, hi + 1);  // 35%–65%`,
    desc: (
      <>
        <p>地圖寬 {W}、高 {H}，寬明顯比較長，所以下<b>直刀</b>，在 x = {firstCut.at} 的位置把它分成左右兩塊。豎起的隔板就是刀口。</p>
        <p>兩條規則讓切出來的塊不會太畸形：</p>
        <p>① <b>沿長邊切</b>：長寬比超過 1.25 就切長邊，否則隨機選方向。<br />② <b>刀口落在 35%–65%</b>：不切在正中央（太規律），也不切在邊緣（切出細長條）。</p>
      </>
    ),
  },
  {
    title: "遞迴：兩個孩子各自再切",
    tiles: rock,
    cutLevel: 2,
    fences: true,
    litDepth: 1,
    treeDepth: 2,
    rooms: false,
    tag: "第 2 層",
    code: `split(a, rng, opt);
split(b, rng, opt);`,
    desc: (
      <>
        <p>左右兩塊各自當成新的根，套用同一套規則再切一刀。這一層多了 {atDepth(1)} 道較矮的隔板（亮起），現在有 {leavesUpTo(2)} 塊。</p>
        <p>這就是<b>遞迴</b>：處理一塊的方法，就是切成兩半，然後對兩半做同樣的事。</p>
      </>
    ),
  },
  {
    title: "第 3、4 層：切到太小就停",
    tiles: rock,
    cutLevel: MAX_DEPTH,
    fences: true,
    litDepth: MAX_DEPTH - 1,
    treeDepth: MAX_DEPTH,
    rooms: false,
    tag: `${leafList.length} 片葉子`,
    code: `if (node.depth >= ${MAX_DEPTH}) return;     // 深度上限
if (lo > hi) return;  // 切了會有一邊 < ${MIN_LEAF} 格`,
    desc: (
      <>
        <p>再切兩層。兩個停止條件：深度到 {MAX_DEPTH}，或切下去會有一邊小於 {MIN_LEAF} 格。最後得到 <b>{leafList.length}</b> 片<b>葉子</b>（沒有再切的節點）。</p>
        <p>隔板越矮代表越晚切（越深）。有些塊因為太小，第 3 層就停了，所以葉子數不一定是 2⁴ = 16。</p>
        <p>右側面板是整棵樹的文字版。</p>
      </>
    ),
  },
  {
    title: "每片葉子放一間房",
    tiles: roomTiles,
    cutLevel: MAX_DEPTH,
    fences: true,
    lit: roomCells,
    treeDepth: MAX_DEPTH,
    rooms: true,
    tag: `${leafList.length} 間房`,
    code: `const w = randInt(rng, ${MIN_ROOM}, leaf.w - 2 + 1);
const h = randInt(rng, ${MIN_ROOM}, leaf.h - 2 + 1);
const x = leaf.x + 1 + randInt(rng, 0, leaf.w - 2 - w + 1);
const y = leaf.y + 1 + randInt(rng, 0, leaf.h - 2 - h + 1);`,
    desc: (
      <>
        <p>在每片葉子裡隨機放一間房：寬高至少 {MIN_ROOM} 格，四周和隔板之間至少留 1 格。</p>
        <p>因為每間房都被關在自己的葉子裡，<b>房間保證不會重疊</b>。這是 BSP 最大的好處：用「先分地、再蓋房」取代「隨機丟房間、撞到就重丟」。</p>
      </>
    ),
  },
  {
    title: "沿著樹接走廊：先接兄弟",
    tiles: tiles(true, 2, false),
    cutLevel: MAX_DEPTH,
    fences: true,
    lit: deep,
    treeDepth: MAX_DEPTH,
    rooms: true,
    tag: "接第 3、4 層",
    code: `for (const node of internals(root)) {
  const [a, b] = node.kids;
  // 左子樹挑一間、右子樹挑一間：中心最近的一對
  const [ra, rb] = closestPair(leaves(a), leaves(b));
  carveL(center(ra), center(rb));   // L 形走廊
}`,
    desc: (
      <>
        <p>每一刀都把一塊分成兩半，走廊就沿著這些刀口補回來：<b>每個內部節點接一條走廊</b>，把左半邊的某間房和右半邊的某間房連起來。</p>
        <p>先接最深的幾刀，也就是同一個父節點下的兩間房（兄弟）。亮起的是這一步挖出的 L 形走廊。</p>
      </>
    ),
  },
  {
    title: "往上接到根：全部連通",
    tiles: tiles(true, 0, false),
    cutLevel: MAX_DEPTH,
    fences: true,
    litDepth: 0,
    lit: top,
    treeDepth: MAX_DEPTH,
    rooms: true,
    tag: `${halls.length} 條走廊`,
    code: `// 樹有 ${leafList.length} 片葉子 → ${halls.length} 個內部節點 → ${halls.length} 條走廊
// n 個節點、n − 1 條邊、全部連通 = 一棵樹`,
    desc: (
      <>
        <p>再接第 1、2 層的刀口，最後是根節點那一刀（亮起的最高隔板）。共 <b>{halls.length}</b> 條走廊。</p>
        <p>為什麼保證全部連通？每接一條走廊，就把兩個已經各自連通的子樹合併成一塊。從葉子一路合併到根，最後只剩一塊。</p>
        <p>{leafList.length} 間房、{halls.length} 條走廊，剛好少一條：這是一棵<b>樹</b>，任兩間房之間只有一條路。</p>
      </>
    ),
  },
  {
    title: "撤掉隔板、砌上牆",
    tiles: tiles(true, 0, true),
    cutLevel: MAX_DEPTH,
    fences: false,
    treeDepth: MAX_DEPTH,
    rooms: true,
    tag: "完成",
    code: `// 碰到地板（8 鄰）的岩石 → 牆
if (t[i] === ROCK && touchesFloor(x, y)) t[i] = WALL;`,
    desc: (
      <>
        <p>隔板只是規劃用的，不會出現在地圖上。撤掉之後，把緊鄰地板的岩石砌成牆，地牢就完成了。</p>
        <p>BSP 地牢的長相很好辨認：<b>房間方正、分布均勻、不重疊、保證連通</b>。代價是規律感重，而且因為是樹，<b>沒有環路</b>：走進死路只能原路折返。</p>
        <p>種子 {SEED}。下一章把這座地牢抽象成一張圖，加上環路，再找一條走遍每條走廊的巡邏路線。</p>
      </>
    ),
  },
];
