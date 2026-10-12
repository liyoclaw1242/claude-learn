import type { BaseStep } from "../../components/ChapterStage";

export type LayerKind = "tools" | "system" | "env" | "claudemd" | "import" | "user" | "tool_result";
export type Section = "tools" | "system" | "messages";

export const KIND_COLOR: Record<LayerKind, string> = {
  tools: "#3f7f8f",
  system: "#8a92a6",
  env: "#666c80",
  claudemd: "#5ec8f2",
  import: "#9fd8f0",
  user: "#f2b84b",
  tool_result: "#6ee7a8",
};

export type Layer = {
  id: string;
  kind: LayerKind;
  section: Section;
  /** 3D 高度（示意，不是 token 數） */
  h: number;
  label: string;
  sub: string;
  /** 右側面板顯示的內容摘錄 */
  preview: string;
};

/** 一次 API 請求的全部內容，由下往上 = 送出順序（也是快取前綴的順序） */
export const LAYERS: Layer[] = [
  {
    id: "tools", kind: "tools", section: "tools", h: 1.4,
    label: "工具定義", sub: "Read / Edit / Grep / Bash … 各附說明",
    preview: "Read：讀取檔案。修改前必須先讀過……\nEdit：以精確字串取代……\nGrep：用正規表示式搜尋……",
  },
  {
    id: "sys", kind: "system", section: "system", h: 1.8,
    label: "內建 system prompt", sub: "身份 · 行為準則 · 工具使用守則",
    preview: "You are Claude Code… 先讀再改、不確定就問、\n回覆簡潔、不要做使用者沒要求的事……",
  },
  {
    id: "env", kind: "env", section: "system", h: 1.1,
    label: "環境資訊", sub: "工作目錄 · 平台 · 日期 · git 狀態",
    preview: "Working directory: ~/series\nPlatform: darwin\nToday's date: 2026-10-11",
  },
  {
    id: "mdUser", kind: "claudemd", section: "messages", h: 1.1,
    label: "~/.claude/CLAUDE.md", sub: "個人層 · 所有專案共用",
    preview: "用繁體中文、台灣用語回覆。\n對白避免書面語。",
  },
  {
    id: "mdProj", kind: "claudemd", section: "messages", h: 1.4,
    label: "series/CLAUDE.md", sub: "專案層 · 這部劇的 Bible 目錄",
    preview: "# 《夜咖啡》寫作規範\n- 劇本格式：Fountain\n- 角色設定見 @bible/characters.md\n- 第 1 季已播出，不可修改 season1/",
  },
  {
    id: "imp", kind: "import", section: "messages", h: 1.2,
    label: "@bible/characters.md", sub: "被 @ 匯入，整份展開",
    preview: "小美：28 歲，咖啡師，左手有疤（S2E07 揭曉）\n阿哲：32 歲，夜班計程車司機……",
  },
  {
    id: "u1", kind: "user", section: "messages", h: 1.1,
    label: "user", sub: "改第 3 集第 12 場的對白",
    preview: "幫我把第 3 集第 12 場的對白改得更口語。",
  },
  {
    id: "r1", kind: "tool_result", section: "messages", h: 1.3,
    label: "Read ep03/scene_12", sub: "tool_result",
    preview: "INT. 咖啡店 - 夜\n小美擦著杯子，沒有抬頭……",
  },
  {
    id: "mdEp", kind: "claudemd", section: "messages", h: 1.1,
    label: "ep03/CLAUDE.md", sub: "子目錄層 · 讀到 ep03 才附上",
    preview: "本集重點：阿哲第一次說謊。\n第 12 場的語氣要壓著，不要吵起來。",
  },
];

export type DiskFile = { id: string; name: string; note: string; layer: string };

export const FILES: DiskFile[] = [
  { id: "fUser", name: "~/.claude/CLAUDE.md", note: "個人習慣", layer: "mdUser" },
  { id: "fProj", name: "series/CLAUDE.md", note: "Series Bible（進版控）", layer: "mdProj" },
  { id: "fImp", name: "series/bible/characters.md", note: "角色設定集", layer: "imp" },
  { id: "fEp", name: "series/ep03/CLAUDE.md", note: "本集筆記", layer: "mdEp" },
  { id: "fScene", name: "series/ep03/scene_12.fountain", note: "劇本檔", layer: "r1" },
];

export type Step = BaseStep & {
  /** 目前請求裡有哪些層 */
  layers: string[];
  /** 這一步新加入的層（發光） */
  hot?: string[];
  /** 快取狀態：hit = 前綴重用；miss = 底層被改動，整疊重算 */
  cache?: "hit" | "miss";
  /** 被改動的那一層 */
  changed?: string;
  /** 飛行動畫：送出請求 / 模型去讀檔 / 被 hook 擋下 */
  flight?: "send" | "read" | "blocked";
  /** 顯示 hook 擋板 */
  gate?: boolean;
  /** 覆寫某層的副標 */
  note?: Record<string, string>;
};

const ALL = LAYERS.map((l) => l.id);

export const steps: Step[] = [
  {
    title: "模型只收到一份請求",
    layers: [],
    desc: (<>
      <p>回顧第 01 章：模型是密室裡的編劇，它知道的一切，都在每次塞進門縫的<b>那一份請求</b>裡。</p>
      <p>一份請求有三格：<b>tools</b>、<b>system</b>、<b>messages</b>。你希望它遵守的規則、記得的世界觀，<b>都必須被放進這三格之一</b>，否則對它來說就不存在。</p>
      <p>中間的組裝夾具就是這份請求：三片索引分隔板隔出 tools、system、messages，由下往上 = 送出順序。左邊三層公文架是目錄層級，右邊是模型機櫃。</p>
      <p>這章看 Claude Code 把哪些東西、在什麼時機、放進哪一格。</p>
    </>),
  },
  {
    title: "第一層：內建的 system prompt",
    layers: ["sys"],
    hot: ["sys"],
    desc: (<>
      <p>Claude Code 自己帶了一份很長的 <b>system prompt</b>：它是誰、怎麼跟你互動、什麼時候該先問、怎麼使用工具、回覆要多簡潔。</p>
      <p>你平常看不到它，也不需要改它。它就像製作公司給每個劇組的<b>工作守則</b>：不管拍哪部戲都一樣。</p>
    </>),
  },
  {
    title: "環境資訊：通告單",
    layers: ["sys", "env"],
    hot: ["env"],
    desc: (<>
      <p>接著附上<b>這次開工的現場資訊</b>：工作目錄、作業系統、今天日期、是不是 git 專案、目前分支與狀態。</p>
      <p>模型沒有時鐘、也看不到你的硬碟。它會「知道今天幾號」，只因為 Harness 寫在這裡。這就是片場的<b>通告單</b>。</p>
    </>),
  },
  {
    title: "工具說明，本身就是指令",
    layers: ["tools", "sys", "env"],
    hot: ["tools"],
    desc: (<>
      <p><b>tools</b> 排在最前面。每個工具都附一段說明，告訴模型「什麼時候用、怎麼用、有什麼限制」。</p>
      <p>像「Edit 之前必須先 Read」這種規則，就寫在工具說明裡，而且 Harness 會在執行時再檢查一次。</p>
      <p>所以工具說明也是 prompt 的一部分，第 04 章會專門談它。</p>
    </>),
  },
  {
    title: "個人層 CLAUDE.md",
    layers: ["tools", "sys", "env", "mdUser"],
    hot: ["mdUser"],
    desc: (<>
      <p>開場時，Claude Code 讀取 <code>~/.claude/CLAUDE.md</code>：你個人的偏好，<b>每個專案都會帶著</b>。</p>
      <p>注意它<b>不在 system 裡</b>。目前的做法是把 CLAUDE.md 包成一段提醒，放在 <b>messages 的最前面</b>（這是實作細節，可能隨版本調整）。</p>
      <p>好處是：內建 system prompt 對所有人都一樣，可以穩定地被快取（第 8 步）。</p>
    </>),
  },
  {
    title: "專案層 CLAUDE.md：Series Bible",
    layers: ["tools", "sys", "env", "mdUser", "mdProj", "imp"],
    hot: ["mdProj", "imp"],
    desc: (<>
      <p>接著從工作目錄<b>往上逐層找</b>，每一層的 <code>CLAUDE.md</code> 都會載入。專案的那份通常進版控，<b>整個編劇室共用</b>。</p>
      <p>裡面寫 <code>@bible/characters.md</code>，就會把那個檔案<b>整份展開</b>進來。</p>
      <p>方便，但要記得第 02 章：開場載入的東西，每次呼叫都要付 context。匯入太多，固定開銷就膨脹了。</p>
    </>),
  },
  {
    title: "子目錄的 CLAUDE.md：讀到才載入",
    layers: ALL,
    hot: ["u1", "r1", "mdEp"],
    flight: "read",
    desc: (<>
      <p>你請它改第 3 集第 12 場。它去 Read <code>ep03/scene_12.fountain</code>。</p>
      <p>這時 Claude Code 發現 <code>ep03/</code> 底下也有一份 <code>CLAUDE.md</code>，就<b>順便附上</b>。在這之前，這份單集筆記完全不在 context 裡。</p>
      <p>這是一種「按需注入」：<b>規則跟著工作位置走</b>。改第 3 集時才看得到第 3 集的筆記。</p>
    </>),
  },
  {
    title: "Prompt caching：穩定的前綴",
    layers: ALL,
    cache: "hit",
    flight: "send",
    desc: (<>
      <p>第 01 章說過，每次呼叫都要<b>整疊重送</b>。重送的部分大多跟上次一模一樣。</p>
      <p>API 的 <b>prompt caching</b> 會記住「跟上次逐字相同的前綴」，下次直接重用：更便宜、更快。</p>
      <p>這也是為什麼順序是 <b>tools → system → messages</b>：越不會變的東西放越前面。夾具上的夾板壓下、燈亮，代表整疊前綴命中快取。</p>
    </>),
  },
  {
    title: "改動底層：上面全部重算",
    layers: ALL,
    cache: "miss",
    changed: "tools",
    note: { tools: "中途接上新的 MCP server" },
    desc: (<>
      <p>快取只認<b>前綴</b>。假如中途接上一個新的 MCP server，工具定義變了，那麼它<b>上面的每一層</b>都對不上快取，整疊要重新計算。</p>
      <p>設計啟示：<b>會變動的資訊放後面</b>。像「這次要改哪一場」「導演今天的意見」，應該放在 messages 的尾端，而不是塞進 system。</p>
    </>),
  },
  {
    title: "CLAUDE.md 是建議，不是保證",
    layers: ALL,
    gate: true,
    flight: "blocked",
    note: { mdProj: "「不可修改 season1/」只是文字" },
    desc: (<>
      <p>Bible 裡寫了「第 1 季已播出，不可修改」。模型<b>通常</b>會遵守，但這是機率，不是保證。context 一長，注意力還會被稀釋（第 02 章）。</p>
      <p>絕對不能發生的事，要交給 <b>Harness 層</b>來擋：權限規則或 hook 會在工具執行前檢查，違規就直接拒絕（第 05 章）。</p>
      <p>右邊的 Edit 壓印機正要壓第 1 季的頁面，hook 的擋塊先滑進壓頭下方，壓頭就停在擋塊上。</p>
      <p><b>CLAUDE.md 負責「希望它怎麼做」，hook 負責「絕對不准」。</b></p>
    </>),
  },
];
