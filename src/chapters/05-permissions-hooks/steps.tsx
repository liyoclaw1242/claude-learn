import type { BaseStep } from "../../components/ChapterStage";

/** 通道上的固定位置：模型 → PreToolUse hook → 權限規則 → 工具 → PostToolUse hook */
export type Waypoint =
  | "model" | "pre" | "rules" | "user" | "tool" | "post" | "stop"
  | "lowModel" | "lowPre" | "lowRules" | "lowTool" | "lowPost";

export type GateKey = "pre" | "rules" | "post" | "stop";
export type GateState = "idle" | "pass" | "block" | "ask" | "warn";

export const COLORS = {
  model: "#c08bff",
  user: "#f2b84b",
  harness: "#5ec8f2",
  tool: "#6ee7a8",
  pass: "#6ee7a8",
  block: "#ff7a8a",
  ask: "#f2b84b",
  warn: "#ffa94d",
  idle: "#3a4258",
};

export type Leg = { via: Waypoint[]; color: string };

export type LogLine = {
  /** 誰產生的這一行 */
  who: "model" | "hook" | "rules" | "user" | "tool" | "result" | "mode";
  text: string;
  tone?: "ok" | "bad" | "ask" | "warn";
};

export type Step = BaseStep & {
  /** 顯示哪些關卡（第 1 步還沒有任何關卡） */
  gates: GateKey[];
  /** 本步驟各關卡的狀態 */
  state?: Partial<Record<GateKey, GateState>>;
  /** 本步驟的焦點關卡：會顯示副標 */
  focus?: GateKey | "user";
  /** 工具節點顯示的名稱與目標 */
  tool: { name: string; target: string };
  /** 封包路線（依序播放） */
  legs: Leg[];
  /** 權限規則關卡上顯示的模式 */
  mode?: string;
  /** 右側面板：Harness 的處理紀錄 */
  log: LogLine[];
};

const P = COLORS.harness;

export const steps: Step[] = [
  {
    title: "沒有關卡的迴圈",
    gates: [],
    tool: { name: "Edit", target: "scene_12.fountain" },
    legs: [
      { via: ["model", "tool"], color: COLORS.model },
      { via: ["tool", "lowTool", "lowModel", "model"], color: COLORS.tool },
    ],
    log: [
      { who: "model", text: 'tool_use  Edit { file_path: "scenes/scene_12.fountain", … }' },
      { who: "tool", text: "直接執行：檔案已修改" },
      { who: "result", text: "tool_result  已修改", tone: "ok" },
    ],
    desc: (<>
      <p>回到第 01 章的迴圈：模型說「我要 Edit」，Harness 就照做，結果回傳給模型。</p>
      <p>下面這條分揀線上，工具請求卡從左邊的模型機櫃出發。這一步沿途的關卡都還沒裝上（暗色），卡直接開到壓印機執行。</p>
      <p>這樣很危險。模型會誤解、會被檔案內容誤導，也會在長對話裡忘記規則（第 02、03 章）。</p>
      <p>不過第 01 章已經埋了伏筆：<b>決策權在模型，執行權在 Harness</b>。模型只能「提出要求」，真正動手的是 Harness，所以 Harness 可以在中間設關卡。</p>
    </>),
  },
  {
    title: "權限規則：allow 直接放行",
    gates: ["pre", "rules", "post"],
    state: { rules: "pass" },
    focus: "rules",
    tool: { name: "Read", target: "scenes/scene_07.fountain" },
    legs: [
      { via: ["model", "pre", "rules", "tool"], color: COLORS.model },
      { via: ["tool", "post", "lowPost", "lowModel", "model"], color: COLORS.tool },
    ],
    log: [
      { who: "model", text: 'tool_use  Read { file_path: "scenes/scene_07.fountain" }' },
      { who: "rules", text: "讀取工作目錄內的檔案：不需要批准", tone: "ok" },
      { who: "tool", text: "執行 Read" },
      { who: "result", text: "tool_result  INT. 咖啡店 - 夜 …", tone: "ok" },
    ],
    desc: (<>
      <p>每一次工具呼叫，都要先過 <b>權限規則</b> 這道門。規則寫在 <code>settings.json</code>，由 Harness 比對，<b>跟模型怎麼想無關</b>。</p>
      <p>讀取工作目錄裡的檔案屬於低風險動作，預設就放行；你也可以用 <code>allow</code> 規則把更多動作加進白名單，例如 <code>Bash(npm run *)</code>。</p>
    </>),
  },
  {
    title: "ask：停下來問導演",
    gates: ["pre", "rules", "post"],
    state: { rules: "ask" },
    focus: "user",
    tool: { name: "Edit", target: "ep03/scene_12.fountain" },
    legs: [
      { via: ["model", "pre", "rules", "user"], color: COLORS.model },
      { via: ["user", "rules", "tool"], color: COLORS.user },
      { via: ["tool", "post", "lowPost", "lowModel", "model"], color: COLORS.tool },
    ],
    log: [
      { who: "model", text: 'tool_use  Edit { file_path: "ep03/scene_12.fountain", … }' },
      { who: "rules", text: "修改檔案：預設模式下需要批准", tone: "ask" },
      { who: "user", text: "你看到 diff，選擇「Yes」", tone: "ok" },
      { who: "tool", text: "執行 Edit" },
      { who: "result", text: "tool_result  已修改", tone: "ok" },
    ],
    desc: (<>
      <p>修改檔案、執行 shell 命令這類動作，預設會<b>暫停迴圈</b>，把模型想做的事（包括要改的 diff）攤給你看。</p>
      <p>滑台停在 ask 閘板前，導演台的燈亮起；按下按鈕，閘板才收起放行。你批准，Harness 才執行；你拒絕，模型會收到「使用者拒絕了」的 tool_result，再自己換做法。</p>
      <p>這就是片場的<b>導演批准</b>：副導可以提，但喊 Action 的是導演。</p>
    </>),
  },
  {
    title: "deny：這扇門永遠不開",
    gates: ["pre", "rules", "post"],
    state: { rules: "block" },
    focus: "rules",
    tool: { name: "Edit", target: "season1/ep05/scene_03.fountain" },
    legs: [
      { via: ["model", "pre", "rules"], color: COLORS.model },
      { via: ["rules", "lowRules", "lowModel", "model"], color: COLORS.block },
    ],
    log: [
      { who: "model", text: 'tool_use  Edit { file_path: "season1/ep05/scene_03.fountain", … }' },
      { who: "rules", text: "命中 deny：Edit(/season1/**)", tone: "bad" },
      { who: "result", text: "tool_result  is_error: true  權限不允許此操作", tone: "bad" },
      { who: "model", text: "「第 1 季已播出，我改成在第 2 季補一場回憶戲。」" },
    ],
    desc: (<>
      <p>在專案設定寫一條 <code>deny</code>：<code>Edit(/season1/**)</code>。從此不管模型多想改，<b>第 1 季的檔案都不會被寫入</b>，連你按「Yes」的機會都沒有。</p>
      <p>被擋下的呼叫不是靜悄悄消失，而是變成一則<b>錯誤 tool_result</b> 回到模型手上（帶著紅框的卡沿導軌退回模型機櫃）。模型讀到後，會自己找別的路。</p>
      <p>對照第 03 章：CLAUDE.md 寫「不可修改 season1/」是建議；這條 deny 是保證。</p>
    </>),
  },
  {
    title: "規則的順序：deny → ask → allow",
    gates: ["pre", "rules", "post"],
    state: { rules: "block" },
    focus: "rules",
    tool: { name: "Bash", target: "git push origin main" },
    legs: [
      { via: ["model", "pre", "rules"], color: COLORS.model },
      { via: ["rules", "lowRules", "lowModel", "model"], color: COLORS.block },
    ],
    log: [
      { who: "model", text: 'tool_use  Bash { command: "git push origin main" }' },
      { who: "rules", text: "allow 有 Bash(git *)，但 deny 有 Bash(git push *)" },
      { who: "rules", text: "先比 deny → 命中，結束", tone: "bad" },
      { who: "result", text: "tool_result  is_error: true", tone: "bad" },
    ],
    desc: (<>
      <p>一個動作可能同時符合好幾條規則。Claude Code 的比對順序固定是 <b>deny → ask → allow</b>，第一個命中的就算數，跟哪條寫得比較精確無關。</p>
      <p>所以 <code>allow: Bash(git *)</code> 加上 <code>deny: Bash(git push *)</code>，結果是「其他 git 指令都行，唯獨 push 不行」。<b>allow 永遠沒辦法在 deny 上開例外。</b></p>
      <p>規則可以來自好幾份設定檔；組織統一派發的 managed settings 優先權最高，其他層都蓋不掉它。</p>
    </>),
  },
  {
    title: "權限模式：整體鬆緊度",
    gates: ["pre", "rules", "post"],
    state: { rules: "pass" },
    focus: "rules",
    mode: "acceptEdits",
    tool: { name: "Edit", target: "ep03/scene_12.fountain" },
    legs: [
      { via: ["model", "pre", "rules", "tool"], color: COLORS.model },
      { via: ["tool", "post", "lowPost", "lowModel", "model"], color: COLORS.tool },
    ],
    log: [
      { who: "mode", text: "目前模式：acceptEdits" },
      { who: "model", text: 'tool_use  Edit { file_path: "ep03/scene_12.fountain", … }' },
      { who: "rules", text: "工作目錄內的修改：此模式自動接受", tone: "ok" },
      { who: "result", text: "tool_result  已修改", tone: "ok" },
    ],
    desc: (<>
      <p>除了逐條規則，還有一個總開關：<b>permission mode</b>。同一個 Edit，換成 <code>acceptEdits</code> 模式就不再停下來問。</p>
      <p>常見的有：<code>default</code>（逐項詢問）、<code>acceptEdits</code>（改檔自動接受）、<code>plan</code>（只讀不改，先出計畫）、<code>bypassPermissions</code>（全部跳過，只適合在隔離環境用）。</p>
      <p>模式調整的是「哪些動作要先問你」。絕對不能發生的事，還是要寫成 deny 規則或 hook，不要只靠模式。</p>
    </>),
  },
  {
    title: "PreToolUse hook：你寫的檢查程式",
    gates: ["pre", "rules", "post"],
    state: { pre: "block" },
    focus: "pre",
    tool: { name: "Edit", target: "ep09/scene_04.fountain" },
    legs: [
      { via: ["model", "pre"], color: COLORS.model },
      { via: ["pre", "lowPre", "lowModel", "model"], color: COLORS.block },
    ],
    log: [
      { who: "model", text: 'tool_use  Edit { …, new_string: "小美 30 歲生日…" }' },
      { who: "hook", text: "check_bible.py 從 stdin 收到工具名稱與參數" },
      { who: "hook", text: "exit 2  stderr: 小美設定 28 歲，與 bible/characters.md 不符", tone: "bad" },
      { who: "result", text: "tool_result  is_error: true  （附上 stderr）", tone: "bad" },
    ],
    desc: (<>
      <p>規則只能比對「工具名稱 + 路徑或命令」。要檢查<b>內容</b>，就用 <b>hook</b>：Harness 在固定時機執行的<b>你自己的程式</b>。</p>
      <p><code>PreToolUse</code> 在工具執行前跑，從 stdin 收到 JSON（工具名稱、參數）。程式以 <b>exit code 2</b> 結束，這次呼叫就被擋下，stderr 的內容會交給模型當作理由。</p>
      <p>這裡的 hook 比對角色設定集，發現「小美 30 歲」跟 Bible 衝突，擋下來。模型讀到理由，就能自己修正。</p>
    </>),
  },
  {
    title: "PostToolUse hook：做完再驗收",
    gates: ["pre", "rules", "post"],
    state: { pre: "pass", rules: "pass", post: "warn" },
    focus: "post",
    tool: { name: "Edit", target: "ep03/scene_12.fountain" },
    legs: [
      { via: ["model", "pre", "rules", "tool", "post"], color: COLORS.model },
      { via: ["post", "lowPost", "lowModel", "model"], color: COLORS.warn },
    ],
    log: [
      { who: "tool", text: "Edit 已執行" },
      { who: "hook", text: "fountain_lint.py：第 12 場缺少場景標頭", tone: "warn" },
      { who: "hook", text: "exit 2 → 不會復原修改，但 stderr 會交給模型", tone: "warn" },
      { who: "model", text: "「我補上 INT. 咖啡店 - 夜。」" },
    ],
    desc: (<>
      <p><code>PostToolUse</code> 在工具<b>執行完之後</b>跑。這時檔案已經改了，hook 擋不了，但可以<b>驗收</b>：跑格式檢查、更新場次表、記錄修改紀錄。</p>
      <p>發現問題時回傳 exit 2，stderr 一樣會送到模型眼前。模型看到「缺少場景標頭」，下一輪就自己補上。</p>
      <p>這就是第 01 章說的「tool_result 是世界的回饋」：hook 讓你能<b>自己定義回饋</b>。</p>
    </>),
  },
  {
    title: "其他時機：連「收工」都能攔",
    gates: ["pre", "rules", "post", "stop"],
    state: { stop: "block" },
    focus: "stop",
    tool: { name: "工具", target: "這一步沒有工具呼叫" },
    legs: [
      { via: ["model", "stop"], color: COLORS.model },
      { via: ["stop", "model"], color: COLORS.block },
    ],
    log: [
      { who: "model", text: "stop_reason: end_turn（模型認為做完了）" },
      { who: "hook", text: "Stop hook：revisions.md 還沒記錄這次修改", tone: "bad" },
      { who: "hook", text: "exit 2 → 不准停，理由交給模型", tone: "bad" },
      { who: "model", text: "「我先更新修訂紀錄。」" },
    ],
    desc: (<>
      <p>hook 不只掛在工具前後。<code>Stop</code> hook 在模型準備結束時觸發，exit 2 會<b>讓它繼續工作</b>，例如「修訂紀錄還沒更新，不准收工」。</p>
      <p>其他常用的時機：<code>UserPromptSubmit</code>（你送出訊息時，可以補充脈絡或擋下）、<code>SessionStart</code>（開工時載入今日進度）、<code>PreCompact</code>（壓縮前先存檔）。</p>
    </>),
  },
  {
    title: "全景：兩層防線",
    gates: ["pre", "rules", "post", "stop"],
    state: { pre: "pass", rules: "pass", post: "pass", stop: "pass" },
    tool: { name: "Edit", target: "ep03/scene_12.fountain" },
    legs: [
      { via: ["model", "pre", "rules", "tool", "post"], color: COLORS.model },
      { via: ["post", "lowPost", "lowModel", "model"], color: COLORS.tool },
    ],
    log: [
      { who: "model", text: "tool_use  Edit …" },
      { who: "hook", text: "PreToolUse：Bible 一致性 ✓", tone: "ok" },
      { who: "rules", text: "權限規則：不在 deny、模式允許 ✓", tone: "ok" },
      { who: "tool", text: "執行 Edit" },
      { who: "hook", text: "PostToolUse：Fountain 格式 ✓、場次表已更新", tone: "ok" },
      { who: "result", text: "tool_result  已修改", tone: "ok" },
    ],
    desc: (<>
      <p>把整條通道串起來：模型提出 → <b>PreToolUse hook</b> → <b>權限規則與模式</b>（必要時問你）→ 執行 → <b>PostToolUse hook</b> → 結果回到模型。</p>
      <p>第一層是給模型讀的文字（system prompt、CLAUDE.md），影響它<b>想做什麼</b>；第二層是 Harness 執行的程式，決定它<b>能做什麼</b>。</p>
      <p>兩層都要有：只有第一層會出事，只有第二層模型會一直撞牆。</p>
    </>),
  },
];

export const GATE_INFO: Record<GateKey, { title: string; sub: string; color: string }> = {
  pre: { title: "PreToolUse hook", sub: "執行前 · 你的程式檢查參數", color: P },
  rules: { title: "權限規則", sub: "deny → ask → allow · 模式", color: COLORS.user },
  post: { title: "PostToolUse hook", sub: "執行後 · 驗收與後處理", color: P },
  stop: { title: "Stop hook", sub: "模型想收工時 · 可要求繼續", color: P },
};
