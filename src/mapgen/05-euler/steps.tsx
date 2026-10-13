import type { BaseStep } from "../../components/ChapterStage";
import { START, even, euler, graphEdges, loopEdges, nodes, odd, totalLength, treeEdges } from "./model";

export type Step = BaseStep & {
  /** 地牢是否還立著（false = 壓平，只看圖） */
  dungeon: boolean;
  /** 要畫哪些邊：tree / +loop / +dup */
  edges: "tree" | "loop" | "dup";
  /** 亮起的邊種類 */
  litKind?: "tree" | "loop" | "dup";
  /** 是否在節點上顯示度數 */
  degrees: boolean;
  /** 奇數度節點標紅 */
  markOdd?: boolean;
  /** Hierholzer：已完成到第幾圈（0 = 尚未開始）；"run" = 完整回路跑一遍 */
  loops: number | "run";
  tag: string;
  code: string;
};

const V = nodes.length;
const E1 = treeEdges.length;
const E2 = E1 + loopEdges.length;
const extra = totalLength(even.dups);
const base = totalLength(graphEdges);
const [l1, l2, l3] = euler.loops;
const seq = (ns: number[]) => ns.map((n) => `R${n}`).join(" → ");

export const steps: Step[] = [
  {
    title: "把地牢看成一張圖",
    dungeon: true,
    edges: "tree",
    litKind: "tree",
    degrees: false,
    loops: 0,
    tag: `${V} 個節點 · ${E1} 條邊`,
    code: `nodes = rooms.map(center);           // 房間 → 節點
edges = halls.map(h => [h.from, h.to]); // 走廊 → 邊`,
    desc: (
      <>
        <p>沿用第 04 章的地牢。在每間房的中央立一根柱子，當成<b>節點</b>；每條走廊連起兩間房，就是一條<b>邊</b>。</p>
        <p>這一步叫<b>抽象化</b>：房間多大、走廊怎麼彎都先不管，只留下「誰和誰相連」。很多關卡設計的問題，換成圖來想就變得很清楚。</p>
      </>
    ),
  },
  {
    title: "只留下圖：一棵樹",
    dungeon: false,
    edges: "tree",
    degrees: false,
    loops: 0,
    tag: `${V} 個節點 · ${E1} 條邊`,
    code: `V = ${V}, E = ${E1}
E === V - 1 && connected   // → 樹`,
    desc: (
      <>
        <p>把地牢壓平，只剩節點與邊。{V} 個節點、{E1} 條邊，而且全部連通，這正是<b>樹</b>的定義（上一章結尾說過）。</p>
        <p>樹的特性：任兩點之間只有一條路，沒有任何環。對玩家來說，就是一路走到死路、再原路折返。</p>
      </>
    ),
  },
  {
    title: "補上環路",
    dungeon: false,
    edges: "loop",
    litKind: "loop",
    degrees: false,
    loops: 0,
    tag: `${V} 個節點 · ${E2} 條邊`,
    code: `// 由近到遠挑還沒相連的房間對，
// 不和既有的邊交叉，就補一條
if (!crosses(a, b) && !connected(a, b))
  edges.push([a, b]);`,
    desc: (
      <>
        <p>在距離近、又不會和既有走廊交叉的房間之間，補上 {loopEdges.length} 條走廊（亮起）。</p>
        <p>每補一條邊，就多出一個環：獨立的環數 = E − V + 1 = {E2} − {V} + 1 = <b>{E2 - V + 1}</b>。</p>
        <p>環路讓地牢可以「繞回來」：捷徑、包抄、迷路後重新找到熟悉的地方。很多關卡設計師把環路當成首要的結構工具。</p>
      </>
    ),
  },
  {
    title: "問題：一條走遍所有走廊的巡邏路線",
    dungeon: false,
    edges: "loop",
    degrees: true,
    loops: 0,
    tag: "求歐拉回路",
    code: `// 目標：一條從 R${START} 出發、回到 R${START} 的路線
// 每條邊恰好走一次`,
    desc: (
      <>
        <p>現在要替守衛設計巡邏路線：<b>從某間房出發，每條走廊恰好走一次，最後回到出發點</b>。</p>
        <p>這種路線叫<b>歐拉回路</b>（Euler circuit）。1736 年歐拉研究「柯尼斯堡七橋問題」：能不能把城裡七座橋各走一次再回家？他證明了不可能，也順便開創了圖論。</p>
        <p>柱子上的數字是每個節點的<b>度數</b>：有幾條邊連到它。</p>
      </>
    ),
  },
  {
    title: "歐拉的判定：看度數的奇偶",
    dungeon: false,
    edges: "loop",
    degrees: true,
    markOdd: true,
    loops: 0,
    tag: `奇數度 ${odd.length} 個`,
    code: `const odd = degrees.filter(d => d % 2 === 1);
odd.length === 0   // 才有歐拉回路
odd.length === 2   // 只有歐拉路徑（起點 ≠ 終點）`,
    desc: (
      <>
        <p>歐拉定理：連通圖存在歐拉回路，<b>若且唯若每個節點的度數都是偶數</b>。</p>
        <p>直覺：每次走進一個節點，就得走另一條邊出去，邊是「一進一出」成對用掉的。度數是奇數，總有一次進去之後出不來。</p>
        <p>紅框的 {odd.length} 個節點度數是奇數，所以這張圖<b>沒有</b>歐拉回路。（奇數度節點的個數一定是偶數，因為所有度數加起來 = 邊數 × 2。）</p>
      </>
    ),
  },
  {
    title: "修正：奇點兩兩配對、重走一段",
    dungeon: false,
    edges: "dup",
    litKind: "dup",
    degrees: true,
    loops: 0,
    tag: `重走 ${even.dups.length} 段`,
    code: `while (odd.size) {
  const [s, t] = closestPair(odd);    // 貪婪配對
  for (const e of shortestPath(s, t))
    edges.push({ ...e, kind: "dup" }); // 複製一份 = 重走
}`,
    desc: (
      <>
        <p>守衛不可能不重走任何走廊。問題變成：<b>怎麼重走得最少</b>？這叫<b>中國郵差問題</b>（郵差要走遍每條街並回到郵局）。</p>
        <p>做法：把奇數度節點兩兩配對，每對之間的最短路<b>複製一份</b>（藍邊）。路徑兩端的度數 +1 變偶數，中間經過的節點 +2，奇偶不變。</p>
        <p>配對了 {even.pairs.length} 組，多出 {even.dups.length} 段重走的走廊，總長增加 {Math.round((extra / base) * 100)}%。現在每個節點都是偶數度了。</p>
      </>
    ),
  },
  {
    title: "Hierholzer ①：一路走到卡住",
    dungeon: false,
    edges: "dup",
    degrees: true,
    loops: 1,
    tag: `第 1 圈 · ${l1.edges.length} 條邊`,
    code: `function walk(from) {
  let cur = from;
  for (let e = nextUnused(cur); e; e = nextUnused(cur)) {
    used[e] = true;
    cur = other(e, cur);
  }   // 偶數度的圖：只會卡在起點
}`,
    desc: (
      <>
        <p>1873 年的 Hierholzer 演算法：從起點 R{START} 出發，每次挑一條還沒走過的邊，走到沒路為止。</p>
        <p>因為每個節點都是偶數度，走進任何一個非起點的節點，一定還有邊可以出去。所以<b>只會卡在起點</b>，得到一個迴圈：</p>
        <p><code>{seq(l1.nodes)}</code></p>
        <p>但這圈只用了 {l1.edges.length} 條邊，還有很多沒走到。</p>
      </>
    ),
  },
  {
    title: "Hierholzer ②：從圈上再繞一圈、接進去",
    dungeon: false,
    edges: "dup",
    degrees: true,
    loops: 2,
    tag: `第 2 圈 · ${l2.edges.length} 條邊`,
    code: `const p = circuit.findIndex(v => hasUnused(v));
const sub = walk(circuit[p]);
circuit.splice(p, 1, ...sub);   // 小圈接進大圈`,
    desc: (
      <>
        <p>沿著已有的迴圈找一個「還有未走邊」的節點：R{l2.from}。從它出發，用同樣的方法再走到卡住，又得到一個從 R{l2.from} 繞回 R{l2.from} 的迴圈（亮起），共 {l2.edges.length} 條邊。</p>
        <p>關鍵一步：把這個小迴圈<b>插進</b>大迴圈裡 R{l2.from} 的位置。大迴圈原本經過 R{l2.from} 時直接走下一條邊，現在先繞完小圈，再繼續原本的路。</p>
      </>
    ),
  },
  {
    title: "Hierholzer ③：重複到所有邊用完",
    dungeon: false,
    edges: "dup",
    degrees: true,
    loops: 3,
    tag: `第 3 圈 · ${l3.edges.length} 條邊`,
    code: `while (circuit.some(hasUnused)) {
  const p = circuit.findIndex(hasUnused);
  circuit.splice(p, 1, ...walk(circuit[p]));
}`,
    desc: (
      <>
        <p>再從 R{l3.from} 繞出第 3 圈、接進去。現在 {euler.edges.length} 條邊全部用完。</p>
        <p>每條邊只會被走一次、檢查常數次，所以整個演算法是 <b>O(E)</b>：邊數的線性時間，非常快。</p>
      </>
    ),
  },
  {
    title: "完整的巡邏路線",
    dungeon: false,
    edges: "dup",
    degrees: true,
    loops: "run",
    tag: `${euler.edges.length} 段 · 回到 R${START}`,
    code: `// 完整回路（節點序列）
${seq(euler.nodes).replace(/(( → [^ ]+){8})/g, "$1\n")}`,
    desc: (
      <>
        <p>巡邏員沿著拼好的回路走一遍：每條走廊都經過，藍色的段落走兩次，最後回到 R{START}。</p>
        <p>同樣的骨架還能做很多事：</p>
        <p>
          <b>一筆畫關卡</b>：謎題保證有解 ⇔ 奇數度節點只有 0 或 2 個<br />
          <b>掃地、除雪、灑水路線</b>：中國郵差問題<br />
          <b>反過來用</b>：故意留 2 個奇點，玩家就必須從其中一個出發、在另一個結束
        </p>
        <p>注意別和<b>哈密頓迴路</b>（每個<b>節點</b>恰好經過一次）搞混：那是 NP 完全問題，沒有這麼簡單的演算法。</p>
      </>
    ),
  },
];
