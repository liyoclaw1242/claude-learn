import { Link } from "react-router-dom";

const FULL_TS = `function cave(w: number, h: number, seed: number, fill = 0.45, rounds = 4) {
  const rand = mulberry32(seed);
  let g = makeGrid(w, h, () => (rand() < fill ? 1 : 0));

  for (let k = 0; k < rounds; k++) {
    const next = g.cells.map((_, i) => (wallsAround(g, i % w, (i / w) | 0) >= 5 ? 1 : 0));
    g = { ...g, cells: next };               // 同步更新：整張換掉
  }

  const { list } = regions(g, 0);            // flood fill 找出所有地板區塊
  const largest = list.reduce((a, r) => (r.length > a.length ? r : a), []);
  if (largest.length < w * h * 0.4) return cave(w, h, seed + 1, fill, rounds); // 太小就換種子
  const keep = new Set(largest);
  return { ...g, cells: g.cells.map((v, i) => (v === 0 && !keep.has(i) ? 1 : v)) };
}`;

const TWO_PHASE_TS = `// 兩段式：前幾輪用較強的規則消掉大片空地，後幾輪用 4-5 規則平滑
for (let k = 0; k < 4; k++)
  g = step(g, (n, n2) => n >= 5 || n2 <= 2);   // n2 = 5×5 範圍內的牆數
for (let k = 0; k < 3; k++)
  g = step(g, (n) => n >= 5);`;

export default function Article() {
  return (
    <article>
      <h1>02 · 元胞自動機：讓洞穴自己長出來</h1>

      <p>上一章的白噪聲缺少「相鄰格之間的關係」。元胞自動機用最直接的方式補上：<b>讓每一格看看鄰居，然後跟著大家走</b>。
        重複幾次，雜訊就會自己凝結成有機的洞穴形狀。</p>
      <blockquote>
        局部規則、全域結構：<br />
        沒有任何一行程式描述「洞穴長什麼樣子」，形狀是從每格只看 3×3 的規則裡浮現出來的。
      </blockquote>

      <h2>元胞自動機是什麼</h2>
      <p>一個元胞自動機由三樣東西組成：</p>
      <ol>
        <li><b>網格</b>：每格有一個狀態，這裡只有牆（1）和地板（0）。</li>
        <li><b>鄰域</b>：每格參考哪些格子。洞穴生成通常用 3×3（8 鄰 + 自己）。</li>
        <li><b>規則</b>：依鄰域的狀態決定下一輪的自己。所有格子<b>同時</b>套用。</li>
      </ol>
      <p>康威的生命遊戲也是元胞自動機，規則寫作 <code>B3/S23</code>：死格有 3 個活鄰居就誕生（Birth），活格有 2 或 3 個活鄰居就存活（Survive）。
        把「牆」看成「活」，洞穴的 4-5 規則就是 <code>B5678/S45678</code>：地板有 ≥ 5 道牆鄰居就長成牆，牆有 ≥ 4 道牆鄰居就保留。</p>

      <h2>為什麼這條規則會長出洞穴</h2>
      <p>「3×3 內 ≥ 5 道牆就變牆」其實就是<b>多數決</b>：9 格裡過半是牆，自己就變牆。多數決會做兩件事：</p>
      <ul>
        <li><b>消除少數派</b>：被牆包圍的孤立地板被填平，空地中央的孤立牆柱被侵蝕。</li>
        <li><b>保留大塊</b>：一大片牆或一大片空地內部，鄰居和自己一致，不會改變。</li>
      </ul>
      <p>所以只有交界處會變動，而且每輪都會變得更平滑。這也是為什麼它收斂得很快：圖上第 1 輪改了 200 多格，第 4 輪只剩 10 格左右。</p>

      <h2>三個實作細節</h2>
      <table>
        <thead><tr><th>細節</th><th>做錯會怎樣</th><th>做法</th></tr></thead>
        <tbody>
          <tr><td>同步更新</td><td>形狀沿掃描方向偏斜、牆變多（圖上 STEP 7）</td><td>讀舊表、寫新表，每輪交換</td></tr>
          <tr><td>界外怎麼算</td><td>當地板：洞穴開口直通邊界、地圖沒有外牆</td><td>界外一律當牆，或初始化時強制外圈為牆</td></tr>
          <tr><td>連通性</td><td>玩家出生在走不出去的口袋裡</td><td>flood fill 標記區域，保留最大區或挖隧道相連</td></tr>
        </tbody>
      </table>

      <h2>完整程式</h2>
      <pre>{FULL_TS}</pre>
      <p>最後的「太小就換種子」很常見：程序化生成不一定每次都成功，與其寫複雜的修補邏輯，不如設一個驗收條件，不合格就換下一顆種子。
        只要換種子的方式是確定的（<code>seed + 1</code>），結果依然可重現。</p>

      <h2>調參與變體</h2>
      <ul>
        <li><b>初始密度</b>：最敏感的參數。約 40% 以下空曠，約 50% 以上破碎，45% 左右是常見起點。</li>
        <li><b>輪數</b>：3–5 輪。越多越圓滑，也越單調。</li>
        <li><b>兩段式規則</b>：前幾輪多看一圈 5×5，空地太大時強制長牆，避免出現大廳；後幾輪再用 4-5 規則平滑（RogueBasin 上的經典做法）：</li>
      </ul>
      <pre>{TWO_PHASE_TS}</pre>
      <ul>
        <li><b>多種狀態</b>：狀態不限 0/1。例如水、草、沙各自擴散，就能做出生物群系的邊界。</li>
      </ul>

      <h2>適合與不適合</h2>
      <p>元胞自動機擅長<b>有機、不規則</b>的形狀：洞穴、礦坑、樹林、腐蝕的廢墟。
        它不擅長<b>人造結構</b>：方正的房間、筆直的走廊、對稱的建築。這些需要由上而下的規劃，也就是第 04 章的 BSP。</p>
      <p>它也只處理「局部長相」，不處理「大尺度起伏」。想要一整片從海岸慢慢爬升到山脈的地形，需要下一章的柏林噪聲。</p>

      <h2>小結</h2>
      <ul>
        <li>4-5 規則 = 3×3 多數決；少數派被消除，交界被平滑。</li>
        <li>一定要同步更新；界外當牆。</li>
        <li>元胞自動機不保證連通：flood fill 之後保留最大區、挖隧道，或換種子。</li>
      </ul>
      <p>上一章：<Link to="/map/01-grid">01 · 網格與種子</Link>　·　下一章：<Link to="/map/03-perlin-noise">03 · 柏林噪聲：連續的高度場</Link></p>
    </article>
  );
}
