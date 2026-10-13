import { Link } from "react-router-dom";

const PERLIN_TS = `const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function gradient(ix: number, iy: number, seed: number): [number, number] {
  const a = hash2(ix, iy, seed) * Math.PI * 2;  // 第 01 章的座標雜湊
  return [Math.cos(a), Math.sin(a)];
}

function perlin(x: number, y: number, seed: number) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const corner = (ix: number, iy: number) => {
    const [gx, gy] = gradient(x0 + ix, y0 + iy, seed);
    return gx * (fx - ix) + gy * (fy - iy);      // 梯度 · 偏移向量
  };
  const u = fade(fx), v = fade(fy);
  return lerp(lerp(corner(0, 0), corner(1, 0), u),
              lerp(corner(0, 1), corner(1, 1), u), v);   // 約 −0.71 ~ 0.71
}`;

const FBM_TS = `function fbm(x: number, y: number, seed: number, octaves = 4, lacunarity = 2, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += perlin(x * freq, y * freq, seed + o * 101) * amp;  // 每層換個種子，避免原點處重疊
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm / Math.SQRT2 + 0.5;   // 攤到大約 0–1
}

// 取樣：除以晶格間距，決定「多少格一個起伏」
const e = fbm((x + 0.5) / 7, (y + 0.5) / 7, seed);`;

const DOMAIN_TS = `// Domain warping：先用一份噪聲把座標推歪，再去取樣另一份噪聲
const qx = fbm(x, y, seed + 1), qy = fbm(x + 5.2, y + 1.3, seed + 1);
const e  = fbm(x + 4 * qx, y + 4 * qy, seed);   // 地形出現扭曲、流動的紋理`;

export default function Article() {
  return (
    <article>
      <h1>03 · 柏林噪聲：連續的高度場</h1>

      <p>元胞自動機讓相鄰格「互相同化」，但它只管局部長相。這章要解決另一個問題：<b>大尺度的連續起伏</b>，也就是一整片從海岸慢慢爬到山脈的地形。</p>
      <blockquote>
        白噪聲：每格各擲各的。<br />
        柏林噪聲：只在稀疏的晶格點上擲骰子，其他地方全部用內插算出來。<br />
        <b>連續性是內插給的，隨機性是晶格給的。</b>
      </blockquote>

      <h2>從 value noise 到 gradient noise</h2>
      <table>
        <thead><tr><th></th><th>Value noise</th><th>Gradient noise（Perlin）</th></tr></thead>
        <tbody>
          <tr><td>晶格點上放</td><td>一個隨機高度</td><td>一個隨機方向的單位向量</td></tr>
          <tr><td>晶格點上的值</td><td>就是那個隨機高度</td><td>恆為 0</td></tr>
          <tr><td>山頂、谷底在哪</td><td>晶格點上</td><td>晶格點之間</td></tr>
          <tr><td>觀感</td><td>隱約看得出方格陣列</td><td>較自然，方格感弱</td></tr>
        </tbody>
      </table>
      <p>兩者都要先把內插比例 t 丟進緩和曲線。Perlin 1985 年的原版用 <code>3t² − 2t³</code>，
        2002 年的改良版換成 <code>6t⁵ − 15t⁴ + 10t³</code>，讓二階導數也連續，算法向量（打光）時不會在晶格線上出現接縫。</p>

      <h2>核心程式</h2>
      <pre>{PERLIN_TS}</pre>
      <p>原版 Perlin 噪聲不是用三角函數取梯度，而是用一張 256 項的排列表（permutation table）雜湊晶格座標，再從固定的 8–12 個方向裡挑一個。
        效果相同，速度更快。這裡用 <code>hash2</code> 加三角函數是為了好讀，也順便沿用第 01 章的座標雜湊。</p>

      <h2>八度與 fBm</h2>
      <pre>{FBM_TS}</pre>
      <ul>
        <li><b>頻率</b>（取樣時除以多少）：決定大地形的尺度。除以 7 = 每 7 格一個起伏。</li>
        <li><b>八度數</b>：疊幾層。最細一層的間距小於一格之後，再加也看不出來。</li>
        <li><b>lacunarity</b>（通常 2）：每層頻率的倍數。</li>
        <li><b>gain / persistence</b>（通常 0.5）：每層振幅的倍數。調高地形變粗糙，調低變圓潤。</li>
      </ul>

      <h2>從高度到地圖</h2>
      <ol>
        <li><b>門檻</b>：把連續值切成水、沙、草、岩。門檻比例就是陸海比例的旋鈕。</li>
        <li><b>遮罩</b>：和「中央高、四周低」的形狀混合，地圖邊緣保證是海，形成島嶼。Red Blob Games 的〈Making maps with noise functions〉整理了好幾種遮罩形狀。</li>
        <li><b>第二張噪聲</b>：另一顆種子的噪聲當作濕度，高度 × 濕度兩個維度一起查表，就能分出沙漠、雨林、凍原等生物群系。</li>
        <li><b>重新分布</b>：<code>e = e ** 1.6</code> 之類的次方，可以讓平原更平、山更尖。</li>
      </ol>

      <h2>延伸</h2>
      <ul>
        <li><b>Simplex noise</b>：Perlin 2001 年提出，改用三角形（高維是單形）晶格，高維度時更快、方向性更少。OpenSimplex2 當初是為了避開 Simplex 的專利而設計（該專利已於 2022 年到期），至今仍很常用。</li>
        <li><b>Domain warping</b>：用噪聲扭曲座標再取樣，地形會出現流動、侵蝕般的紋理：</li>
      </ul>
      <pre>{DOMAIN_TS}</pre>
      <ul>
        <li><b>無限世界</b>：因為每一點只由座標和種子決定，地圖可以分塊、以任意順序生成，區塊之間天生無縫。</li>
      </ul>

      <h2>適合與不適合</h2>
      <p>噪聲擅長<b>連續的場</b>：高度、濕度、溫度、雲、礦脈密度。它不懂「房間」「門」「必須連通」這類結構性的要求。
        要切出房間，需要下一章的 BSP；要保證某些東西彼此相接，需要第 06 章的波函數塌縮。</p>

      <h2>小結</h2>
      <ul>
        <li>只在晶格點上放隨機性，其餘內插：連續性來自內插，隨機性來自晶格。</li>
        <li>Perlin 在晶格點放梯度，起伏落在晶格之間，方格感比 value noise 弱。</li>
        <li>fBm 疊加多個八度：大起伏大、小起伏小，這才像地形。</li>
        <li>門檻、遮罩、第二張噪聲，把高度場變成地圖。</li>
      </ul>
      <p>上一章：<Link to="/map/02-cellular-automata">02 · 元胞自動機</Link>　·　下一章：<Link to="/map/04-bsp">04 · BSP 二叉樹：切出地牢房間</Link></p>
    </article>
  );
}
