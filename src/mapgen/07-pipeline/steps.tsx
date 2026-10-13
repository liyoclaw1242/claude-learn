import type { BaseStep } from "../../components/ChapterStage";
import type { World } from "../lib/world";
import { SEED_A, SEED_B, worldA, worldB, type LayerKey } from "./model";

export type Step = BaseStep & {
  world: World;
  /** 已經疊上的圖層 */
  layers: LayerKey[];
  /** 這一步新加的圖層（亮起） */
  focus?: LayerKey;
  tag: string;
  code: string;
};

const all: LayerKey[] = ["terrain", "forest", "towns", "roads", "tour", "streets"];
const upTo = (k: number) => all.slice(0, k);
const A = worldA;
const water = Math.round((A.land.filter((v) => !v).length / A.land.length) * 100);

export const steps: Step[] = [
  {
    title: "一顆種子，六層圖層",
    world: A,
    layers: [],
    tag: `種子 ${SEED_A}`,
    code: `const world = buildWorld(${SEED_A});
// 地形 → 森林 → 據點 → 道路 → 巡迴路線 → 街道`,
    desc: (
      <>
        <p>五種演算法各有擅長的尺度與形狀，沒有一種能單獨生成一張完整的地圖。實務上的做法是<b>管線</b>（pipeline）：一層一層疊，每一層讀取前面幾層的結果。</p>
        <p>這一章把前面五章的程式碼串起來，從同一顆種子 <b>{SEED_A}</b> 生成一座島：地形、森林、據點、道路、巡迴路線、城鎮街道。圖上每一層都是真的跑出來的。</p>
        <p>每一層用自己的亂數流（第 01 章的種子分流），所以改動其中一層，不會打亂其他層。</p>
      </>
    ),
  },
  {
    title: "第 1 層 · 地形：柏林噪聲",
    world: A,
    layers: upTo(1),
    focus: "terrain",
    tag: `地形 · 水 ${water}%`,
    code: `const e = fbm((x + .5) / 9, (y + .5) / 9, seed, 4);
const d = 1 - (1 - nx*nx) * (1 - ny*ny);   // 島嶼遮罩
elev[i] = e * 0.5 + (1 - d) * 0.5;`,
    desc: (
      <>
        <p>最底層是大尺度的高度場：第 03 章的 fBm（4 個八度）加上島嶼遮罩，再用門檻切出海、陸、岩山。</p>
        <p>地形是其他所有層的<b>輸入</b>：森林只長在草地上、據點不蓋在海裡和山上、街道只鋪在可建的陸地。所以它一定在最前面。</p>
      </>
    ),
  },
  {
    title: "第 2 層 · 森林：元胞自動機",
    world: A,
    layers: upTo(2),
    focus: "forest",
    tag: `森林 ${A.forest.filter(Boolean).length} 格`,
    code: `let f = grass.map(g => g && rand() < 0.55 ? 1 : 0);
for (let k = 0; k < 3; k++)
  f = caStep(f).map((v, i) => grass[i] ? v : 0);`,
    desc: (
      <>
        <p>在草地上撒 55% 的樹，跑 3 輪第 02 章的 4-5 規則。零星的樹被淘汰，樹林聚成一片一片（綠邊的格子）。</p>
        <p>重點是<b>遮罩</b>：每一輪之後把非草地的格子清空，元胞自動機只在地形層允許的範圍裡運作。上一層的輸出，變成這一層的邊界條件。</p>
      </>
    ),
  },
  {
    title: "第 3 層 · 據點：BSP 分區",
    world: A,
    layers: upTo(3),
    focus: "towns",
    tag: `${A.zones.length} 區 · ${A.towns.length} 個據點`,
    code: `split(root, rng, { minLeaf: 8, maxDepth: 3 });
for (const zone of leaves(root))
  towns.push(closestOpenLand(zone.center));`,
    desc: (
      <>
        <p>據點要<b>分布均勻</b>：不能全擠在一起，也不能留一大片空白。用第 04 章的 BSP 把地圖切成 {A.zones.length} 區（浮在上方圖層的框線），每區挑一個最靠近中心、不是海、山或森林的格子當據點。</p>
        <p>這裡 BSP 不是用來切房間，而是當作<b>均勻撒點</b>的工具。同一個演算法，換個用途。</p>
      </>
    ),
  },
  {
    title: "第 4 層 · 道路：最小生成樹 + 環",
    world: A,
    layers: upTo(4),
    focus: "roads",
    tag: `${A.roads.length} 條道路`,
    code: `// Prim：每次接上離已連通集合最近的據點
while (inTree.size < T) addShortestEdgeToTree();
// 再補 2 條最短的額外道路，造出環
roads.push(...shortestNonTreeEdges(2));`,
    desc: (
      <>
        <p>據點之間要有路，而且總長越短越好：這是<b>最小生成樹</b>（MST）。Prim 演算法從一個據點出發，每次接上離目前路網最近的據點。</p>
        <p>MST 是樹，沒有環（第 05 章）。再補 2 條最短的額外道路，讓島上有可以繞的環線。</p>
      </>
    ),
  },
  {
    title: "第 5 層 · 巡迴路線：歐拉回路",
    world: A,
    layers: upTo(5),
    focus: "tour",
    tag: `巡迴 ${A.tour.edges.length} 段 · 重走 ${A.dups.length} 段`,
    code: `const { dups } = evenOut(T, roads);     // 奇點配對、重走最短路
const tour = hierholzer(T, [...roads, ...dups], capital);`,
    desc: (
      <>
        <p>郵差要從首都出發，走遍每一條道路再回來：第 05 章的中國郵差問題。奇數度的據點兩兩配對、重走最短路（藍邊），再用 Hierholzer 串成回路。</p>
        <p>小圓塊正沿著這條路線巡迴。</p>
      </>
    ),
  },
  {
    title: "第 6 層 · 城鎮街道：波函數塌縮",
    world: A,
    layers: upTo(6),
    focus: "streets",
    tag: "首都街道 7 × 5",
    code: `runWfc(7, 5, STREET_TILES, rng,
  k => buildable(k) ? undefined : [EMPTY]);   // 海和山預先限定為空地`,
    desc: (
      <>
        <p>最細的尺度：首都周圍 7 × 5 格，用第 06 章的 WFC 鋪街道（亮起的拼塊）。</p>
        <p>兩個細節：一，不能蓋的格子（海、岩山）<b>預先塌縮</b>成空地，傳播會讓街道自動避開；二，這套街道拼塊包含全部 16 種接口組合（含十字與盡頭），所以<b>永遠不會矛盾</b>，代價是街道比較雜亂。</p>
      </>
    ),
  },
  {
    title: "換一顆種子，整個世界重生",
    world: worldB,
    layers: upTo(6),
    tag: `種子 ${SEED_B}`,
    code: `const world = buildWorld(${SEED_B});   // 只改這個數字`,
    desc: (
      <>
        <p>同一條管線，種子換成 <b>{SEED_B}</b>：海岸線、山脈、森林、據點、道路、街道全部跟著改變，而且每一層之間的關係（森林在草地上、道路連著據點、街道避開海）依然成立。</p>
        <p>這就是程序化生成的核心價值：<b>規則寫一次，世界無限多</b>。下面的筆記整理了五種演算法的選擇方法。</p>
      </>
    ),
  },
];

export { SEED_B };
