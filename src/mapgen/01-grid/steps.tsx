import type { BaseStep } from "../../components/ChapterStage";
import type { Grid } from "../lib/grid";
import { H, W, emptyMap, handMap, jumps, seededHeights, seededWalls, unseeded } from "./model";

export type Step = BaseStep & {
  grid: Grid;
  /** walls：0/1 牆與地板；height：連續高度；neighbors：示範 8 鄰 */
  mode: "walls" | "height" | "neighbors";
  /** 種子轉盤：數字 = 種子，"random" = 沒有種子（Math.random），null = 不用亂數 */
  seed: number | "random" | null;
  /** 這一步亮起的格子 */
  lit?: number[];
  /** 紅框的格子 */
  red?: Set<number>;
  /** 跟上一步逐格比較的結果（只在 STEP 7 用） */
  same?: boolean;
};

export const FOCUS: [number, number] = [5, 3];
export const CENTER: [number, number] = [7, 5];
const idx = ([x, y]: [number, number]) => y * W + x;

const A = seededWalls(42);
const B = seededWalls(1337);
const A2 = seededWalls(42);
const HEIGHTS = seededHeights(42);
const JUMPS = jumps(HEIGHTS, 0.6);
const sameAB = A.cells.every((v, i) => v === A2.cells[i]);
const wallPct = (g: Grid) => Math.round((g.cells.filter((v) => v === 1).length / g.cells.length) * 100);

export const steps: Step[] = [
  {
    title: "地圖就是一張數字表",
    grid: emptyMap,
    mode: "walls",
    seed: null,
    lit: [idx(FOCUS)],
    desc: (
      <>
        <p>不管最後長成洞穴、島嶼還是地牢，程式裡的地圖幾乎都是同一個東西：<b>一張 {W} × {H} 的數字表</b>。圖上每一根方柱就是表裡的一格。</p>
        <p>亮起的那格是 <code>(x=5, y=3)</code>。實作上常用一條一維陣列存放，第 (x, y) 格在 <code>cells[y * W + x]</code>，也就是第 {idx(FOCUS)} 個元素。</p>
        <p>這門課的五種演算法，做的都是同一件事：<b>決定每一格該填什麼數字</b>。</p>
      </>
    ),
  },
  {
    title: "0 是地板，1 是牆",
    grid: handMap,
    mode: "walls",
    seed: null,
    desc: (
      <>
        <p>最簡單的編碼：<code>0</code> = 可以走的地板，<code>1</code> = 牆。數字是 1 的格子在圖上升高。</p>
        <p>這張是手畫的：外圈一道牆，中間一個留了門的房間。手畫的地圖品質最好，但每一張都要人來畫。</p>
        <p><b>程序化生成</b>要回答的問題就是：能不能寫一段程式，讓它自己畫出夠好的地圖，而且每次都不一樣？</p>
      </>
    ),
  },
  {
    title: "鄰居：4 鄰與 8 鄰",
    grid: emptyMap,
    mode: "neighbors",
    seed: null,
    lit: [idx(CENTER)],
    desc: (
      <>
        <p>幾乎每種演算法都會問同一個問題：<b>這格旁邊是什麼？</b></p>
        <p>上下左右四格是 <b>4 鄰</b>（圖上較高的四根）；再加上四個斜角就是 <b>8 鄰</b>（較矮的四根）。</p>
        <p>元胞自動機數 8 鄰裡有幾道牆；flood fill 判斷「走得到」只看 4 鄰（斜角穿牆不算通）。選哪一種，會直接改變生成結果的手感。</p>
      </>
    ),
  },
  {
    title: "擲骰子：白噪聲",
    grid: unseeded,
    mode: "walls",
    seed: "random",
    desc: (
      <>
        <p>最直接的程序化：每格獨立擲一次骰子，<code>Math.random() &lt; 0.45</code> 就放牆。</p>
        <p>這一步是在你打開頁面時用 <code>Math.random</code> 真的擲出來的：<b>重新整理頁面，這張圖就會變</b>。</p>
        <p>兩個問題：一是看起來像雜訊，不像任何地形；二是<b>無法重現</b>。玩家說「第 3 關卡住了」，你沒辦法再生成同一張圖來除錯。</p>
      </>
    ),
  },
  {
    title: "種子：讓隨機可以重現",
    grid: A,
    mode: "walls",
    seed: 42,
    desc: (
      <>
        <p>改用 <b>偽隨機數產生器（PRNG）</b>：給它一個整數當<b>種子</b>，它吐出一串看起來隨機、其實完全由種子決定的數字。</p>
        <p>右側面板是這門課全程使用的 <code>mulberry32</code>，十行程式。轉盤轉到 <b>42</b>，生成的就是這張圖。</p>
        <p>《Minecraft》的世界種子、Roguelike 的「每日挑戰」都是這個原理：分享一個數字，就等於分享整張地圖。</p>
      </>
    ),
  },
  {
    title: "換一顆種子，換一張圖",
    grid: B,
    mode: "walls",
    seed: 1337,
    desc: (
      <>
        <p>種子改成 <b>1337</b>：同樣的程式、同樣的牆密度 45%，得到另一張圖。</p>
        <p>種子只影響「擲出哪些點數」，不影響「怎麼用點數」。所以調參數（例如牆密度）時，固定種子才能公平比較前後差異。</p>
      </>
    ),
  },
  {
    title: "轉回 42：逐格相同",
    grid: A2,
    mode: "walls",
    seed: 42,
    same: sameAB,
    desc: (
      <>
        <p>轉盤轉回 <b>42</b>，重新跑一次生成。和 STEP 5 逐格比對：<b>{sameAB ? "192 格完全相同" : "出現差異"}</b>。</p>
        <p>這就是可重現性。實務上有個陷阱：<b>呼叫亂數的順序也是結果的一部分</b>。你在生成過程中間多擲一次骰子（例如新增一個裝飾物），後面所有格子都會跟著位移。</p>
        <p>常見做法是每個子系統各用一條由主種子衍生的 PRNG，例如 <code>mulberry32(seed ^ 0x9e37)</code> 給地形、另一條給道具，互不干擾。</p>
      </>
    ),
  },
  {
    title: "不只 0 和 1：高度值",
    grid: HEIGHTS,
    mode: "height",
    seed: 42,
    desc: (
      <>
        <p>格子裡不一定要放 0/1。直接存 PRNG 吐出的 0–1 小數，再把它當成<b>高度</b>，就得到一張高度場（heightmap）。</p>
        <p>之後的柏林噪聲、島嶼地形，存的都是這種連續值，最後才用門檻切成水、沙、草、山。</p>
      </>
    ),
  },
  {
    title: "白噪聲的問題：鄰格毫無關係",
    grid: HEIGHTS,
    mode: "height",
    seed: 42,
    red: JUMPS,
    desc: (
      <>
        <p>紅框的格子和旁邊某一格的高度差超過 0.6，等於從山頂直接跳到海底。這樣的格子共有 <b>{JUMPS.size}</b> 格。</p>
        <p>白噪聲的每一格都是獨立擲出來的，所以<b>相鄰格之間沒有任何關聯</b>。真實世界正好相反：這一步的地面，和下一步的地面通常差不多。</p>
        <p>接下來五章，就是五種讓格子「彼此有關係」的方法：</p>
        <p>
          <b>元胞自動機</b>：看鄰居、改自己<br />
          <b>柏林噪聲</b>：生成本身就連續<br />
          <b>BSP</b>：由大切到小，結構由上而下<br />
          <b>歐拉回路</b>：在地圖之上建一張圖，處理路線<br />
          <b>波函數塌縮</b>：用相鄰規則，限制每格能放什麼
        </p>
      </>
    ),
  },
];

export { A, B, HEIGHTS, wallPct };
