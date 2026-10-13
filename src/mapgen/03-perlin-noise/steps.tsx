import type { BaseStep } from "../../components/ChapterStage";
import { S, SEED, fbm2, fbm4, island, perlin1, valueLinear, valueSmooth, white } from "./model";

export type Step = BaseStep & {
  /** 每格 0–1 的高度 */
  heights: number[];
  /** 晶格點上要顯示什麼：數值柱、梯度箭頭，或不顯示 */
  lattice?: "values" | "gradients";
  /** 混音台上推起的八度數 */
  octaves: number;
  /** 套用門檻分層（水、沙、草、岩） */
  biomes?: boolean;
  tag: string;
  code: string;
};

const flat = white.map(() => 0);

export const steps: Step[] = [
  {
    title: "回顧：白噪聲高度場",
    heights: white,
    octaves: 0,
    tag: "白噪聲",
    code: `h[i] = hash2(x, y, seed);   // 每格獨立`,
    desc: (
      <>
        <p>第 01 章的結論：每格獨立擲骰子，相鄰格毫無關係，看起來像一把亂插的針。</p>
        <p>這章的目標是做出<b>連續</b>的高度場：走一步，地面只會變一點點；走很遠，才會從海岸爬到山頂。</p>
        <p>這一步改用<b>座標雜湊</b> <code>hash2(x, y, seed)</code> 產生每格的值，而不是依序呼叫 PRNG。這樣任何一點的值都可以單獨算出來，後面的晶格點會用到。</p>
      </>
    ),
  },
  {
    title: "只在晶格點上擲骰子",
    heights: flat,
    lattice: "values",
    octaves: 0,
    tag: `晶格 ${S} 格一點`,
    code: `// 晶格點 (ix, iy) 的值
const v = (ix, iy) => hash2(ix, iy, seed);`,
    desc: (
      <>
        <p>關鍵想法：<b>不要每格都擲骰子</b>。每隔 {S} 格放一個晶格點，只在晶格點上擲一次，就是圖上那 20 根細柱，柱高是擲出的值。</p>
        <p>晶格點之間的格子不擲骰子，改由附近四個晶格點<b>內插</b>出來。晶格越稀疏，地形的起伏就越大、越緩。</p>
        <p>這種做法叫 <b>value noise</b>（數值噪聲）。</p>
      </>
    ),
  },
  {
    title: "線性內插：連起來了，但有稜角",
    heights: valueLinear,
    lattice: "values",
    octaves: 0,
    tag: "value noise · 線性",
    code: `const tx = x - x0, ty = y - y0;
lerp(lerp(v00, v10, tx),
     lerp(v01, v11, tx), ty);`,
    desc: (
      <>
        <p>每格找出包住它的四個晶格點，先沿 x 方向內插兩次，再沿 y 方向內插一次（雙線性內插）。</p>
        <p>高度連續了，但每個晶格方塊的邊界都有<b>折角</b>：斜率在晶格線上突然改變，看得出一格一格的方塊感。</p>
      </>
    ),
  },
  {
    title: "緩和曲線：把折角磨平",
    heights: valueSmooth,
    lattice: "values",
    octaves: 0,
    tag: "value noise · fade",
    code: `const fade = t => t*t*t*(t*(t*6 - 15) + 10);
const tx = fade(x - x0), ty = fade(y - y0);`,
    desc: (
      <>
        <p>內插前先把比例 t 丟進<b>緩和曲線</b> <code>6t⁵ − 15t⁴ + 10t³</code>。它在 t = 0 與 t = 1 的斜率都是 0，所以穿過晶格線時坡度是連續的。</p>
        <p>折角消失了。但 value noise 有個去不掉的毛病：<b>山頂和谷底一定落在晶格點上</b>，大地形會隱約排成方格陣列。</p>
      </>
    ),
  },
  {
    title: "Perlin 的做法：晶格點放梯度",
    heights: flat,
    lattice: "gradients",
    octaves: 0,
    tag: "梯度向量",
    code: `// 每個晶格點一個隨機方向的單位向量
const a = hash2(ix, iy, seed) * 2 * Math.PI;
const g = [Math.cos(a), Math.sin(a)];`,
    desc: (
      <>
        <p>Ken Perlin 在 1983 年的做法：晶格點上不放「高度」，而是放一個<b>隨機方向的箭頭</b>（梯度），意思是「地面在這裡往哪個方向上坡」。</p>
        <p>計算某一格時，四個角各算一次「箭頭 · 從角指向這格的向量」（內積）。這格位在箭頭指的方向就得正值，在反方向就得負值。再用緩和曲線把四個值內插起來。</p>
        <p>這種做法叫 <b>gradient noise</b>（梯度噪聲），柏林噪聲是其中最有名的一種。</p>
      </>
    ),
  },
  {
    title: "柏林噪聲：一個八度",
    heights: perlin1,
    octaves: 1,
    tag: "Perlin × 1 八度",
    code: `const n00 = dot(g00, [fx,     fy    ]);
const n10 = dot(g10, [fx - 1, fy    ]);
const n01 = dot(g01, [fx,     fy - 1]);
const n11 = dot(g11, [fx - 1, fy - 1]);
const u = fade(fx), v = fade(fy);
return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);`,
    desc: (
      <>
        <p>結果是一片平滑起伏的丘陵。注意晶格點本身的值永遠是 0（偏移向量是零向量），<b>山和谷都長在晶格點之間</b>，方格感比 value noise 弱很多。</p>
        <p>右側混音台推起了第 1 根推桿：這就是一個「八度」（octave），只有一種尺度的起伏。看起來像一層被子，還不像地形。</p>
      </>
    ),
  },
  {
    title: "第 2 個八度：頻率 ×2、振幅 ×½",
    heights: fbm2,
    octaves: 2,
    tag: "fBm × 2 八度",
    code: `let sum = 0, amp = 1, freq = 1;
for (let o = 0; o < octaves; o++) {
  sum += perlin(x * freq, y * freq) * amp;
  amp *= 0.5;   // gain（persistence）
  freq *= 2;    // lacunarity
}`,
    desc: (
      <>
        <p>再疊一層柏林噪聲：晶格間距減半（頻率 ×2），高度減半（振幅 ×½）。大起伏還在，上面多了一層中等尺度的細節。</p>
        <p>這種疊加叫<b>分形布朗運動</b>（fractal Brownian motion, fBm）。每層的頻率倍數叫 <b>lacunarity</b>，振幅倍數叫 <b>gain</b> 或 persistence。</p>
      </>
    ),
  },
  {
    title: "4 個八度：像真的地形了",
    heights: fbm4,
    octaves: 4,
    tag: "fBm × 4 八度",
    code: `fbm(x, y, seed, 4);   // 間距 7、3.5、1.75、0.875 格`,
    desc: (
      <>
        <p>疊到 4 層，最細的一層間距已經不到一格。大尺度決定山脈和海盆，小尺度負責岩石和坡面的粗糙感。</p>
        <p>這就是真實地形的統計特性：<b>大起伏振幅大、小起伏振幅小</b>，和第 01 章白噪聲「各尺度一樣劇烈」正好相反。</p>
        <p>八度再多也沒用：比一格還細的起伏，網格根本表現不出來。</p>
      </>
    ),
  },
  {
    title: "用門檻切成地形",
    heights: fbm4,
    octaves: 4,
    biomes: true,
    tag: "門檻分層",
    code: `e < 0.38 ? "水"
: e < 0.46 ? "沙"
: e < 0.72 ? "草" : "岩"`,
    desc: (
      <>
        <p>高度場還只是數字。用幾道門檻把它切成地形類型：低於海平面的壓平成水面（藍邊），往上依序是沙灘、草地、岩山。</p>
        <p>門檻是很好調的旋鈕：海平面調高，陸地就裂成群島；調低，海就退成內陸湖。</p>
        <p>問題是，陸地碰到了地圖邊界，像是從更大的地圖上剪下來的一塊。</p>
      </>
    ),
  },
  {
    title: "島嶼遮罩：中央高、四周低",
    heights: island,
    octaves: 4,
    biomes: true,
    tag: "島嶼",
    code: `// d：中央 0、邊緣 1（square bump）
const d = 1 - (1 - nx*nx) * (1 - ny*ny);
e = (e + (1 - d)) / 2;`,
    desc: (
      <>
        <p>把噪聲和一個「中央高、四周低」的形狀平均。邊緣一定沉到海平面以下，中央保留噪聲的起伏，就成了一座島。</p>
        <p>種子 {SEED} 從頭到尾沒換過：同一份噪聲，靠疊加、門檻和遮罩，從一把亂針變成一座島。</p>
      </>
    ),
  },
];
