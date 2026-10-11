import type { BaseStep } from "../../components/ChapterStage";

export type BlockKind = "system" | "tools" | "mcp" | "listing" | "user" | "skill" | "ref" | "tool_result";

export const KIND_COLOR: Record<BlockKind, string> = {
  system: "#8a92a6",
  tools: "#3f7f8f",
  mcp: "#ffa94d",
  listing: "#b0679c",
  user: "#f2b84b",
  skill: "#f28bd0",
  ref: "#f7c1e3",
  tool_result: "#6ee7a8",
};

export const KIND_NAME: Record<BlockKind, string> = {
  system: "system",
  tools: "tools",
  mcp: "MCP tools",
  listing: "技能清單",
  user: "user",
  skill: "SKILL.md",
  ref: "附屬檔",
  tool_result: "tool_result",
};

export type Block = {
  /** 相同 id 的方塊在步驟之間平滑變形 */
  id: string;
  kind: BlockKind;
  /** 3D 高度（示意比例，非實測 token） */
  h: number;
  label: string;
};

export type Skill = {
  id: string; name: string; desc: string;
  /** disable-model-invocation：名片不進清單，只能手動觸發 */
  manual?: boolean;
};

/** 磁碟上的技能卡匣（.claude/skills/<name>/SKILL.md） */
export const SKILLS: Skill[] = [
  { id: "dialogue", name: "對白打磨", desc: "對白太書面、口吻不一致時使用" },
  { id: "pacing", name: "節奏分析", desc: "檢查場次長度與張力曲線" },
  { id: "shotlist", name: "分鏡表輸出", desc: "不在清單：只能手動觸發", manual: true },
  { id: "fountain", name: "Fountain 格式化", desc: "修正場景標頭與對白格式" },
  { id: "casting", name: "選角筆記", desc: "整理角色外型與選角方向" },
];

/** 可以接上的 MCP server（外部系統） */
export const SERVERS = [
  { id: "schedule", name: "製作排程系統", sub: "stdio · 本機" },
  { id: "boards", name: "分鏡資料庫", sub: "HTTP · 遠端" },
  { id: "assets", name: "美術素材庫", sub: "HTTP · 遠端" },
];

export type Anchor = "model" | "user" | { skill: string } | { block: string } | { server: number };

export type Step = BaseStep & {
  ctx: Block[];
  /** 這一步新加入或變動的方塊 */
  hot?: string[];
  /** 技能清單已進 context：卡匣亮起 */
  listed?: boolean;
  /** 顯示所有技能的 description */
  showDesc?: boolean;
  /** 焦點卡匣 */
  focusSkill?: string;
  /** 已載入全文的技能 */
  loaded?: string[];
  /** 已接上的 MCP server 數量 */
  servers?: number;
  /** 警示（紅框）的方塊 */
  warn?: string;
  /** 外框：Plugin 打包 */
  plugin?: boolean;
  flight?: { from: Anchor; to: Anchor; color: string };
};

const b = (id: string, kind: BlockKind, h: number, label: string): Block => ({ id, kind, h, label });

const SYS = b("sys", "system", 1.4, "system prompt");
const TOOLS = b("tools", "tools", 1.2, "內建工具定義");
const LIST = b("list", "listing", 1.2, "技能清單（只有名片）");
const U1 = b("u1", "user", 1.2, "第 12 場太書面，幫我修");
const SK1 = b("sk1", "skill", 1.8, "對白打磨 SKILL.md");
const REF = b("ref", "ref", 1.2, "口語對照.md");
const U2 = b("u2", "user", 1.2, "/分鏡表輸出 第 12 場");
const SK2 = b("sk2", "skill", 1.6, "分鏡表輸出 SKILL.md");
const MCP1 = b("mcp", "mcp", 1.2, "MCP 工具（1 個 server）");
const MCP3 = b("mcp", "mcp", 2.6, "MCP 工具（3 個 server）");
const MCPD = b("mcp", "mcp", 1.2, "MCP 工具名稱（按需）");

const AFTER = [U1, SK1, REF, U2, SK2];

export const steps: Step[] = [
  {
    title: "沒有擴充的 Claude Code",
    ctx: [SYS, TOOLS],
    desc: (<>
      <p>中間的塔是 context，右上是模型。現在只有內建的 system prompt 和工具。</p>
      <p>左邊是磁碟上的 <b>技能卡匣</b>，左下是還沒接上的 <b>外部系統</b>。</p>
      <p>這章談三種把專業能力「插」進來的方式：<b>Skill</b>、<b>Slash command</b>、<b>MCP</b>，以及把它們打包的 <b>Plugin</b>。</p>
    </>),
  },
  {
    title: "技能清單：只放名片",
    ctx: [SYS, TOOLS, LIST],
    hot: ["list"],
    listed: true,
    showDesc: true,
    desc: (<>
      <p>開場時，Claude Code 掃描 <code>.claude/skills/</code>，但<b>只把每個技能的 name 和 description</b> 放進 context。</p>
      <p>五個技能加起來也只佔一小條。全文還在磁碟上。</p>
      <p>這是第 02 章「按需讀取」的延伸：<b>先讓模型知道有什麼，需要時再拿。</b></p>
    </>),
  },
  {
    title: "模型判斷：這個需求對得上哪張名片？",
    ctx: [SYS, TOOLS, LIST, U1],
    hot: ["u1"],
    listed: true,
    focusSkill: "dialogue",
    flight: { from: "model", to: { skill: "dialogue" }, color: "#f28bd0" },
    desc: (<>
      <p>你說「第 12 場對白太書面」。模型讀了技能清單，發現「對白打磨」的描述寫著<b>對白太書面時使用</b>，決定載入它。</p>
      <p>能不能被選中，<b>完全取決於 description 寫得好不好</b>。描述太模糊，模型就不會想到它。</p>
    </>),
  },
  {
    title: "載入 SKILL.md 全文",
    ctx: [SYS, TOOLS, LIST, U1, SK1],
    hot: ["sk1"],
    listed: true,
    focusSkill: "dialogue",
    loaded: ["dialogue"],
    flight: { from: { skill: "dialogue" }, to: { block: "sk1" }, color: "#f28bd0" },
    desc: (<>
      <p>技能被觸發後，<b>SKILL.md 的全文</b>才進入對話：步驟、判斷標準、範例。</p>
      <p>它會留在對話裡，後面幾輪都看得到。就像資深編劇把自己的工作方法寫成一頁 SOP，交給新人照做。</p>
    </>),
  },
  {
    title: "附屬檔：用到才讀",
    ctx: [SYS, TOOLS, LIST, U1, SK1, REF],
    hot: ["ref"],
    listed: true,
    focusSkill: "dialogue",
    loaded: ["dialogue"],
    flight: { from: { skill: "dialogue" }, to: { block: "ref" }, color: "#f7c1e3" },
    desc: (<>
      <p>SKILL.md 裡寫著「需要時參考 <code>reference/口語對照.md</code>」。模型判斷這次需要，才去讀它。</p>
      <p>同一個技能資料夾裡的其他檔案（範例、腳本）<b>沒用到就不進 context</b>。腳本是被執行，不是被讀進來。</p>
      <p>三層揭露：<b>名片 → 全文 → 附屬檔</b>。</p>
    </>),
  },
  {
    title: "Slash command：使用者直接按下",
    ctx: [SYS, TOOLS, LIST, ...AFTER],
    hot: ["u2", "sk2"],
    listed: true,
    focusSkill: "shotlist",
    loaded: ["dialogue", "shotlist"],
    flight: { from: "user", to: { skill: "shotlist" }, color: "#f2b84b" },
    desc: (<>
      <p>你輸入 <code>/分鏡表輸出 第 12 場</code>。這次不是模型判斷，而是<b>你直接指定</b>要用哪個技能。</p>
      <p>在 Claude Code 裡，自訂 slash command 已經併入 skill：同一個技能可以讓模型自動選，也可以讓你手動按。</p>
      <p>「分鏡表輸出」設了<b>只能手動觸發</b>，所以它的名片不在清單裡，模型不會自作主張去跑。</p>
    </>),
  },
  {
    title: "MCP：把外部系統接成工具",
    ctx: [SYS, TOOLS, MCP1, LIST, ...AFTER],
    hot: ["mcp"],
    listed: true,
    loaded: ["dialogue", "shotlist"],
    servers: 1,
    flight: { from: { server: 0 }, to: { block: "mcp" }, color: "#ffa94d" },
    desc: (<>
      <p><b>MCP（Model Context Protocol）</b>是一個標準協定：外部系統只要實作 MCP server，就能把自己的功能變成 Claude 可以呼叫的工具。</p>
      <p>這裡接上「製作排程系統」，模型多了 <code>get_shooting_days</code>、<code>find_location</code> 之類的工具。</p>
      <p>Skill 是<b>知識與做法</b>，MCP 是<b>連到外部世界的手</b>。</p>
    </>),
  },
  {
    title: "接太多 MCP：工具定義膨脹",
    ctx: [SYS, TOOLS, MCP3, LIST, ...AFTER],
    hot: ["mcp"],
    warn: "mcp",
    listed: true,
    loaded: ["dialogue", "shotlist"],
    servers: 3,
    flight: { from: { server: 2 }, to: { block: "mcp" }, color: "#ffa94d" },
    desc: (<>
      <p>每個 MCP server 都會帶進一串工具，每個工具都有說明和參數格式。接了三個，工具定義就變得很肥。</p>
      <p>回想第 02、03 章：工具定義是<b>固定開銷</b>，每次呼叫都要帶；而且它排在請求最前面，一變動就讓快取失效。</p>
    </>),
  },
  {
    title: "Tool search：工具也可以按需載入",
    ctx: [SYS, TOOLS, MCPD, LIST, ...AFTER],
    hot: ["mcp"],
    listed: true,
    loaded: ["dialogue", "shotlist"],
    servers: 3,
    desc: (<>
      <p>Claude Code 的解法跟技能一樣：<b>先只列名字</b>，模型需要某個 MCP 工具時，再用搜尋工具把它的完整定義拉進來。</p>
      <p>（目前的版本預設開啟這個機制；細節可能隨版本調整。）</p>
      <p>同一個原則第三次出現：<b>不要預先塞滿，讓模型自己去拿。</b></p>
    </>),
  },
  {
    title: "Plugin：把整套能力打包發佈",
    ctx: [SYS, TOOLS, MCPD, LIST, ...AFTER],
    listed: true,
    loaded: ["dialogue", "shotlist"],
    servers: 3,
    plugin: true,
    desc: (<>
      <p><b>Plugin</b> 把技能、MCP server、子代理、hooks 打包成一個可安裝的套件，透過 marketplace 分享。</p>
      <p>對 Claude Film 來說，這就是「<b>編劇工具包</b>」：一個劇組裝一次，所有人得到同一套技能、同一套外部系統連線、同一套守門規則。</p>
    </>),
  },
];
