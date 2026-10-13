import { Link } from "react-router-dom";

const GRID_TS = `type Grid = { w: number; h: number; cells: number[] };

const makeGrid = (w: number, h: number, fill: (x: number, y: number) => number): Grid => ({
  w, h,
  cells: Array.from({ length: w * h }, (_, i) => fill(i % w, Math.floor(i / w))),
});

// 越界時回傳 outside：很多演算法把「地圖外」當成牆，邊緣就會自然封閉
const get = (g: Grid, x: number, y: number, outside = 1) =>
  x >= 0 && y >= 0 && x < g.w && y < g.h ? g.cells[y * g.w + x] : outside;`;

const SPLIT_TS = `// 一顆主種子，衍生出各子系統自己的亂數流
const world = 42;
const terrainRand = mulberry32(world ^ 0x1f123bb5);
const lootRand    = mulberry32(world ^ 0x5bd1e995);
// 之後新增道具時只會多消耗 lootRand，地形完全不受影響`;

const HASH_TS = `// 不想依賴呼叫順序時：用座標直接算出「這格的亂數」
function hash2(x: number, y: number, seed: number) {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}`;

export default function Article() {
  return (
    <article>
      <h1>01 · 網格與種子：地圖是一張數字表</h1>

      <p>這門課會走過五種常見的程序化地圖演算法：元胞自動機、柏林噪聲、BSP、歐拉回路、波函數塌縮。
        它們的差異很大，但都站在同一個地基上：<b>一張網格、一個鄰居定義、一條可重現的亂數流</b>。這章把地基鋪好。</p>
      <blockquote>
        程序化生成不是「隨機」，而是<b>受控的隨機</b>：<br />
        隨機負責多樣性，規則負責可玩性，種子負責可重現。
      </blockquote>

      <h2>第 0 層：網格</h2>
      <p>2D 遊戲地圖最常見的表示法是方格網格（tile map）。每一格存一個數字，數字的意義由你決定：</p>
      <ul>
        <li><b>離散值</b>：<code>0</code> 地板、<code>1</code> 牆、<code>2</code> 水……適合洞穴、地牢、拼塊地圖。</li>
        <li><b>連續值</b>：0–1 的高度、濕度、溫度，最後再用門檻切成地形類型。柏林噪聲屬於這一類。</li>
      </ul>
      <p>實作上用一條一維陣列比二維陣列更方便：複製、比較、序列化都簡單，也比較快。</p>
      <pre>{GRID_TS}</pre>
      <p>座標慣例：本課程 <code>x</code> 向右、<code>y</code> 向下（和螢幕、陣列一致）。等角圖上，x 沿著前緣的刻度往右後方延伸，y 沿著左緣往前。</p>

      <h2>第 1 層：鄰居</h2>
      <table>
        <thead><tr><th></th><th>4 鄰（von Neumann）</th><th>8 鄰（Moore）</th></tr></thead>
        <tbody>
          <tr><td>包含</td><td>上下左右</td><td>上下左右 + 四個斜角</td></tr>
          <tr><td>對應距離</td><td>曼哈頓距離 = 1</td><td>切比雪夫距離 = 1</td></tr>
          <tr><td>常見用途</td><td>連通判斷、flood fill、走路</td><td>元胞自動機的計數、平滑</td></tr>
        </tbody>
      </table>
      <p>一個容易忽略的細節：如果用 4 鄰判斷連通，兩塊只在斜角相碰的地板<b>不算連在一起</b>。
        玩家角色若可以斜走，你的連通判斷就要改用 8 鄰，否則會誤刪「其實走得到」的區域；反過來也會出錯。</p>

      <h2>第 2 層：亂數與種子</h2>
      <p>JavaScript 的 <code>Math.random()</code> 不能指定種子，所以只要用它生成地圖，就無法重現。
        遊戲裡幾乎都會自帶一個 PRNG。本課程用的 <code>mulberry32</code> 只有 32 位元狀態，
        週期約 2³²，對地圖生成綽綽有餘；需要更長週期時可以換 <code>xoshiro128**</code> 或 <code>sfc32</code>。</p>
      <p>可重現性有兩個實務陷阱：</p>
      <ol>
        <li><b>呼叫順序就是結果</b>：同一條亂數流中途多抽一次，後面全部位移。解法是依子系統分流：</li>
      </ol>
      <pre>{SPLIT_TS}</pre>
      <ol start={2}>
        <li><b>無限世界不能「依序」生成</b>：玩家先往東走還是先往西走，生成順序就不同。這時改用<b>座標雜湊</b>，讓每一格的亂數只由 (x, y, seed) 決定：</li>
      </ol>
      <pre>{HASH_TS}</pre>
      <p>《Minecraft》的區塊生成就是這個思路：任何一個區塊都可以單獨、以任意順序生成，結果永遠一樣。第 03 章的柏林噪聲，也是用座標雜湊來決定晶格點上的梯度。</p>

      <h2>白噪聲為什麼不夠</h2>
      <p>每格獨立擲骰子得到的是<b>白噪聲</b>：各頻率的成分一樣多，最小尺度的變化（相鄰格的落差）和大尺度的變化一樣劇烈。
        真實地形剛好相反，大起伏多、小起伏少，相鄰格高度相近。</p>
      <p>讓相鄰格「有關係」，正是接下來每一章的主題：</p>
      <table>
        <thead><tr><th>章</th><th>演算法</th><th>怎麼讓格子彼此有關係</th><th>典型產出</th></tr></thead>
        <tbody>
          <tr><td>02</td><td>元胞自動機</td><td>反覆依鄰居數量改寫自己（局部規則）</td><td>洞穴、有機形狀</td></tr>
          <tr><td>03</td><td>柏林噪聲</td><td>在稀疏晶格上取亂數，中間平滑內插</td><td>連續地形、高度場</td></tr>
          <tr><td>04</td><td>BSP 二叉樹</td><td>由上而下遞迴切割空間</td><td>房間 + 走廊的地牢</td></tr>
          <tr><td>05</td><td>圖與歐拉回路</td><td>把地圖抽象成圖，在圖上找路線</td><td>巡邏路線、一筆畫關卡</td></tr>
          <tr><td>06</td><td>波函數塌縮</td><td>相鄰規則限制每格可放的拼塊</td><td>城鎮、拼塊式地圖</td></tr>
        </tbody>
      </table>

      <h2>小結</h2>
      <ul>
        <li>地圖 = 一維陣列 + 寬高；<code>cells[y * w + x]</code>。</li>
        <li>4 鄰管「走不走得到」，8 鄰管「周圍有多少」，選錯會讓連通判斷失準。</li>
        <li>永遠用有種子的 PRNG；子系統分流，或用座標雜湊擺脫呼叫順序。</li>
        <li>白噪聲是原料，不是成品。</li>
      </ul>
      <p>下一章：<Link to="/map/02-cellular-automata">02 · 元胞自動機：讓洞穴自己長出來</Link></p>
    </article>
  );
}
