import { Link } from "react-router-dom";

const SPLIT_TS = `type Node = { x: number; y: number; w: number; h: number; depth: number;
              split?: { dir: "v" | "h"; at: number }; kids?: [Node, Node]; room?: Rect };

function split(node: Node, rng: Rng, minLeaf = 7, maxDepth = 4) {
  if (node.depth >= maxDepth) return;
  const dir = node.w > node.h * 1.25 ? "v" : node.h > node.w * 1.25 ? "h" : rng() < 0.5 ? "v" : "h";
  const len = dir === "v" ? node.w : node.h;
  const lo = Math.max(minLeaf, Math.ceil(len * 0.35));
  const hi = Math.min(len - minLeaf, Math.floor(len * 0.65));
  if (lo > hi) return;                       // 切了會太小：當葉子
  const cut = randInt(rng, lo, hi + 1);
  const [a, b] = dir === "v"
    ? [{ ...node, w: cut }, { ...node, x: node.x + cut, w: node.w - cut }]
    : [{ ...node, h: cut }, { ...node, y: node.y + cut, h: node.h - cut }];
  a.depth = b.depth = node.depth + 1;
  node.kids = [a, b];
  split(a, rng, minLeaf, maxDepth);
  split(b, rng, minLeaf, maxDepth);
}`;

const LOOP_TS = `// 樹沒有環。想要環路：在「相鄰但不是兄弟」的房間之間，以一定機率多挖幾條走廊
for (const [a, b] of adjacentRoomPairs)
  if (!connected.has(key(a, b)) && rng() < 0.15) carveL(center(a), center(b));`;

export default function Article() {
  return (
    <article>
      <h1>04 · BSP 二叉樹：切出地牢房間</h1>

      <p>元胞自動機和柏林噪聲都是「讓形狀自己浮現」，擅長有機的地形，卻做不出方正的房間和筆直的走廊。
        人造結構需要<b>由上而下的規劃</b>：先決定大區塊怎麼分，再決定每塊裡放什麼。BSP 就是最經典的做法。</p>
      <blockquote>
        先分地，再蓋房，最後沿著分地的刀口把房子接起來。<br />
        <b>樹狀結構同時保證了三件事：不重疊、分布均勻、全部連通。</b>
      </blockquote>

      <h2>三個階段</h2>
      <table>
        <thead><tr><th>階段</th><th>做什麼</th><th>保證了什麼</th></tr></thead>
        <tbody>
          <tr><td>1. 切割</td><td>遞迴把矩形一刀切兩半，直到太小或太深</td><td>空間被分成大小相近、互不重疊的葉子</td></tr>
          <tr><td>2. 放房</td><td>每片葉子裡放一間隨機大小的房</td><td>房間不重疊，而且散布在整張地圖</td></tr>
          <tr><td>3. 接走廊</td><td>每個內部節點，接一條橫跨刀口的走廊</td><td>全部連通（而且剛好是一棵樹）</td></tr>
        </tbody>
      </table>

      <h2>切割</h2>
      <pre>{SPLIT_TS}</pre>
      <p>可以調的參數：</p>
      <ul>
        <li><b>minLeaf</b>：葉子的最小邊長。決定房間的最大數量與最小尺寸。</li>
        <li><b>maxDepth</b>：最多切幾層。最多 2^maxDepth 片葉子。</li>
        <li><b>刀口範圍</b>（35%–65%）：越窄越平均、越規律；越寬變化越大，但容易切出細長條。</li>
        <li><b>長寬比規則</b>：不沿長邊切，就會出現 3 × 20 的長條房。</li>
      </ul>

      <h2>接走廊：為什麼是「沿著樹」</h2>
      <p>每個內部節點代表一刀，刀的兩側各是一棵子樹。從最深的節點開始，每個節點從左右子樹各挑一間房接起來：</p>
      <ul>
        <li>接之前，左子樹內部已經連通，右子樹內部也已經連通（數學歸納法：葉子只有一間房，當然連通）。</li>
        <li>接一條走廊之後，兩棵子樹合成一塊連通的區域。</li>
        <li>一路做到根，整張圖連通。</li>
      </ul>
      <p>挑哪兩間房？最簡單是各挑一片葉子的房間；本章挑<b>中心距離最近</b>的一對，走廊比較短，也比較少穿過別的房間。
        走廊用 L 形（先橫再直或先直再橫，隨機），實作最簡單。</p>

      <h2>樹的副作用：沒有環</h2>
      <p>n 間房、n − 1 條走廊，結構上就是一棵樹。玩起來的感覺是：<b>每條岔路的盡頭都是死路</b>，探索完只能原路折返。
        Roguelike 通常會刻意補幾條額外的走廊做出環路：</p>
      <pre>{LOOP_TS}</pre>
      <p>補上環路以後，地牢就不再是樹，而是一張一般的<b>圖</b>。下一章就從這裡接手。</p>

      <h2>變體</h2>
      <ul>
        <li><b>不放房間、直接用葉子當房間</b>：得到密集的辦公室、宿舍、太空站格局。</li>
        <li><b>葉子裡改跑元胞自動機</b>：每塊各長一個小洞穴，再用走廊連起來，得到「有規劃的有機地形」。</li>
        <li><b>不同深度不同用途</b>：第 1 層切出城區，第 2 層切出街區，第 3 層切出建築，就是一個簡單的城市生成器。</li>
        <li><b>Quadtree / k-d tree</b>：一次切四刀、或沿不同軸輪流切，是同一家族的空間分割法。</li>
      </ul>

      <h2>適合與不適合</h2>
      <p>BSP 擅長<b>人造、矩形、層級分明</b>的空間：地牢、建築平面、城市街區。
        它不擅長自然地形，也不擅長「這種拼塊旁邊只能接那種拼塊」的細部規則，那是第 06 章波函數塌縮的領域。</p>

      <h2>小結</h2>
      <ul>
        <li>遞迴切割：沿長邊切、刀口落在中段、太小就停。</li>
        <li>每片葉子一間房：不重疊、分布均勻。</li>
        <li>每個內部節點一條走廊：由下往上合併，保證連通；結果是一棵樹，沒有環。</li>
      </ul>
      <p>上一章：<Link to="/map/03-perlin-noise">03 · 柏林噪聲</Link>　·　下一章：<Link to="/map/05-euler">05 · 圖與歐拉回路：一筆畫走完每條走廊</Link></p>
    </article>
  );
}
