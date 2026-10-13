import { Link } from "react-router-dom";

const PIPE_TS = `function buildWorld(seed: number) {
  const elev   = terrain(seed);                          // 03 柏林噪聲
  const forest = growForest(elev, mulberry32(seed ^ A)); // 02 元胞自動機（遮罩：草地）
  const towns  = placeTowns(elev, forest, mulberry32(seed ^ B)); // 04 BSP 分區
  const roads  = connect(towns);                         // 05 最小生成樹 + 環
  const tour   = postmanTour(roads, capital(towns));     // 05 歐拉回路
  const streets = wfcStreets(around(capital), mulberry32(seed ^ C)); // 06 WFC
  return validate({ elev, forest, towns, roads, tour, streets })
    ?? buildWorld(seed + 1);                             // 不合格：換種子
}`;

export default function Article() {
  return (
    <article>
      <h1>07 · 總成：一張完整的地圖</h1>

      <p>前面五章各自解決一個問題。真實的生成器很少只用一種演算法，而是把它們排成一條<b>管線</b>：
        先決定大尺度的結構，再逐層加上細節，每一層都讀取前面幾層的結果當作限制。</p>
      <blockquote>
        沒有最好的演算法，只有最適合某個尺度、某種形狀的演算法。<br />
        <b>生成器設計 = 決定每一層用什麼、以及層與層之間怎麼傳遞限制。</b>
      </blockquote>

      <h2>五種演算法對照</h2>
      <table>
        <thead><tr><th>演算法</th><th>思路</th><th>擅長</th><th>不擅長</th><th>保證</th></tr></thead>
        <tbody>
          <tr><td>元胞自動機</td><td>局部多數決，反覆迭代</td><td>洞穴、樹林、有機邊界</td><td>人造結構、大尺度起伏</td><td>無（連通要另外處理）</td></tr>
          <tr><td>柏林噪聲</td><td>晶格隨機 + 平滑內插 + 多八度</td><td>高度、濕度等連續場</td><td>房間、道路等離散結構</td><td>連續、可無限延伸</td></tr>
          <tr><td>BSP</td><td>遞迴二分空間</td><td>房間、建築、均勻分區</td><td>自然形狀；結構是樹（無環）</td><td>不重疊、全部連通</td></tr>
          <tr><td>圖 / 歐拉回路</td><td>抽象成節點與邊</td><td>路線、連通性、環的設計與驗收</td><td>不產生形狀，只處理關係</td><td>有解判定、O(E) 求解</td></tr>
          <tr><td>波函數塌縮</td><td>約束傳播 + 最小熵選擇</td><td>拼塊式地圖、局部規則嚴格的風格</td><td>大尺度結構、全域約束</td><td>相鄰規則一定成立（成功時）</td></tr>
        </tbody>
      </table>

      <h2>管線的設計原則</h2>
      <ol>
        <li><b>由大到小</b>：先地形、再區域、再據點、最後細節。大尺度的決定一旦改動，後面全部要重來；細節則可以局部重生。</li>
        <li><b>上層的輸出是下層的遮罩</b>：森林只在草地上跑元胞自動機，街道的 WFC 把海預先塌縮成空地。層與層之間靠「限制」溝通，而不是互相修改。</li>
        <li><b>種子分流</b>：每層一條自己的亂數流（第 01 章）。調整森林的參數，不會讓據點的位置跟著亂跳，設計師才能逐層調整。</li>
        <li><b>驗收 + 重來</b>：生成後檢查設計條件（陸地比例、據點數、連通性），不合格就換種子。比在生成過程中處處修補簡單得多。</li>
        <li><b>可重現</b>：同一顆種子永遠得到同一個世界，除錯、分享、做「每日挑戰」都靠它。</li>
      </ol>
      <pre>{PIPE_TS}</pre>

      <h2>選演算法的問題清單</h2>
      <ul>
        <li>要的是<b>連續的值</b>（高度、溫度）還是<b>離散的結構</b>（房間、道路）？前者用噪聲，後者看下一題。</li>
        <li>形狀是<b>有機的</b>還是<b>人造的</b>？有機用元胞自動機，人造用 BSP 或 WFC。</li>
        <li>規則是<b>由上而下的配置</b>（先分區再填）還是<b>局部的相鄰關係</b>（這塊旁邊只能是那塊）？前者 BSP，後者 WFC。</li>
        <li>問題其實是<b>連通、路線、環</b>？先把地圖抽象成圖。</li>
        <li>需要<b>保證</b>什麼？BSP 保證連通，WFC 保證相鄰規則，噪聲什麼都不保證。不保證的部分，要靠驗收補上。</li>
      </ul>

      <h2>延伸閱讀</h2>
      <ul>
        <li><b>Red Blob Games</b>（Amit Patel）：噪聲地圖、多邊形地圖、六角格與尋路的互動教學，這門課的柏林噪聲章參考了他的島嶼遮罩。</li>
        <li><b>RogueBasin</b>：Roguelike 社群的維基，元胞自動機洞穴與 BSP 地牢的經典文章都在那裡。</li>
        <li><b>mxgmn/WaveFunctionCollapse</b>：Maxim Gumin 的原始 WFC 專案，README 裡列出許多後續應用。</li>
        <li><b>《Procedural Generation in Game Design》</b>（Tanya Short、Tarn Adams 編）：從設計角度談程序化生成，包含《矮人要塞》等案例。</li>
      </ul>

      <h2>課程回顧</h2>
      <ul>
        <li><Link to="/map/01-grid">01 · 網格與種子</Link>：地圖是一張數字表；有種子的亂數才可重現。</li>
        <li><Link to="/map/02-cellular-automata">02 · 元胞自動機</Link>：3×3 多數決，雜訊凝結成洞穴。</li>
        <li><Link to="/map/03-perlin-noise">03 · 柏林噪聲</Link>：晶格梯度 + 內插 + 八度疊加，連續的高度場。</li>
        <li><Link to="/map/04-bsp">04 · BSP</Link>：一刀兩半、遞迴下去，房間不重疊、走廊保證連通。</li>
        <li><Link to="/map/05-euler">05 · 圖與歐拉回路</Link>：度數奇偶決定一筆畫；Hierholzer 線性時間求解。</li>
        <li><Link to="/map/06-wfc">06 · 波函數塌縮</Link>：最小熵 + 約束傳播，用相鄰規則拼出地圖。</li>
      </ul>
    </article>
  );
}
