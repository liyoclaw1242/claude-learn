import type { BaseStep } from "../../components/ChapterStage";

export type ModuleKey =
  | "user" | "core" | "context" | "rules" | "tools"
  | "hooks" | "subagents" | "skills" | "memory";

/** 誰提供這個元件：SDK（Claude Agent SDK 現成）/ film（Claude Film 自建）/ both（SDK 給機制、Film 給內容） */
export type Owner = "sdk" | "film" | "both";

export type Module = {
  key: ModuleKey;
  name: string;
  /** 對應章節 */
  ch: string;
  color: string;
  /** 聚焦時顯示的副標 */
  sub: string;
  /** 右側面板：Claude Film 的具體設計 */
  design: string;
  owner: Owner;
  ownerNote: string;
};

export const MODULES: Record<ModuleKey, Module> = {
  user: {
    key: "user", name: "編劇 / 導演", ch: "—", color: "#f2b84b",
    sub: "下指令、在關鍵處批准", design: "使用者介面：對話 + 劇本檢視 + 批准按鈕",
    owner: "film", ownerNote: "Film 自建（介面）",
  },
  core: {
    key: "core", name: "Agent Loop", ch: "01", color: "#5ec8f2",
    sub: "while 迴圈 · 決策在模型、執行在 Harness", design: "呼叫模型 → 執行工具 → 回填結果，直到 end_turn",
    owner: "sdk", ownerNote: "SDK 提供",
  },
  context: {
    key: "context", name: "Context 管理器", ch: "02", color: "#ff7a8a",
    sub: "按需讀取 · 編劇專用壓縮規則", design: "壓縮時必留：伏筆、未回收懸念、已確認的修改決策",
    owner: "both", ownerNote: "SDK 機制 + Film 規則",
  },
  rules: {
    key: "rules", name: "規則注入層", ch: "03", color: "#8a92a6",
    sub: "產品 prompt · Series Bible · 單集筆記", design: "series/CLAUDE.md 寫目錄，epXX/CLAUDE.md 寫單集筆記",
    owner: "both", ownerNote: "SDK 載入 + Film 內容",
  },
  tools: {
    key: "tools", name: "劇本工具集", ch: "04", color: "#6ee7a8",
    sub: "read_scene · find_mentions · edit_scene", design: "可定址的劇本：讀單場、查角色出場、回傳 diff",
    owner: "film", ownerNote: "Film 自建（以自訂工具接入）",
  },
  hooks: {
    key: "hooks", name: "權限與 Hooks", ch: "05", color: "#ff5c6c",
    sub: "工具執行前後的確定性檢查", design: "已播出集數禁寫、設定衝突檢查、改稿後更新場次表",
    owner: "both", ownerNote: "SDK 機制 + Film 規則",
  },
  subagents: {
    key: "subagents", name: "子代理", ch: "06", color: "#c08bff",
    sub: "冷眼審稿人 · 平行分析", design: "一致性審稿、節奏分析、角色弧線追蹤，各用獨立 context",
    owner: "both", ownerNote: "SDK 機制 + Film 角色定義",
  },
  skills: {
    key: "skills", name: "技能包與 MCP", ch: "07", color: "#ffa94d",
    sub: "按需載入的專業知識 · 外部系統", design: "「對白打磨」「開放式結局」技能；MCP 接排程表、素材庫",
    owner: "both", ownerNote: "SDK 機制 + Film 技能內容",
  },
  memory: {
    key: "memory", name: "記憶層", ch: "08", color: "#9fd8f0",
    sub: "跨對話：角色弧線、伏筆、導演偏好", design: "bible/ 底下的結構化檔案，每次改稿後回寫",
    owner: "film", ownerNote: "Film 自建（資料結構與回寫規則）",
  },
};

export const ORDER: ModuleKey[] = ["user", "core", "context", "rules", "tools", "hooks", "subagents", "skills", "memory"];

export type Step = BaseStep & {
  visible: ModuleKey[];
  focus?: ModuleKey;
  /** 完整請求走過的路徑 */
  path?: ModuleKey[];
  /** 路徑每一站在做什麼（右側面板） */
  trace?: string[];
  /** 顯示「誰提供」的分色 */
  ownership?: boolean;
};

const upTo = (k: ModuleKey) => ORDER.slice(0, ORDER.indexOf(k) + 1);

export const PATH: ModuleKey[] = [
  "user", "core", "rules", "core", "skills", "core", "hooks", "tools",
  "core", "subagents", "core", "hooks", "tools", "memory", "core", "user",
];

export const TRACE = [
  "編劇：「把第 3 集結尾改成開放式」",
  "Agent Loop 組請求、呼叫模型",
  "規則層：Series Bible + ep03 單集筆記已在 context",
  "模型判斷需要專業手法 → 載入「開放式結局」技能",
  "hook 放行讀取 → read_scene(3, 42)",
  "派冷眼審稿人：檢查新結局與後續集數的伏筆是否衝突",
  "審稿報告回來（只有結論，不帶全文）",
  "edit_scene → hook 檢查：ep03 未播出、角色設定無衝突 → 放行",
  "記憶層回寫：伏筆清單新增一條「未回收：阿哲的去向」",
  "回報編劇：附 diff 與審稿意見，等導演批准",
];

export const steps: Step[] = [
  {
    title: "起點：一個迴圈",
    visible: upTo("core"),
    focus: "core",
    desc: (<>
      <p>這章把前八章拼成一張圖。先從最核心的東西開始：<b>Agent Loop</b>（第 01 章）。</p>
      <p>模型負責決策、Harness 負責執行。Claude Film 的所有功能，都是掛在這個迴圈的某個插入點上。</p>
    </>),
  },
  {
    title: "Context 管理器",
    visible: upTo("context"),
    focus: "context",
    desc: (<>
      <p>劇本是長文本，context 是第一個硬問題（第 02 章）。</p>
      <p>Claude Film 的版本要多一件事：<b>編劇專用的壓縮規則</b>。壓縮時必須保留伏筆、未回收的懸念、已確認的修改決策；可以丟掉試錯過程和被否決的版本。</p>
    </>),
  },
  {
    title: "規則注入層",
    visible: upTo("rules"),
    focus: "rules",
    desc: (<>
      <p>三層規則（第 03 章）：<b>產品內建的編劇專業</b>、<b>這部劇的 Series Bible</b>、<b>單集筆記</b>。</p>
      <p>資料夾結構直接對應劇集結構，子目錄的 CLAUDE.md 讀到才載入 —— 寫到哪集看哪集的筆記。</p>
    </>),
  },
  {
    title: "劇本工具集",
    visible: upTo("tools"),
    focus: "tools",
    desc: (<>
      <p>工具的粒度決定 Agent 的能力邊界（第 04 章）。</p>
      <p>Claude Film 要讓劇本<b>可定址</b>：讀單場、查角色出場、取大綱、改稿回傳 diff。這是整個產品最需要自己設計的部分。</p>
    </>),
  },
  {
    title: "權限與 Hooks：守門",
    visible: upTo("hooks"),
    focus: "hooks",
    desc: (<>
      <p>擋在迴圈和工具之間的那道牆（第 05 章）。</p>
      <p>Bible 裡的規則是「建議」；hook 是<b>程式</b>，違規就拒絕。已播出集數禁寫、角色設定衝突檢查、改稿後自動更新場次表，都放在這裡。</p>
    </>),
  },
  {
    title: "子代理：第二攝製組",
    visible: upTo("subagents"),
    focus: "subagents",
    desc: (<>
      <p>需要讀全文的分析，交給<b>獨立 context</b> 的子代理（第 06 章），只把結論帶回主對話。</p>
      <p>獨立 context 還有一個好處：審稿人沒看過改稿過程，是真正的<b>冷眼</b>。</p>
    </>),
  },
  {
    title: "技能包與 MCP",
    visible: upTo("skills"),
    focus: "skills",
    desc: (<>
      <p>專業手法做成<b>技能包</b>，平常只有一行說明在 context 裡，用到才載入全文（第 07 章）。</p>
      <p>外部系統（拍攝排程、素材庫、劇本格式轉換）透過 <b>MCP</b> 接進來。</p>
    </>),
  },
  {
    title: "記憶層",
    visible: upTo("memory"),
    focus: "memory",
    desc: (<>
      <p>視窗會清空，磁碟不會（第 08 章）。角色弧線、伏筆清單、導演偏好，存成結構化檔案。</p>
      <p>重點不在「存」，而在<b>回寫</b>：每次改稿後誰負責更新，否則記憶會過期。</p>
    </>),
  },
  {
    title: "走一次：「把第 3 集結尾改成開放式」",
    visible: ORDER,
    path: PATH,
    trace: TRACE,
    desc: (<>
      <p>一個真實請求跑過整個架構。封包經過的每一站，右側面板都有說明。</p>
      <p>注意它<b>回到 Agent Loop 很多次</b>：每一次都是一輪「呼叫模型 → 執行工具」。整個流程不是寫死的管線，而是模型一步步決定的。</p>
    </>),
  },
  {
    title: "哪些現成，哪些要自己做",
    visible: ORDER,
    ownership: true,
    desc: (<>
      <p>這是建置建議，不是定論：以 <b>Claude Agent SDK</b> 為底。它就是 Claude Code 背後的 Harness，迴圈、壓縮、權限、hooks、子代理、技能、MCP 都已經有了。</p>
      <p><span style={{ color: "#5ec8f2" }}>藍色</span>＝SDK 現成；<span style={{ color: "#f2b84b" }}>金色</span>＝Claude Film 自建；<span style={{ color: "#6ee7a8" }}>綠色</span>＝SDK 給機制、Film 填內容。</p>
      <p>Claude Film 真正的價值，集中在金色和綠色：<b>劇本工具、規則內容、記憶結構</b>。</p>
    </>),
  },
];

export const OWNER_COLOR: Record<Owner, string> = { sdk: "#5ec8f2", film: "#f2b84b", both: "#6ee7a8" };
