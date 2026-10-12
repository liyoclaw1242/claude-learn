import type { BaseStep } from "../../components/ChapterStage";

export type ToolId =
  | "get_outline" | "find_mentions" | "read_scene" | "read_file" | "edit_scene" | "check_format"
  | "script_tool";

export type ToolDef = { id: ToolId; color: string; sub: string };

/** 劇本工具：目錄櫃裡一個抽屜一個 */
export const TOOLS: ToolDef[] = [
  { id: "get_outline", color: "#5ec8f2", sub: "每場一行的大綱" },
  { id: "find_mentions", color: "#5ec8f2", sub: "找角色 / 關鍵字出現在哪幾場" },
  { id: "read_scene", color: "#6ee7a8", sub: "只讀指定的一場" },
  { id: "read_file", color: "#8a92a6", sub: "讀整份檔案" },
  { id: "edit_scene", color: "#f2b84b", sub: "以精確字串取代，回傳 diff" },
  { id: "check_format", color: "#c08bff", sub: "檢查 Fountain 格式" },
  { id: "script_tool", color: "#ff7a8a", sub: "「處理劇本」" },
];

export type ResultKind = "ok" | "big" | "error" | "defs";

export type Result = {
  id: string;
  /** 示意的 token 量（決定結果卡的厚度），不是實測值 */
  size: number;
  kind: ResultKind;
  label: string;
  /** 只畫外框，用來對照「如果改用讀全文會有多大」 */
  ghost?: boolean;
};

export type Flight = { to: ToolId; delay: number; error?: boolean };

export type Step = BaseStep & {
  /** 目前可見的工具 */
  tools: ToolId[];
  /** 本步被呼叫的工具（顯示說明） */
  focus?: ToolId[];
  /** 模型頭上的 tool_use 文字 */
  call?: string;
  flights?: Flight[];
  /** 模型機櫃前的卡架：回到 context 的東西 */
  results: Result[];
  /** 顯示一排 MCP 工具 */
  mcp?: boolean;
  /** 右側面板：模型看到的工具定義 / 呼叫 / 回傳 */
  panelDef: string;
  panelCall?: string;
  panelResult?: string;
};

const SCRIPT_TOOLS: ToolId[] = ["get_outline", "find_mentions", "read_scene", "read_file", "edit_scene", "check_format"];

const FULL_GHOST: Result = { id: "full", size: 30, kind: "big", label: "讀全文會是這麼大", ghost: true };

export const steps: Step[] = [
  {
    title: "工具清單就是一份菜單",
    tools: SCRIPT_TOOLS,
    results: [],
    desc: (<>
      <p>模型從來沒有「看過」工具的程式碼。它拿到的只有每個工具的<b>名稱、說明（description）、參數格式（input_schema）</b>。</p>
      <p>它靠這三樣決定：要不要用工具、用哪一個、參數填什麼。所以<b>工具說明就是介面文件</b>，而讀者是模型。</p>
      <p>左邊的目錄櫃是 Claude Film 可能會有的劇本工具：<b>一個抽屜一個工具</b>，抽屜正面插著它的說明卡，卡越高代表說明寫得越完整。右後方是模型機櫃，前面的卡架放「回到 context 的東西」。</p>
    </>),
    panelDef: `{
  "name": "find_mentions",
  "description": "找出某個角色或關鍵字出現在哪幾場。
    回傳場次編號與該行文字，不回傳整場內容。
    想知道『某人在哪裡出現』時優先用這個，
    不要為此讀整份劇本。",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string",
                 "description": "角色名或關鍵字，例如：小美" }
    },
    "required": ["query"]
  }
}`,
  },
  {
    title: "壞描述：模型只能用猜的",
    tools: ["script_tool"],
    focus: ["script_tool"],
    call: 'script_tool({ action: "find", q: "小美" })',
    flights: [{ to: "script_tool", delay: 0, error: true }],
    results: [{ id: "err1", size: 1.5, kind: "error", label: "is_error：未知 action" }],
    desc: (<>
      <p>換成一個「萬用工具」：名稱 <code>script_tool</code>、說明只有「處理劇本」、參數是自由格式的 <code>action</code>。目錄櫃左下那個抽屜只插著一張幾乎空白的小卡，其他抽屜這一步都不能用。</p>
      <p>模型不知道 action 有哪些值，只能猜，猜錯就得到錯誤，再猜一次。每一次猜錯都是一次往返、一段多餘的 context。</p>
      <p>對人類工程師來說這是「文件沒寫」；對模型來說，這就是<b>它唯一的文件</b>。</p>
    </>),
    panelDef: `{
  "name": "script_tool",
  "description": "處理劇本",
  "input_schema": {
    "type": "object",
    "properties": {
      "action": { "type": "string" },
      "data": { "type": "object" }
    }
  }
}`,
    panelCall: `script_tool({ "action": "find", "q": "小美" })`,
    panelResult: `is_error: true
未知的 action: find`,
  },
  {
    title: "粗粒度：讀整份檔案",
    tools: SCRIPT_TOOLS,
    focus: ["read_file"],
    call: 'read_file("ep03.fountain")',
    flights: [{ to: "read_file", delay: 0 }],
    results: [{ id: "full", size: 30, kind: "big", label: "整集劇本全文" }],
    desc: (<>
      <p>問題：「小美在第 3 集哪幾場出場？」</p>
      <p>如果手上只有 <code>read_file</code>，模型只能把整集讀進來再自己找。答案只要一行，代價卻是<b>一整份劇本</b>留在 context 裡（第 02 章）。</p>
    </>),
    panelDef: `{
  "name": "read_file",
  "description": "讀取一個檔案的完整內容。",
  "input_schema": { ... "path": "string" ... }
}`,
    panelCall: `read_file({ "path": "ep03.fountain" })`,
    panelResult: `INT. 咖啡店 - 夜
小美擦著杯子……
（以下整集全文）`,
  },
  {
    title: "細粒度：find_mentions",
    tools: SCRIPT_TOOLS,
    focus: ["find_mentions"],
    call: 'find_mentions("小美")',
    flights: [{ to: "find_mentions", delay: 0 }],
    results: [FULL_GHOST, { id: "fm", size: 1, kind: "ok", label: "第 3、7、12、22 場" }],
    desc: (<>
      <p>同一個問題，換成 <code>find_mentions</code>：回傳只有場次編號和那一行文字。</p>
      <p>卡架上的點線框是剛才讀全文的大小，實際落下的只有一張薄卡。<b>工具的粒度，直接決定了每個問題要付多少 context。</b></p>
    </>),
    panelDef: `{
  "name": "find_mentions",
  "description": "找出某個角色或關鍵字出現在哪幾場……",
  "input_schema": { ... "query": "string" ... }
}`,
    panelCall: `find_mentions({ "query": "小美" })`,
    panelResult: `第 3 場  小美推門進來
第 7 場  小美把左手藏進口袋
第 12 場 小美：「你又來了。」
第 22 場 （小美的聲音，畫外）`,
  },
  {
    title: "先看大綱：get_outline",
    tools: SCRIPT_TOOLS,
    focus: ["get_outline"],
    call: "get_outline()",
    flights: [{ to: "get_outline", delay: 0 }],
    results: [FULL_GHOST, { id: "fm", size: 1, kind: "ok", label: "find_mentions 的結果" }, { id: "ol", size: 4, kind: "ok", label: "大綱：每場一行" }],
    desc: (<>
      <p>如果問題是「第 3 集的節奏哪裡拖？」，模型需要全局，但不需要每一句對白。</p>
      <p><code>get_outline</code> 回傳每場一行摘要：場次、地點、出場角色、這場發生了什麼。<b>先看地圖，再決定要細讀哪幾場。</b></p>
    </>),
    panelDef: `{
  "name": "get_outline",
  "description": "回傳整集的分場大綱，每場一行：
    場次、地點、日夜、出場角色、一句話摘要。
    分析結構或節奏時先用這個。",
  "input_schema": { "type": "object", "properties": {} }
}`,
    panelCall: "get_outline({})",
    panelResult: `1  INT. 咖啡店 - 夜   小美、阿哲  阿哲第一次來店裡
2  EXT. 街口 - 夜     阿哲        計程車拋錨
3  INT. 咖啡店 - 夜   小美        打烊前的獨白
……`,
  },
  {
    title: "平行呼叫：一次讀三場",
    tools: SCRIPT_TOOLS,
    focus: ["read_scene"],
    call: "read_scene(7) · read_scene(12) · read_scene(22)",
    flights: [{ to: "read_scene", delay: 0 }, { to: "read_scene", delay: 0.15 }, { to: "read_scene", delay: 0.3 }],
    results: [
      FULL_GHOST,
      { id: "s7", size: 3, kind: "ok", label: "第 7 場" },
      { id: "s12", size: 3, kind: "ok", label: "第 12 場" },
      { id: "s22", size: 3, kind: "ok", label: "第 22 場" },
    ],
    desc: (<>
      <p>看完大綱，模型決定細讀三場。它可以在<b>同一則回覆</b>裡放三個 <code>tool_use</code>，Harness 一起執行，結果放在同一則 user 訊息裡回傳（第 01 章）。</p>
      <p>三場加起來仍然比全文小很多，而且少了兩趟往返。</p>
    </>),
    panelDef: `{
  "name": "read_scene",
  "description": "讀取指定場次的完整內容。
    場次編號可從 get_outline 或 find_mentions 取得。",
  "input_schema": { ... "scene": "integer" ... }
}`,
    panelCall: `[tool_use] read_scene({ "scene": 7 })
[tool_use] read_scene({ "scene": 12 })
[tool_use] read_scene({ "scene": 22 })`,
    panelResult: `三個 tool_result，放在同一則 user 訊息裡`,
  },
  {
    title: "錯誤也是回饋：is_error",
    tools: SCRIPT_TOOLS,
    focus: ["edit_scene"],
    call: 'edit_scene(12, old: "你又來了", new: "又是你。")',
    flights: [{ to: "edit_scene", delay: 0, error: true }, { to: "edit_scene", delay: 2.6 }],
    results: [
      { id: "e1", size: 1.5, kind: "error", label: "is_error：不唯一" },
      { id: "e2", size: 1.2, kind: "ok", label: "diff：−1 行 +1 行" },
    ],
    desc: (<>
      <p>模型要改第 12 場的一句對白。<code>edit_scene</code> 用<b>精確字串取代</b>（Claude Code 的 Edit 也是這樣設計）。</p>
      <p>第一次失敗：那句話在這場出現了兩次，不知道該改哪一個。工具不是丟出例外，而是回傳 <code>is_error</code> 並<b>說明怎麼修</b>：「請多附上下文讓它唯一」。</p>
      <p>模型讀到錯誤訊息，帶上前一行再試一次，成功。<b>好的錯誤訊息，就是給模型的修正指引。</b></p>
    </>),
    panelDef: `{
  "name": "edit_scene",
  "description": "把指定場次中的 old_text 精確取代為 new_text。
    old_text 必須在該場中只出現一次；
    若出現多次，請附上更多前後文。
    成功時回傳 diff，不回傳整場。",
  ...
}`,
    panelCall: `① edit_scene({ scene: 12, old_text: "你又來了", ... })
② edit_scene({ scene: 12,
     old_text: "小美：（沒抬頭）\\n你又來了", ... })`,
    panelResult: `① is_error: true
   old_text 在第 12 場出現 2 次。請附上前後文讓它唯一。
② @@ scene 12 @@
   - 你又來了。
   + 又是你。`,
  },
  {
    title: "改稿回傳 diff，不回傳全文",
    tools: SCRIPT_TOOLS,
    focus: ["edit_scene", "check_format"],
    call: "check_format(12)",
    flights: [{ to: "check_format", delay: 0 }],
    results: [
      { id: "ghostScene", size: 3, kind: "big", label: "如果回傳整場", ghost: true },
      { id: "e2", size: 1.2, kind: "ok", label: "diff：−1 行 +1 行" },
      { id: "cf", size: 1, kind: "ok", label: "格式檢查：通過" },
    ],
    desc: (<>
      <p>改完之後，工具只回傳 <b>diff</b>。模型已經知道原文，它只需要確認「改了什麼」。如果每次都回傳整場甚至整集，就會出現第 02 章「同一份劇本好幾份副本」的問題。</p>
      <p>再呼叫 <code>check_format</code> 驗證格式。<b>能讓模型自己檢查成果的工具</b>，是 Agent 會自我修正的關鍵。</p>
    </>),
    panelDef: `{
  "name": "check_format",
  "description": "檢查指定場次是否符合 Fountain 格式與本劇的寫作規範。
    沒有問題回傳「通過」；
    有問題時逐條列出行號與修正建議。",
  ...
}`,
    panelCall: `check_format({ "scene": 12 })`,
    panelResult: `通過`,
  },
  {
    title: "工具越多，菜單越長",
    tools: SCRIPT_TOOLS,
    mcp: true,
    results: [
      { id: "defs", size: 4, kind: "defs", label: "劇本工具定義" },
      { id: "mcpDefs", size: 12, kind: "defs", label: "＋ MCP 工具定義" },
    ],
    desc: (<>
      <p>每個工具的定義都會放進每一次請求（第 03 章的 tools 那一格）。接上很多 MCP server 之後，光是工具清單就會吃掉一大塊 context，而且選項越多，模型越容易選錯。</p>
      <p>Claude Code 的對策之一是<b>按需載入工具定義</b>：一開始只給名稱，真的需要時才載入完整說明與參數格式（實作細節可能隨版本變動）。</p>
      <p>設計原則：<b>工具要少而精</b>，每一個都有清楚、不重疊的用途。</p>
    </>),
    panelDef: `劇本工具 6 個
＋ 剪輯軟體 MCP
＋ 雲端硬碟 MCP
＋ 行事曆 MCP
＋ ……

每一個都要放進每次請求的 tools`,
  },
];
