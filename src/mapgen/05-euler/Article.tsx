import { Link } from "react-router-dom";

const HIERHOLZER_TS = `function eulerCircuit(n: number, edges: Edge[], start: number) {
  const used = edges.map(() => false);
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => { adj[e.a].push(k); adj[e.b].push(k); });
  const nextUnused = (v: number) => adj[v].find((k) => !used[k]);

  const walk = (from: number) => {          // 走到卡住：偶數度的圖只會卡在起點
    const path = [from];
    for (let v = from, k = nextUnused(v); k !== undefined; k = nextUnused(v)) {
      used[k] = true;
      v = edges[k].a === v ? edges[k].b : edges[k].a;
      path.push(v);
    }
    return path;
  };

  let circuit = walk(start);
  for (let p = circuit.findIndex((v) => nextUnused(v) !== undefined); p >= 0;
       p = circuit.findIndex((v) => nextUnused(v) !== undefined)) {
    circuit.splice(p, 1, ...walk(circuit[p]));   // 小圈接進大圈
  }
  return circuit;   // 節點序列，頭尾都是 start
}`;

const STACK_TS = `// 常見的堆疊寫法：同一個演算法，不必顯式地「接圈」
function eulerStack(adj: number[][], edges: Edge[], start: number) {
  const used = edges.map(() => false), stack = [start], out: number[] = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    const k = adj[v].find((k) => !used[k]);
    if (k === undefined) out.push(stack.pop()!);      // 卡住：這個節點定案
    else { used[k] = true; stack.push(edges[k].a === v ? edges[k].b : edges[k].a); }
  }
  return out.reverse();
}`;

export default function Article() {
  return (
    <article>
      <h1>05 · 圖與歐拉回路：一筆畫走完每條走廊</h1>

      <p>前四章都在決定「每一格是什麼」。這章往上抽象一層：<b>把地圖看成一張圖</b>（graph），房間是節點、走廊是邊。
        很多關卡層級的問題，例如連不連通、有沒有環、玩家要怎麼走，換成圖來想都會變得清楚。</p>
      <blockquote>
        網格回答「這裡長什麼樣子」，圖回答「從這裡能去哪裡」。<br />
        歐拉回路回答的是：<b>能不能每條路剛好走一次，然後回家？</b>
      </blockquote>

      <h2>從地圖到圖</h2>
      <ul>
        <li><b>節點</b>：房間、路口、城鎮、存檔點。</li>
        <li><b>邊</b>：走廊、道路、傳送門。可以帶<b>權重</b>（長度、危險度）。</li>
        <li><b>度數</b>：連到節點的邊數。度數 1 的房間是死路。</li>
      </ul>
      <p>上一章的 BSP 地牢是一棵樹：V 個節點、V − 1 條邊。補上 k 條邊就多 k 個獨立的環（E − V + 1）。
        環是關卡設計的重要工具，《Unexplored》的設計者 Joris Dormans 甚至以「環」為單位來生成整座地牢（cyclic dungeon generation）。</p>

      <h2>歐拉定理</h2>
      <table>
        <thead><tr><th>奇數度節點數</th><th>結果</th></tr></thead>
        <tbody>
          <tr><td>0</td><td>有<b>歐拉回路</b>：每條邊走一次，回到起點（任何節點都可以當起點）</td></tr>
          <tr><td>2</td><td>只有<b>歐拉路徑</b>：每條邊走一次，但必須從一個奇點出發、在另一個奇點結束</td></tr>
          <tr><td>4 以上</td><td>都沒有：無論如何都得重走某些邊</td></tr>
        </tbody>
      </table>
      <p>前提是圖要連通（至少有邊的節點彼此連通）。奇數度節點的個數不可能是奇數：每條邊貢獻 2 點度數，度數總和必為偶數。</p>

      <h2>Hierholzer 演算法</h2>
      <pre>{HIERHOLZER_TS}</pre>
      <p>正確性的核心只有一句：<b>在全偶數度的圖裡，從 s 出發亂走，只會卡在 s</b>。所以每次「走到卡住」都得到一個迴圈，把迴圈接進主回路不會破壞任何東西。
        每條邊只用一次，整體是 O(E)。實務上常見的是用堆疊的等價寫法：</p>
      <pre>{STACK_TS}</pre>

      <h2>沒有歐拉回路怎麼辦：中國郵差問題</h2>
      <p>大部分真實的圖都有奇數度節點。這時問題變成：<b>走遍每條邊並回到起點，最少要多走多少</b>？這是管梅谷 1960 年提出的中國郵差問題。</p>
      <ol>
        <li>找出所有奇數度節點（一定是偶數個）。</li>
        <li>把它們兩兩配對，使「配對之間最短路的總長」最小。</li>
        <li>把每對之間的最短路複製一份，圖就變成全偶數度。</li>
        <li>跑 Hierholzer。</li>
      </ol>
      <p>第 2 步的最佳解需要<b>最小權完美匹配</b>（Edmonds 的 blossom 演算法）。本章用的是貪婪法：每次挑最近的一對。
        不保證最佳，但程式短、結果通常夠好；奇點少的時候也可以直接窮舉所有配對。</p>

      <h2>在遊戲裡的用途</h2>
      <ul>
        <li><b>巡邏、清掃路線</b>：NPC 走遍每條走廊、重複最少。</li>
        <li><b>一筆畫謎題</b>：生成的圖只要奇點是 0 或 2 個，就保證有解；要出「無解」的陷阱題，就故意留 4 個奇點。</li>
        <li><b>控制起點與終點</b>：故意留 2 個奇點，等於規定「從這裡開始、在那裡結束」的路線。</li>
        <li><b>驗收生成結果</b>：生成器產出地圖後，用度數、連通性、環數檢查是否符合設計意圖，不合格就換種子。</li>
      </ul>

      <h2>別搞混：歐拉 vs 哈密頓</h2>
      <table>
        <thead><tr><th></th><th>歐拉回路</th><th>哈密頓迴路</th></tr></thead>
        <tbody>
          <tr><td>要求</td><td>每條<b>邊</b>恰好一次</td><td>每個<b>節點</b>恰好一次</td></tr>
          <tr><td>判定</td><td>看度數奇偶，O(V + E)</td><td>NP 完全，沒有已知的快速判定法</td></tr>
          <tr><td>遊戲例子</td><td>走遍每條走廊</td><td>拜訪每間房（例如旅行推銷員）</td></tr>
        </tbody>
      </table>

      <h2>小結</h2>
      <ul>
        <li>地圖 → 圖：房間是節點、走廊是邊；樹沒有環，補邊造環。</li>
        <li>歐拉回路存在 ⇔ 連通且全部偶數度；恰好兩個奇點則只有歐拉路徑。</li>
        <li>Hierholzer：走到卡住得一圈，從圈上再繞、接進去，O(E)。</li>
        <li>有奇點時：奇點配對、複製最短路（中國郵差問題），再跑 Hierholzer。</li>
      </ul>
      <p>上一章：<Link to="/map/04-bsp">04 · BSP 二叉樹</Link>　·　下一章：<Link to="/map/06-wfc">06 · 波函數塌縮：用相鄰規則拼出地圖</Link></p>
    </article>
  );
}
