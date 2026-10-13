import type { BaseStep } from "../../components/ChapterStage";
import type { Snapshot } from "../lib/wfc";
import { H, SEED_A, SEED_B, TILES, W, beforePropagate, collapsedCount, runA, runB } from "./model";

export type Step = BaseStep & {
  snap: Snapshot;
  /** 疊加態是否顯示（第 1 步只看拼塊與規則） */
  stacks: boolean;
  /** 拼塊架上亮起的拼塊 */
  litTiles?: number[];
  /** 這一步重點：塌縮的格子要亮、波紋要依序縮 */
  focus?: "collapse" | "ripple" | "pick";
  seed: number;
  tag: string;
  code: string;
};

const A = runA.history;
const B = runB.history;
const first = A[1].collapsed!;
const firstTile = A[1].domains[first][0];
const second = A[2].collapsed!;
const fail = A[A.length - 1];
const N = W * H;
const xy = (i: number) => `(${i % W}, ${Math.floor(i / W)})`;
const empty: Snapshot = { domains: Array.from({ length: N }, () => TILES.map((_, i) => i)), ripple: [] };
const mid = Math.floor(B.length * 0.5);
const quick = 24;

export const steps: Step[] = [
  {
    title: "拼塊與相鄰規則",
    snap: empty,
    stacks: false,
    litTiles: TILES.map((_, i) => i),
    seed: SEED_A,
    tag: `${TILES.length} 種拼塊`,
    code: `type Tile = { sockets: [上, 右, 下, 左]; weight: number };
// 0 空地、1 道路、2 河道
// 相鄰兩格接觸的那一邊必須相同`,
    desc: (
      <>
        <p>波函數塌縮（Wave Function Collapse, WFC）換一個角度生成地圖：不是決定「每格的值」，而是<b>挑拼塊來拼</b>，而且拼塊之間有規則。</p>
        <p>右側拼塊架上有 {TILES.length} 種拼塊：空地、道路（直、彎、丁字）、河道（直、彎）、橋。每塊的四邊各有一種<b>接口</b>：空地、道路或河道。</p>
        <p>規則只有一條：<b>相鄰兩格接觸的那一邊，接口必須相同</b>。路接路、河接河，路不會突然斷掉，河也不會突然變成路。</p>
      </>
    ),
  },
  {
    title: "疊加態：每格都是「全部可能」",
    snap: A[0],
    stacks: true,
    seed: SEED_A,
    tag: "疊加態",
    code: `domains[i] = [0, 1, …, ${TILES.length - 1}];   // 全部候選
// 邊界：界外是空地，邊緣格不能有通往界外的接口`,
    desc: (
      <>
        <p>一開始還沒決定任何東西，每格都可能是任何一種拼塊。每格上的那疊薄片，就是它<b>剩下的候選</b>：一片一種，越高代表越不確定。</p>
        <p>這就是名字的由來，借用量子力學的比喻：每格處在所有可能的<b>疊加態</b>，等著被「觀察」而塌縮成一種。</p>
        <p>邊緣的格子已經矮了一截：界外視為空地，所以朝外的那一邊只能是空地接口。</p>
      </>
    ),
  },
  {
    title: "觀察：挑一格、塌縮成一種",
    snap: beforePropagate(A, 1),
    stacks: true,
    litTiles: [firstTile],
    focus: "collapse",
    seed: SEED_A,
    tag: `塌縮 ${xy(first)}`,
    code: `const pick = pickWeighted(rng,
  domains[i].map(t => tiles[t].weight));
domains[i] = [domains[i][pick]];`,
    desc: (
      <>
        <p>挑一格，從它的候選裡<b>依權重</b>抽一種拼塊，這叫<b>塌縮</b>（collapse）。<code>{xy(first)}</code> 抽到了「{TILES[firstTile].name}」（拼塊架上亮起的那塊）。</p>
        <p>權重決定地圖的風格：空地權重 5、丁字路 0.35，所以大部分是空地，路口很少。想要更密的路網，就調高道路的權重。</p>
      </>
    ),
  },
  {
    title: "傳播：鄰居的候選跟著變少",
    snap: A[1],
    stacks: true,
    focus: "ripple",
    seed: SEED_A,
    tag: `傳播 ${A[1].ripple.length} 格`,
    code: `while (queue.length) {
  const i = queue.shift();
  for (const d of [上, 右, 下, 左]) {
    const allowed = union(domains[i].map(t => rules[t][d]));
    const next = domains[j].filter(t => allowed.has(t));
    if (next.length < domains[j].length) {
      domains[j] = next; queue.push(j);   // 繼續往外擴散
    }
  }
}`,
    desc: (
      <>
        <p>一格確定了，它的四鄰就不能再放「接不上」的拼塊。四鄰的候選變少之後，又會限制<b>它們</b>的鄰居……像漣漪一樣擴散出去，直到沒有任何候選再減少。</p>
        <p>這一步有 <b>{A[1].ripple.length}</b> 格的候選被刪減（依序變矮的薄片）。這個過程叫<b>約束傳播</b>（constraint propagation），是 WFC 的核心，本質上就是約束滿足問題裡的弧一致性（arc consistency）檢查。</p>
      </>
    ),
  },
  {
    title: "最小熵：先決定最沒得選的那格",
    snap: A[2],
    stacks: true,
    focus: "pick",
    seed: SEED_A,
    tag: `塌縮 ${xy(second)}`,
    code: `// 加權 Shannon 熵：候選越少、權重越懸殊，熵越低
const H = Math.log(Σw) - Σ(w·log w) / Σw;
best = argmin(H)   // 同分時用亂數打破平手`,
    desc: (
      <>
        <p>下一格要挑哪裡？WFC 的答案：<b>熵最小的格子</b>，也就是候選最少、最沒得選的那格。這次挑中 <code>{xy(second)}</code>。</p>
        <p>直覺跟玩數獨一樣：先填只剩一兩種可能的格子。如果先去填自由度高的格子，很容易把那些「快沒得選」的格子逼進死路。</p>
        <p>挑格 → 塌縮 → 傳播，就是整個演算法的主迴圈。</p>
      </>
    ),
  },
  {
    title: `快轉：塌縮了 ${quick} 次`,
    snap: A[quick],
    stacks: true,
    seed: SEED_A,
    tag: `已確定 ${collapsedCount(A[quick])} / ${N}`,
    code: `while (true) {
  const i = argminEntropy(domains);
  if (i < 0) break;          // 全部確定：完成
  collapse(i);
  if (!propagate(i)) fail(); // 有格子沒得選：矛盾
}`,
    desc: (
      <>
        <p>重複主迴圈 {quick} 次，已確定 {collapsedCount(A[quick])} 格。數字可能比塌縮次數多：傳播有時會把某格的候選刪到只剩一種，它不必被觀察就自動確定了。</p>
        <p>路和河從已確定的區域往外長，因為傳播保證了它們的接口一路相接。</p>
      </>
    ),
  },
  {
    title: "矛盾：有一格沒得選了",
    snap: fail,
    stacks: true,
    focus: "collapse",
    seed: SEED_A,
    tag: `矛盾 ${xy(fail.contradiction!)}`,
    code: `if (next.length === 0) return CONTRADICTION;`,
    desc: (
      <>
        <p>跑到第 {A.length - 1} 次塌縮時出事了：紅框的 <code>{xy(fail.contradiction!)}</code> 被傳播刪到<b>一個候選都不剩</b>。四周的接口組合，沒有任何一種拼塊能同時接上。</p>
        <p>這是 WFC 的本質限制：傳播只檢查<b>相鄰兩格</b>之間的一致性，看不到更大範圍的矛盾。比如河道不能有盡頭，一條河繞進死角之後，要到很晚才會發現無處可去。</p>
      </>
    ),
  },
  {
    title: "換一顆種子，重來",
    snap: B[mid],
    stacks: true,
    seed: SEED_B,
    tag: `種子 ${SEED_B} · 已確定 ${collapsedCount(B[mid])} / ${N}`,
    code: `for (let seed = s; ; seed++) {
  const r = runWfc(W, H, tiles, mulberry32(seed));
  if (r.ok) return r;   // 矛盾就換種子重跑
}`,
    desc: (
      <>
        <p>最簡單的對策：<b>整張丟掉，換下一顆種子重跑</b>。種子 {SEED_B} 跑到一半，目前一切順利。</p>
        <p>其他對策：<b>回溯</b>（回到上一次塌縮前，排除剛才的選擇再試），或是只<b>重置矛盾附近的一小塊</b>再重跑。地圖越大、規則越嚴，重來的代價越高，就越需要回溯。</p>
      </>
    ),
  },
  {
    title: "完成：每一格都只剩一種",
    snap: B[B.length - 1],
    stacks: true,
    seed: SEED_B,
    tag: `完成 · ${B.length - 1} 次塌縮`,
    code: `// 驗收：每一對相鄰的格子，接口都相同
ok = cells.every(i => neighbors(i).every(j =>
  tiles[t[i]].sockets[d] === tiles[t[j]].sockets[opp(d)]));`,
    desc: (
      <>
        <p>種子 {SEED_B} 跑完 {B.length - 1} 次塌縮，所有格子都確定了。檢查任何一對相鄰的拼塊：路都接著路，河都接著河，橋讓路跨過河。</p>
        <p>沒有任何一行程式描述「河要繞成一圈」「路要過橋」，這些結構全部從<b>局部的相鄰規則</b>裡浮現出來。和第 02 章的元胞自動機很像，只是這次規則是「能不能相鄰」，而不是「多數決」。</p>
      </>
    ),
  },
];

export { H };
