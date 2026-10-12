import type { BaseStep } from "../../components/ChapterStage";

export type BlockKind =
  | "system" | "tools" | "claudemd"
  | "user" | "assistant" | "tool_result"
  | "summary" | "report";

export const KIND_COLOR: Record<BlockKind, string> = {
  system: "#666c80",
  tools: "#3f7f8f",
  claudemd: "#5ec8f2",
  user: "#f2b84b",
  assistant: "#c08bff",
  tool_result: "#6ee7a8",
  summary: "#ff7a8a",
  report: "#ffa94d",
};

export const KIND_NAME: Record<BlockKind, string> = {
  system: "system",
  tools: "tools",
  claudemd: "CLAUDE.md",
  user: "user",
  assistant: "assistant",
  tool_result: "tool_result",
  summary: "摘要",
  report: "子代理報告",
};

export type Block = {
  /** 相同 id 的 block 在步驟之間會平滑變形（長高、縮扁、淡出） */
  id: string;
  kind: BlockKind;
  /** 佔整個 context window 的百分比（示意比例，非實測） */
  pct: number;
  label: string;
  /** 注意力稀釋：模型對這段的「抓取力」變弱 */
  dim?: boolean;
};

export type Step = BaseStep & {
  main: Block[];
  /** 子代理自己的 context window */
  sub?: Block[];
  /** 存在磁碟上、不在任何視窗裡的檔案 */
  disk?: { name: string; note: string }[];
  /** 壓縮時被丟掉的細節碎片 */
  debris?: boolean;
};

/** 自動壓縮門檻（示意值） */
export const THRESHOLD = 85;

const b = (id: string, kind: BlockKind, pct: number, label: string, dim?: boolean): Block =>
  ({ id, kind, pct, label, dim });

/* ---------- 固定開銷 ---------- */
const SYS = b("sys", "system", 4, "system prompt");
const TOOLS = b("tools", "tools", 5, "工具定義（含 MCP）");
const MD = b("md", "claudemd", 2, "CLAUDE.md");
const BASE = [SYS, TOOLS, MD];

/* ---------- 第一段長對話 ---------- */
const U1 = b("u1", "user", 1, "審整部劇本的角色一致性");
const A1 = b("a1", "assistant", 1, "我先讀全文");
const S1 = b("s1", "tool_result", 30, "劇本全文 v1");
const A2 = b("a2", "assistant", 4, "審稿意見（12 條）");
const U2 = b("u2", "user", 1, "照第 3 條改第 12 場");
const A3 = b("a3", "assistant", 1, "Edit 第 12 場");
const E1 = b("e1", "tool_result", 1, "已修改");
const S2 = b("s2", "tool_result", 30, "劇本全文 v2（改完重讀驗證）");
const U3 = b("u3", "user", 1, "第 20 場對白也順一下");
const A4 = b("a4", "assistant", 3, "改寫建議 + Edit");
const E2 = b("e2", "tool_result", 3, "已修改 + 前後文");
const CONVO1 = [U1, A1, S1, A2, U2, A3, E1, S2, U3, A4, E2];

const SUM = b("sum", "summary", 6, "摘要：審稿意見、已改第 12/20 場");

const zero = (blocks: Block[]) => blocks.map((x) => ({ ...x, pct: 0 }));

export const steps: Step[] = [
  {
    title: "空的視窗，其實不是空的",
    main: BASE,
    desc: (<>
      <p>中間這座固定高度的卡架是 <b>context window</b>：模型單次呼叫能「看見」的全部內容上限。一張卡是一則訊息，<b>卡的厚度就是它佔的比例</b>，旁邊的刻度尺從 0 到 100%。</p>
      <p>你還沒說話，架底就已經疊了三張卡：system prompt、工具定義、CLAUDE.md。<b>每一次呼叫都會帶著它們</b>，這是固定開銷。</p>
      <p>接了很多 MCP 工具的話，光是工具說明就能吃掉一大塊。</p>
    </>),
  },
  {
    title: "讀入整部劇本",
    main: [...BASE, U1, A1, S1],
    desc: (<>
      <p>你請它審整部劇本的角色一致性。最直接的做法是 Read 全文 —— 一個 tool_result 就佔了將近三分之一。</p>
      <p>這一大塊會<b>留在對話裡</b>，之後的每一次呼叫都會整份重送。</p>
    </>),
  },
  {
    title: "改稿後重讀：同一份劇本，兩份副本",
    main: [...BASE, ...CONVO1.slice(0, 8)],
    desc: (<>
      <p>它給了審稿意見，你請它改第 12 場；改完之後，它<b>重讀全文</b>來驗證。</p>
      <p>注意卡架裡現在有<b>兩份幾乎一樣的劇本</b>（v1、v2）。舊的那份不會自動消失 —— messages 只會往後加。</p>
      <p>改稿型工作最容易踩到這點：每讀一次全文，就多一份副本。</p>
    </>),
  },
  {
    title: "逼近門檻：長上下文的兩種代價",
    main: [...BASE, ...CONVO1.map((x) => (x.id === "s1" || x.id === "a2" || x.id === "u1" ? { ...x, dim: true } : x))],
    desc: (<>
      <p>又聊了一輪，卡疊越過紅色細線（自動壓縮門檻），前方錶的指針也轉進了紅區。這時有兩個問題：</p>
      <p><b>1. 硬上限</b>：再加下去就塞不進去了，必須處理。</p>
      <p><b>2. 注意力稀釋</b>（變暗的卡）：還沒滿之前，品質就已經在下降。內容越長，模型越難精準抓到中段的細節 —— 例如第 2 步審稿意見裡的某一條。</p>
    </>),
  },
  {
    title: "Compaction：把歷史壓成一段摘要",
    main: [...BASE, ...zero(CONVO1), SUM],
    debris: true,
    desc: (<>
      <p>Claude Code 自動觸發 <b>壓縮（compaction）</b>：請模型把整段對話寫成一份交接摘要，然後<b>用摘要取代原本的歷史</b>。</p>
      <p>空間立刻空出來了。但被擠進右邊廢卡箱的，就是被丟掉的細節 —— 摘要是<b>有損的</b>。</p>
      <p>你也可以手動下 <code>/compact</code>，並告訴它要保留什麼重點。</p>
    </>),
  },
  {
    title: "有損的代價：細節要重新取回",
    main: [
      ...BASE, SUM,
      b("u4", "user", 1, "小美左手的疤，是第幾場埋的伏筆？"),
      b("a5", "assistant", 1, "摘要裡沒有，我重讀全文"),
      b("s3", "tool_result", 30, "劇本全文 v3"),
    ],
    desc: (<>
      <p>你問了一個很細的問題。摘要只記了「審稿意見」和「改了哪幾場」，沒記這個伏筆。</p>
      <p>模型只好<b>再讀一次全文</b> —— 視窗又被吃掉三成。</p>
      <p>這就是長片會「忘記」第一幕的機制：不是模型記性差，而是那段內容<b>已經不在它眼前了</b>。</p>
    </>),
  },
  {
    title: "換個做法：按需讀取（just-in-time）",
    main: [
      ...BASE,
      b("u5", "user", 1, "小美左手的疤，是第幾場埋的伏筆？"),
      b("a6", "assistant", 1, 'Grep "疤"'),
      b("g1", "tool_result", 1, "命中：第 7、22、41 場"),
      b("a7", "assistant", 1, "Read 第 7 場（指定行數）"),
      b("r7", "tool_result", 3, "只有第 7 場"),
      b("a8", "assistant", 1, "答：第 7 場埋下"),
    ],
    desc: (<>
      <p>同一個問題，新的對話。這次模型先用 <b>Grep 搜尋</b>關鍵字，再用 Read 的 <code>offset / limit</code> <b>只讀那一場</b>。</p>
      <p>全部加起來不到 1/10。Claude Code 的設計就是如此：<b>不預先把整個專案塞進來，而是讓模型自己去找、找到才讀</b>。</p>
    </>),
  },
  {
    title: "派子代理：重度閱讀在另一個視窗完成",
    main: [
      ...BASE,
      b("u6", "user", 1, "全劇角色一致性檢查"),
      b("a9", "assistant", 1, "派子代理去讀全文"),
      b("rep", "report", 3, "子代理報告：5 個問題"),
    ],
    sub: [
      b("ss", "system", 4, "子代理 system"),
      b("st", "user", 1, "任務說明"),
      b("sf", "tool_result", 30, "劇本全文"),
      b("sn", "assistant", 4, "逐場筆記"),
    ],
    desc: (<>
      <p>真的需要讀全文的任務，交給 <b>子代理</b>。它有<b>自己獨立的 context window</b>（右邊那座較小的卡架），讀完、分析完，只把<b>結論</b>交回來。</p>
      <p>主視窗只多了一份 3% 的報告。子代理的視窗用完就丟。第 06 章會細講。</p>
    </>),
  },
  {
    title: "外部記憶：把設定集寫到磁碟上",
    main: [
      SYS, TOOLS,
      b("md2", "claudemd", 3, "CLAUDE.md（指向設定集）"),
      b("u7", "user", 1, "新的一天：繼續改第 30 場"),
      b("a10", "assistant", 1, "先查場次表與角色設定"),
      b("rn", "tool_result", 4, "場次表 + 角色設定摘錄"),
      b("r30", "tool_result", 3, "第 30 場"),
    ],
    disk: [
      { name: "characters.md", note: "角色設定：小美左手有疤（第 7 場）" },
      { name: "scene_index.md", note: "場次表：每場一行摘要" },
      { name: "revisions.md", note: "修訂紀錄：已改第 12、20 場" },
    ],
    desc: (<>
      <p>最後一招：把重要的東西寫進<b>檔案</b>（左邊的檔案櫃，一個抽屜是一個檔案）。檔案不佔視窗空間，下次需要時再讀回來。</p>
      <p>CLAUDE.md 每次開場自動載入，在裡面寫「設定集在哪裡」；角色設定、場次表、修訂紀錄則按需讀取。</p>
      <p>這就是<b>跨對話的記憶</b>：視窗會清空，磁碟不會。</p>
    </>),
  },
];
