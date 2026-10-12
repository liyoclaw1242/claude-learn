import type { ReactNode } from "react";

export const COLORS = {
  user: "#f2b84b",
  harness: "#5ec8f2",
  model: "#c08bff",
  tool: "#6ee7a8",
  ctx: "#ff7a8a",
  system: "#666c80",
} as const;

export type MsgKind = "system" | "user" | "assistant" | "tool_result";

export type Msg = {
  kind: MsgKind;
  /** 視覺高度單位；×10 ≈ 示意 token 數 */
  tok: number;
  role: string;
  text: string;
};

export type NodeKey = "user" | "harness" | "model" | "Read" | "Edit" | "Bash";

export type Flight = {
  from: NodeKey | "tower";
  to: NodeKey;
  color: string;
  /** 是否帶著整疊 context 一起飛（API 呼叫） */
  carryCtx?: boolean;
};

export type Step = {
  title: string;
  fly: Flight | null;
  focus: NodeKey;
  msgs: Msg[];
  /** msgs 中從這個 index 開始算「新加入」，用來高亮；Infinity = 沒有新增 */
  newFrom: number;
  desc: ReactNode;
};

/* ---------- 劇情：把 scene_03 的「小美」改名為「小雨」 ---------- */
const SYS: Msg = { kind: "system", tok: 90, role: "system + tools", text: "你是 Claude Code…（數千 token 的規則）\ntools: [Read, Edit, Bash, …]" };
const U1: Msg = { kind: "user", tok: 40, role: "user", text: "把 scene_03.fountain 裡的「小美」全部改成「小雨」" };
const A1: Msg = { kind: "assistant", tok: 60, role: "assistant", text: '[text] 我先讀這場戲。\n[tool_use id=toolu_01] Read { file_path: "scene_03.fountain" }' };
const R1: Msg = { kind: "tool_result", tok: 260, role: "user (tool_result)", text: "[tool_result toolu_01]\nINT. 咖啡店 - 夜\n小美推門進來，雨水順著髮梢……\n小美：你還在等他？\n……（整場戲的全文）" };
const A2: Msg = { kind: "assistant", tok: 70, role: "assistant", text: '[tool_use id=toolu_02] Edit {\n  file_path: "scene_03.fountain",\n  old_string: "小美", new_string: "小雨", replace_all: true }' };
const R2: Msg = { kind: "tool_result", tok: 30, role: "user (tool_result)", text: "[tool_result toolu_02] 已修改 4 處" };
const A3: Msg = { kind: "assistant", tok: 40, role: "assistant", text: "[text] 完成：scene_03 中「小美」共 4 處已改為「小雨」。\nstop_reason: end_turn" };

const NONE = Infinity;

export const steps: Step[] = [
  {
    title: "開機：Harness 準備好 system 與 tools",
    fly: null, focus: "harness", msgs: [SYS], newFrom: 0,
    desc: (<>
      <p>Claude Code 啟動時，<span className="tag-harness">Harness</span> 先組好兩樣東西：一份很長的 <b>system prompt</b>（規則、環境、你的 CLAUDE.md），以及 <b>tools</b> 清單（每個工具的名稱、說明、參數 schema）。</p>
      <p>這時模型還沒被呼叫過，它<b>什麼都不知道</b>。</p>
    </>),
  },
  {
    title: "使用者下指令",
    fly: { from: "user", to: "harness", color: COLORS.user }, focus: "harness", msgs: [SYS, U1], newFrom: 1,
    desc: (<>
      <p>你在終端機輸入一句話。Harness 把它包成 <code>{'{role: "user"}'}</code> 加到 messages 尾端。</p>
      <p>滑台上的卡片多了一張 —— 這疊卡就是模型「能看到的全部世界」。</p>
    </>),
  },
  {
    title: "第 1 次 API 呼叫：整疊送進模型",
    fly: { from: "tower", to: "model", color: COLORS.ctx, carryCtx: true }, focus: "model", msgs: [SYS, U1], newFrom: NONE,
    desc: (<>
      <p>Harness 呼叫 <code>messages.create(system, tools, messages)</code>。</p>
      <p>注意飛過去的是<b>整疊</b>，不是只有你最新那句。模型是<b>無狀態</b>的，每次都從零讀起。</p>
    </>),
  },
  {
    title: "模型回覆：我想用 Read",
    fly: { from: "model", to: "harness", color: COLORS.model }, focus: "harness", msgs: [SYS, U1, A1], newFrom: 2,
    desc: (<>
      <p>模型沒有手，它只能<b>輸出一段結構化文字</b>：一個 <code>tool_use</code> block，寫著工具名和參數，然後以 <code>stop_reason: "tool_use"</code> 停下。</p>
      <p>這是「請求」，不是「動作」。檔案還沒被碰過。</p>
    </>),
  },
  {
    title: "Harness 執行 Read",
    fly: { from: "harness", to: "Read", color: COLORS.harness }, focus: "Read", msgs: [SYS, U1, A1], newFrom: NONE,
    desc: (<>
      <p>Harness 解析 tool_use → 檢查權限（Read 通常預設允許）→ <b>真的</b>去讀磁碟上的檔案。</p>
      <p><b>執行權永遠在 Harness 手上</b> —— 這就是安全邊界。</p>
    </>),
  },
  {
    title: "結果包成 tool_result 塞回對話",
    fly: { from: "Read", to: "harness", color: COLORS.tool }, focus: "harness", msgs: [SYS, U1, A1, R1], newFrom: 3,
    desc: (<>
      <p>檔案內容被包成 <code>tool_result</code>（用 <code>tool_use_id</code> 對上剛才的請求），以 <b>user 角色</b>加進 messages。</p>
      <p>看卡疊：這張卡特別厚（卡的厚度 = token 數）。<b>工具結果通常是 context 最大的消耗者</b> —— 劇本全文就在這裡。</p>
    </>),
  },
  {
    title: "第 2 次 API 呼叫：再整疊送一次",
    fly: { from: "tower", to: "model", color: COLORS.ctx, carryCtx: true }, focus: "model", msgs: [SYS, U1, A1, R1], newFrom: NONE,
    desc: (<>
      <p>迴圈回到頂端。又是整疊送出，這次包含劇本全文。</p>
      <p>（實務上 Claude Code 用 <b>prompt caching</b>，前面沒變的部分不必重算，所以不會真的慢到 N² 爆炸。）</p>
    </>),
  },
  {
    title: "模型回覆：我想用 Edit",
    fly: { from: "model", to: "harness", color: COLORS.model }, focus: "harness", msgs: [SYS, U1, A1, R1, A2], newFrom: 4,
    desc: (<>
      <p>模型讀了劇本，決定下一步：用 Edit 做取代。</p>
      <p>注意：<b>「先讀再改」是模型自己決定的順序</b>，Harness 沒有寫死流程。這就是 Agent 與 workflow 的差別。</p>
    </>),
  },
  {
    title: "Harness 執行 Edit（可能先問你）",
    fly: { from: "harness", to: "Edit", color: COLORS.harness }, focus: "Edit", msgs: [SYS, U1, A1, R1, A2], newFrom: NONE,
    desc: (<>
      <p>Edit 會改檔案，依權限設定，Harness 可能先跳出確認視窗問你。你按「拒絕」的話，tool_result 會寫成「使用者拒絕」—— 模型會看到並調整策略。</p>
    </>),
  },
  {
    title: "Edit 結果回到對話",
    fly: { from: "Edit", to: "harness", color: COLORS.tool }, focus: "harness", msgs: [SYS, U1, A1, R1, A2, R2], newFrom: 5,
    desc: (<>
      <p>「已修改 4 處」被加入 messages。很短，但它是<b>世界的回饋</b> —— 若這裡回報錯誤（例如找不到字串），模型下一輪就會自己修正。</p>
    </>),
  },
  {
    title: "第 3 次 API 呼叫",
    fly: { from: "tower", to: "model", color: COLORS.ctx, carryCtx: true }, focus: "model", msgs: [SYS, U1, A1, R1, A2, R2], newFrom: NONE,
    desc: <p>又一次整疊送出。一個簡單任務，模型已經被呼叫第三次了。</p>,
  },
  {
    title: "模型回覆：end_turn",
    fly: { from: "model", to: "harness", color: COLORS.model }, focus: "harness", msgs: [SYS, U1, A1, R1, A2, R2, A3], newFrom: 6,
    desc: (<>
      <p>這次回覆只有文字、沒有 tool_use，<code>stop_reason: "end_turn"</code>。</p>
      <p>Harness 的 <code>while</code> 檢查到這點 → <b>跳出迴圈</b>。</p>
    </>),
  },
  {
    title: "顯示給使用者，等待下一句",
    fly: { from: "harness", to: "user", color: COLORS.harness }, focus: "user", msgs: [SYS, U1, A1, R1, A2, R2, A3], newFrom: NONE,
    desc: (<>
      <p>文字顯示在終端機。整份 messages 保留著，你下一句話會接在後面 —— 這就是「對話記憶」的全部真相：<b>只是一個不斷變長的陣列</b>。</p>
      <p>一個使用者回合 = 3 次模型呼叫 + 2 次工具執行。往下捲讀文字筆記。</p>
    </>),
  },
];
