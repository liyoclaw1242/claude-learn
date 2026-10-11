import type { BaseStep } from "../../components/ChapterStage";

/* ---------- context 裡的區塊 ---------- */

export type BlockKind = "base" | "index" | "user" | "assistant" | "tool_result" | "memory";

export const KIND_COLOR: Record<BlockKind, string> = {
  base: "#666c80",
  index: "#5ec8f2",
  user: "#f2b84b",
  assistant: "#c08bff",
  tool_result: "#6ee7a8",
  memory: "#7fe3ff",
};

export const KIND_NAME: Record<BlockKind, string> = {
  base: "system",
  index: "MEMORY.md",
  user: "user",
  assistant: "assistant",
  tool_result: "tool_result",
  memory: "記憶檔",
};

export type Block = {
  /** 相同 id 的區塊在步驟之間平滑變形 */
  id: string;
  kind: BlockKind;
  /** 3D 高度（示意，不是 token 數） */
  h: number;
  label: string;
};

/* ---------- session：一段對話 ---------- */

export type SessionId = "d1" | "d2" | "d3";
export type SessionState = "idle" | "active" | "done";

export type Session = {
  state: SessionState;
  blocks: Block[];
};

export const SESSION_NAME: Record<SessionId, string> = { d1: "第 1 天", d2: "第 2 天", d3: "第 3 天" };

/* ---------- 記憶目錄裡的檔案 ---------- */

export type CardId = "idx" | "user" | "fb" | "proj" | "ref" | "rej";
/** hidden：還不存在；hot：本步驟被讀寫；stale：內容過時；rejected：判斷不該記 */
export type CardState = "hidden" | "normal" | "hot" | "stale" | "rejected";

export type Card = { id: CardId; file: string; type: string; content: string };

export const CARDS: Card[] = [
  { id: "idx", file: "MEMORY.md", type: "索引", content: "每則記憶一行：檔名 + 一句話摘要" },
  { id: "user", file: "user_role.md", type: "user", content: "使用者是電視劇編劇，熟悉 Fountain 格式" },
  { id: "fb", file: "feedback_dialogue.md", type: "feedback", content: "對白不要用「其實」開頭。\nWhy：導演覺得像在念稿。" },
  { id: "proj", file: "project_xiaomei.md", type: "project", content: "小美 28 歲" },
  { id: "ref", file: "reference_notes.md", type: "reference", content: "導演意見在共用雲端「夜咖啡／導演意見」資料夾" },
  { id: "rej", file: "場次清單", type: "不記", content: "讀劇本就能得到，不需要記" },
];

export const CARD_COLOR: Record<CardState, string> = {
  hidden: "#2a3040",
  normal: "#5ec8f2",
  hot: "#7fe3ff",
  stale: "#ff7a8a",
  rejected: "#ff7a8a",
};

/* ---------- 飛行動畫 ---------- */

export type Place = SessionId | CardId;
export type Flight = { from: Place; to: Place; color: string };

/* ---------- 步驟 ---------- */

export type Step = BaseStep & {
  sessions: Record<SessionId, Session>;
  cards: Partial<Record<CardId, CardState>>;
  /** 覆寫卡片的內容（例如記憶被修正） */
  cardContent?: Partial<Record<CardId, string>>;
  /** 該 session 下方顯示 transcript */
  transcripts?: SessionId[];
  flight?: Flight;
};

const b = (id: string, kind: BlockKind, h: number, label: string): Block => ({ id, kind, h, label });
const zero = (blocks: Block[]) => blocks.map((x) => ({ ...x, h: 0 }));
const idle: Session = { state: "idle", blocks: [] };

const BASE = (p: string) => b(`${p}-base`, "base", 1.2, "system + CLAUDE.md");

const D1_A = [
  BASE("d1"),
  b("d1-u1", "user", 0.6, "我是電視劇編劇"),
  b("d1-r1", "tool_result", 1.5, "讀第 3 集"),
  b("d1-u2", "user", 0.6, "對白不要用「其實」開頭"),
  b("d1-a1", "assistant", 0.8, "改好了"),
];
const D1_B = [...D1_A, b("d1-a2", "assistant", 0.5, "寫入記憶")];

const D2_A = [BASE("d2"), b("d2-idx", "index", 0.7, "MEMORY.md 索引")];
const D2_B = [
  ...D2_A,
  b("d2-u1", "user", 0.6, "寫第 4 集第 2 場對白"),
  b("d2-m1", "memory", 0.6, "feedback_dialogue.md"),
  b("d2-a1", "assistant", 1.2, "對白初稿"),
];
const D2_C = [
  ...D2_B,
  b("d2-u2", "user", 0.6, "小美第 5 集改成 30 歲"),
  b("d2-a2", "assistant", 0.5, "更新記憶"),
];

const D3 = [BASE("d3"), b("d3-idx", "index", 0.8, "MEMORY.md 索引")];

const MEM_COLOR = "#7fe3ff";

export const steps: Step[] = [
  {
    title: "每個 session 都從空白開始",
    sessions: { d1: { state: "active", blocks: [BASE("d1")] }, d2: idle, d3: idle },
    cards: {},
    desc: (<>
      <p>上面的三個玻璃箱是<b>三天的工作</b>，每個箱子是一次 session 的 context window。</p>
      <p>第 02 章說過：context 是模型唯一的記憶。可是它<b>每次開新對話都會清空</b>。第 1 天開場，箱子裡只有 system prompt 和 CLAUDE.md。</p>
      <p>這章要看的是：<b>跨過那條「清空」的線，什麼東西能留下來？</b></p>
    </>),
  },
  {
    title: "第 1 天：context 在累積",
    sessions: { d1: { state: "active", blocks: D1_A }, d2: idle, d3: idle },
    cards: {},
    desc: (<>
      <p>你們一起改第 3 集。過程中你順口說了兩件事：「我是電視劇編劇」、「對白不要用『其實』開頭」。</p>
      <p>此刻這兩句話只存在於<b>這一次的 context</b> 裡。對話一結束，它們就跟著消失。</p>
    </>),
  },
  {
    title: "寫下記憶：一事一檔",
    sessions: { d1: { state: "active", blocks: D1_B }, d2: idle, d3: idle },
    cards: { idx: "hot", user: "hot", fb: "hot", proj: "hot" },
    flight: { from: "d1", to: "fb", color: MEM_COLOR },
    desc: (<>
      <p>模型判斷這些資訊<b>下次還用得到</b>，就用一般的檔案工具把它們寫進記憶目錄（下方的檔案庫）。</p>
      <p>Claude Code 的自動記憶是<b>一則記憶一個檔案</b>，再加一份 <code>MEMORY.md</code> 當索引，每則一行。</p>
      <p>每個檔案都標了類型：<b>user</b>（你是誰）、<b>feedback</b>（你的修正與偏好）、<b>project</b>（進行中的事）、<b>reference</b>（外部資料在哪）。</p>
    </>),
  },
  {
    title: "session 結束：context 清空，transcript 留下",
    sessions: { d1: { state: "done", blocks: zero(D1_B) }, d2: idle, d3: idle },
    cards: { idx: "normal", user: "normal", fb: "normal", proj: "normal" },
    transcripts: ["d1"],
    desc: (<>
      <p>關掉終端機，第 1 天的 context 就清空了。但有兩樣東西留在磁碟上：</p>
      <p><b>1. transcript</b>（箱子下方的膠卷）：整段對話的逐字紀錄。用 <code>claude --continue</code> 或 <code>--resume</code> 可以把它<b>整段載回</b> context，接著聊。</p>
      <p><b>2. 記憶檔</b>：只留下精選過的幾件事。下次開<b>新</b>對話時，這些才是會帶過去的東西。</p>
    </>),
  },
  {
    title: "第 2 天開場：只載入索引",
    sessions: { d1: { state: "done", blocks: zero(D1_B) }, d2: { state: "active", blocks: D2_A }, d3: idle },
    cards: { idx: "hot", user: "normal", fb: "normal", proj: "normal" },
    transcripts: ["d1"],
    flight: { from: "idx", to: "d2", color: MEM_COLOR },
    desc: (<>
      <p>開新對話時，Claude Code 只把 <code>MEMORY.md</code> 這份<b>索引</b>放進 context，而且有上限（目前是前 200 行或 25KB）。</p>
      <p>各個記憶檔本身<b>不會</b>預先載入。這跟第 02 章的「按需讀取」、第 03 章的「Bible 寫目錄不寫全文」是同一個思路。</p>
    </>),
  },
  {
    title: "需要時才讀單檔",
    sessions: { d1: { state: "done", blocks: zero(D1_B) }, d2: { state: "active", blocks: D2_B }, d3: idle },
    cards: { idx: "normal", user: "normal", fb: "hot", proj: "normal" },
    transcripts: ["d1"],
    flight: { from: "fb", to: "d2", color: MEM_COLOR },
    desc: (<>
      <p>你請它寫第 4 集的對白。模型在索引裡看到「feedback_dialogue.md：對白偏好」，判斷跟這次任務有關，就<b>只讀那一個檔</b>。</p>
      <p>於是第 1 天那句「不要用『其實』開頭」，在第 2 天生效了。</p>
    </>),
  },
  {
    title: "記憶會過時：修正它",
    sessions: { d1: { state: "done", blocks: zero(D1_B) }, d2: { state: "active", blocks: D2_C }, d3: idle },
    cards: { idx: "normal", user: "normal", fb: "normal", proj: "stale" },
    cardContent: { proj: "小美 28 歲 → 30 歲（第 5 集起）" },
    transcripts: ["d1"],
    flight: { from: "d2", to: "proj", color: "#ff7a8a" },
    desc: (<>
      <p>你說：「小美從第 5 集起改成 30 歲。」記憶裡寫的還是 28 歲，<b>這則記憶過時了</b>。</p>
      <p>正確的做法是<b>更新那個檔案</b>，而不是再新增一則「小美 30 歲」。兩則互相矛盾的記憶，比沒有記憶更糟。</p>
      <p>Claude Code 寫入記憶檔時會記錄修改時間，讓人和模型都看得出這則記憶有多新。</p>
    </>),
  },
  {
    title: "不是什麼都該記",
    sessions: { d1: { state: "done", blocks: zero(D1_B) }, d2: { state: "active", blocks: D2_C }, d3: idle },
    cards: { idx: "normal", user: "normal", fb: "normal", proj: "normal", rej: "rejected" },
    cardContent: { proj: "小美 30 歲（第 5 集起；之前 28 歲）" },
    transcripts: ["d1"],
    desc: (<>
      <p>「第 4 集有哪些場次」要不要記？<b>不要</b>。直接讀劇本就知道，記下來反而會跟劇本不同步。</p>
      <p>判斷原則：<b>只記從原始資料推不出來的事</b>。你的偏好、你的修正、劇本之外的決策、外部資料在哪裡。</p>
    </>),
  },
  {
    title: "第 3 天：記憶在累積，context 一樣乾淨",
    sessions: {
      d1: { state: "done", blocks: zero(D1_B) },
      d2: { state: "done", blocks: zero(D2_C) },
      d3: { state: "active", blocks: D3 },
    },
    cards: { idx: "hot", user: "normal", fb: "normal", proj: "normal", ref: "normal" },
    cardContent: { proj: "小美 30 歲（第 5 集起；之前 28 歲）" },
    transcripts: ["d1", "d2"],
    flight: { from: "idx", to: "d3", color: MEM_COLOR },
    desc: (<>
      <p>第 3 天開場：檔案庫裡的記憶變多了，但 context 裡仍然只有一份<b>精簡的索引</b>。</p>
      <p>三種時間尺度的記憶：<b>context</b> 只活在一次對話裡；<b>transcript</b> 能讓同一段對話接著聊；<b>記憶檔</b>才是跨對話累積的知識。</p>
    </>),
  },
];
