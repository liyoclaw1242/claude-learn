import type { BaseStep } from "../../components/ChapterStage";
import type { Grid } from "../lib/grid";
import {
  FILL, LENS_A, LENS_B, SEED, W, cave, caveRegions, changes, countAt, denseCave, denseRegions, final, inPlace, inPlaceDiff, rounds, start,
} from "./model";

export type Step = BaseStep & {
  grid: Grid;
  round: number | null;
  /** 3×3 放大鏡停在哪一格 */
  lens?: number;
  /** 這一步亮起的格子 */
  lit?: number[];
  /** 紅框的格子 */
  red?: number[];
  /** 換步驟時依掃描順序逐格變化 */
  sweep?: boolean;
  /** 面板與讀數用的標籤 */
  tag: string;
};

const xy = (i: number) => `(${i % W}, ${Math.floor(i / W)})`;
const near = (i: number) => {
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = (i % W) + dx;
    const y = Math.floor(i / W) + dy;
    if (x >= 0 && y >= 0 && x < W && y < rounds[0].h && start.cells[y * W + x]) out.push(y * W + x);
  }
  return out;
};
const nA = countAt(start, LENS_A);
const nB = countAt(start, LENS_B);
const largest = caveRegions.list.reduce((a, r) => (r.length > a.length ? r : a));
const pockets = caveRegions.list.filter((r) => r !== largest);
const pocketCells = pockets.flat();

export const steps: Step[] = [
  {
    title: "起點：45% 的白噪聲",
    grid: start,
    round: 0,
    sweep: true,
    tag: "初始",
    desc: (
      <>
        <p>從第 01 章的白噪聲出發：種子 <b>{SEED}</b>，每格以 {FILL * 100}% 的機率成為牆。</p>
        <p>元胞自動機（cellular automaton）的想法是：<b>不要一次決定答案，而是讓每一格反覆參考鄰居、修正自己</b>。雜訊會在幾輪之內「凝固」成洞穴。</p>
        <p>這和康威的生命遊戲是同一類東西，只是規則換成了適合長洞穴的版本。</p>
      </>
    ),
  },
  {
    title: "規則：數 3×3 裡有幾道牆",
    grid: start,
    round: 0,
    lens: LENS_A,
    lit: near(LENS_A),
    tag: `放大鏡 ${xy(LENS_A)}`,
    desc: (
      <>
        <p>放大鏡停在 <code>{xy(LENS_A)}</code>，這格目前是<b>地板</b>。數它周圍 3×3（含自己）的牆：亮起的 <b>{nA}</b> 格。</p>
        <p>規則只有一句：<b>3×3 內的牆數 ≥ 5 就變成牆，否則變成地板。</b></p>
        <p>{nA} ≥ 5，所以下一輪這格會變成牆。被牆包圍的零星地板會被「填平」。</p>
      </>
    ),
  },
  {
    title: "同一條規則，反方向",
    grid: start,
    round: 0,
    lens: LENS_B,
    lit: near(LENS_B),
    tag: `放大鏡 ${xy(LENS_B)}`,
    desc: (
      <>
        <p>放大鏡移到 <code>{xy(LENS_B)}</code>，這格目前是<b>牆</b>，3×3 內只有 <b>{nB}</b> 道牆（含自己）。</p>
        <p>{nB} &lt; 5，下一輪變成地板。孤零零的牆柱會被「侵蝕」掉。</p>
        <p>這條規則常被稱為 <b>4-5 規則</b>：原本是牆、8 鄰有 ≥ 4 道牆就保留；原本是地板、8 鄰有 ≥ 5 道牆就變牆。把自己算進去，兩句合成一句「≥ 5」。</p>
        <p>地圖外一律當作牆，所以邊緣的格子容易變成牆，洞穴會自然收邊。</p>
      </>
    ),
  },
  {
    title: "第 1 輪：所有格子同時更新",
    grid: rounds[1],
    round: 1,
    lit: changes[0],
    sweep: true,
    tag: "第 1 輪",
    desc: (
      <>
        <p>每一格都套用同一條規則。亮起的是這一輪改變的格子，共 <b>{changes[0].length}</b> 格，超過全圖的三分之一。</p>
        <p>關鍵是<b>同步更新</b>：每格都讀「上一輪」的狀態，結果寫進一張新表。圖上的變化依掃描順序一格一格發生，但每一格讀到的都是同一份舊資料。</p>
        <p>雜訊已經開始結塊：牆連成牆、空地連成空地。</p>
      </>
    ),
  },
  {
    title: "第 2 輪：邊界變平滑",
    grid: rounds[2],
    round: 2,
    lit: changes[1],
    sweep: true,
    tag: "第 2 輪",
    desc: (
      <>
        <p>改變的格子降到 <b>{changes[1].length}</b> 格，而且幾乎都在牆與地板的交界上。</p>
        <p>這是元胞自動機的特性：每輪都只修正「和周圍不一致」的格子，所以很快就收斂。</p>
      </>
    ),
  },
  {
    title: "第 3、4 輪：幾乎靜止",
    grid: rounds[4],
    round: 4,
    lit: changes[3],
    sweep: true,
    tag: "第 4 輪",
    desc: (
      <>
        <p>第 3 輪改了 {changes[2].length} 格，第 4 輪只改 <b>{changes[3].length}</b> 格。再跑下去，形狀也只會在邊緣微調。</p>
        <p>實務上通常跑 4–5 輪就停。輪數太多，洞穴會越來越圓、越來越平淡。</p>
      </>
    ),
  },
  {
    title: "陷阱：原地更新",
    grid: inPlace,
    round: 4,
    red: inPlaceDiff,
    sweep: true,
    tag: "原地更新 × 4",
    desc: (
      <>
        <p>如果偷懶，直接在同一張表上邊讀邊寫，結果會是這樣。紅框的 <b>{inPlaceDiff.length}</b> 格和正確答案不同。</p>
        <p>原因：從左上往右下掃描時，一格讀到的左鄰、上鄰已經是「這一輪改過」的值。牆會沿著掃描方向一路傳染，形狀明顯偏向一側，牆也多出 {inPlace.cells.filter((v) => v).length - cave.cells.filter((v) => v).length} 格。</p>
        <p>修正很簡單：用兩張表輪流讀寫（double buffering）。</p>
      </>
    ),
  },
  {
    title: "調密度：52% 的牆",
    grid: denseCave,
    round: 4,
    sweep: true,
    tag: "牆密度 52%",
    desc: (
      <>
        <p>同一顆種子、同樣跑 4 輪，只把初始牆密度從 45% 提高到 52%：空地斷成 <b>{denseRegions.length}</b> 塊彼此不通的小洞。</p>
        <p>初始密度是這個演算法最敏感的參數。約 40% 以下會變成一大片空地加幾根柱子，約 50% 以上開始碎裂成互不相連的小洞。</p>
        <p>不管參數怎麼調，元胞自動機都<b>不保證連通</b>。下一步處理這件事。</p>
      </>
    ),
  },
  {
    title: "連通區域：flood fill",
    grid: cave,
    round: 4,
    red: pocketCells,
    sweep: true,
    tag: `${caveRegions.list.length} 個區域`,
    desc: (
      <>
        <p>回到 45% 的洞穴。從任一塊地板出發，往 4 鄰擴散、標記所有走得到的格子，這就是 <b>flood fill</b>。重複到每塊地板都被標記，就得到所有連通區域。</p>
        <p>這張圖有 <b>{caveRegions.list.length}</b> 個區域：最大的有 {largest.length} 格，紅框的 {pockets.map((r) => r.length).join("、")} 格是玩家走不進去的口袋。</p>
      </>
    ),
  },
  {
    title: "填平口袋，洞穴完成",
    grid: final.grid,
    round: 4,
    lit: pocketCells,
    sweep: true,
    tag: "完成",
    desc: (
      <>
        <p>最簡單的處理：只保留最大區域，其他口袋全部填成牆（亮起的格子）。現在任兩塊地板之間都走得到。</p>
        <p>另一種做法是挖隧道，把口袋接到主洞穴上，保留更多空間。如果最大區域太小（例如不到全圖 40%），也可以直接換種子重來。</p>
        <p>整條流程：<b>白噪聲 → 4 輪 4-5 規則 → flood fill → 保留最大區域</b>，不到 50 行程式。</p>
      </>
    ),
  },
];
