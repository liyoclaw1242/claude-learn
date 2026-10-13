import { Link } from "react-router-dom";

const LOOP_TS = `function wfc(w: number, h: number, tiles: Tile[], rng: Rng) {
  const rules = compatible(tiles);                 // rules[a][d] = a 的 d 方向能接哪些
  const domains = Array.from({ length: w * h }, () => tiles.map((_, i) => i));

  for (;;) {
    // 1. 觀察：挑熵最小、還沒確定的格子
    const i = argminEntropy(domains, tiles, rng);
    if (i < 0) return domains;                     // 全部確定：完成

    // 2. 塌縮：依權重抽一種
    domains[i] = [weightedPick(domains[i], tiles, rng)];

    // 3. 傳播：鄰居刪掉接不上的候選，擴散到不再變動
    const queue = [i];
    while (queue.length) {
      const c = queue.shift()!;
      for (const [d, n] of neighbors(c)) {
        const ok = new Set(domains[c].flatMap((t) => rules[t][d]));
        const next = domains[n].filter((t) => ok.has(t));
        if (next.length === 0) return null;        // 矛盾
        if (next.length < domains[n].length) { domains[n] = next; queue.push(n); }
      }
    }
  }
}`;

const RULES_TS = `// 接口相同才能相鄰：從接口自動推出所有相鄰規則
const compatible = (tiles: Tile[]) =>
  tiles.map((a) => [0, 1, 2, 3].map((d) =>
    tiles.flatMap((b, j) => (a.sockets[d] === b.sockets[(d + 2) % 4] ? [j] : []))));`;

export default function Article() {
  return (
    <article>
      <h1>06 · 波函數塌縮：用相鄰規則拼出地圖</h1>

      <p>前面幾章的演算法各自內建了「地圖應該長什麼樣子」：元胞自動機偏好圓滑的洞穴，BSP 偏好方正的房間。
        波函數塌縮（WFC）不一樣，它<b>不知道任何形狀</b>，只知道「哪些拼塊可以放在哪些拼塊旁邊」。換一套拼塊與規則，就生成完全不同風格的地圖。</p>
      <blockquote>
        每格先保留所有可能，<br />
        確定一格、刪掉鄰居不可能的選項，再挑最沒得選的那格確定下一個。<br />
        <b>生成 = 一邊做選擇、一邊做約束推理。</b>
      </blockquote>

      <h2>由來</h2>
      <p>WFC 是 Maxim Gumin 在 2016 年發表的開源專案。名字借自量子力學（疊加態、觀察、塌縮），但演算法本身和量子力學無關，
        它其實是<b>約束滿足問題</b>（constraint satisfaction problem）的經典解法：「最少剩餘值」啟發式 + 弧一致性傳播，再加上隨機性。
        之後《Bad North》《Townscaper》《Caves of Qud》等遊戲都用過它或它的變形。</p>

      <h2>兩種模式</h2>
      <table>
        <thead><tr><th></th><th>Simple tiled model</th><th>Overlapping model</th></tr></thead>
        <tbody>
          <tr><td>輸入</td><td>一組拼塊 + 相鄰規則（本章）</td><td>一張範例小圖</td></tr>
          <tr><td>規則從哪來</td><td>人工定義，或從接口推出</td><td>從範例中所有 N×N 小區塊自動學出來</td></tr>
          <tr><td>適合</td><td>拼塊式關卡、3D 模組化建築</td><td>「照這張圖的風格多畫一些」</td></tr>
        </tbody>
      </table>

      <h2>規則：接口</h2>
      <p>手寫「誰能接誰」很快就會失控：19 種拼塊、4 個方向，就有 19 × 19 × 4 = 1,444 種組合要判斷。
        常見做法是替每塊的每一邊標一個<b>接口</b>（socket），接口相同才能相鄰，規則就能自動推出：</p>
      <pre>{RULES_TS}</pre>
      <p>本章的接口有三種：空地 0、道路 1、河道 2。因為沒有「河的盡頭」這種拼塊，河一定會繞成封閉的水道；
        因為沒有十字路口，路網只會有丁字路口。<b>拼塊集合本身就是設計決策</b>，少一種拼塊，地圖的長相就跟著改變。</p>

      <h2>主迴圈</h2>
      <pre>{LOOP_TS}</pre>

      <h2>為什麼挑「最小熵」</h2>
      <p>熵衡量一格的不確定程度：候選越多、權重越平均，熵越高。挑熵最小的格子先決定，有兩個好處：</p>
      <ul>
        <li><b>降低矛盾</b>：快沒得選的格子先處理，不會被其他格子的選擇逼進死路。這和解數獨、排課表時「先處理最受限的變數」是同一個啟發式。</li>
        <li><b>生長感</b>：被確定的區域總是從已確定的格子旁邊往外長（那裡的熵最低），而不是到處亂跳。</li>
      </ul>
      <p>只看候選數也可以；用加權的 Shannon 熵，是讓「剩 3 種但其中一種權重極高」的格子被視為比較確定。</p>

      <h2>矛盾與對策</h2>
      <p>弧一致性只檢查相鄰兩格，所以 WFC <b>不保證成功</b>。規則越嚴（拼塊越少、接口越多樣），矛盾越頻繁。本章的拼塊集合在 12 × 9 的地圖上，大約每 6–7 次會失敗 1 次。</p>
      <table>
        <thead><tr><th>對策</th><th>做法</th><th>代價</th></tr></thead>
        <tbody>
          <tr><td>重來</td><td>整張丟掉、換種子</td><td>最簡單；地圖大時浪費很多</td></tr>
          <tr><td>回溯</td><td>記錄每次塌縮前的狀態，矛盾時退回、排除剛才的選擇</td><td>需要存狀態；最壞情況是指數時間</td></tr>
          <tr><td>局部重置</td><td>只清掉矛盾周圍一塊再重跑（modifying in blocks）</td><td>實作較複雜，但大地圖很實用</td></tr>
          <tr><td>改拼塊</td><td>補上「萬用」或過渡拼塊，讓任何組合都有解</td><td>從源頭減少矛盾；可能削弱風格</td></tr>
        </tbody>
      </table>

      <h2>和其他演算法搭配</h2>
      <ul>
        <li><b>預先放置</b>：先把某些格子塌縮成指定的拼塊（入口、出口、Boss 房），再讓 WFC 填滿其餘部分。傳播會自動讓周圍配合。</li>
        <li><b>大尺度 + 小尺度</b>：WFC 只看鄰居，缺乏大尺度結構。常見做法是先用噪聲或 BSP 決定區域（城區、郊區、水域），再在每個區域裡用不同權重跑 WFC。</li>
        <li><b>全域約束</b>：「整張圖必須連通」這種條件 WFC 無法直接表達，要在完成後用 flood fill 檢查，不合格就重來（第 02 章的做法）。</li>
      </ul>

      <h2>小結</h2>
      <ul>
        <li>每格維護候選集合；觀察 = 挑最小熵的格子依權重塌縮。</li>
        <li>傳播 = 弧一致性：刪掉鄰居接不上的候選，擴散到穩定。</li>
        <li>不保證成功：重來、回溯、局部重置，或改拼塊。</li>
        <li>拼塊與接口就是設計語言：換一套拼塊，就換一種世界。</li>
      </ul>
      <p>上一章：<Link to="/map/05-euler">05 · 圖與歐拉回路</Link>　·　下一章：<Link to="/map/07-pipeline">07 · 總成：一張完整的地圖</Link></p>
    </article>
  );
}
