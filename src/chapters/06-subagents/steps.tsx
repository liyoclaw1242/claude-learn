import type { BaseStep } from "../../components/ChapterStage";

export type BlockKind = "system" | "history" | "user" | "assistant" | "tool_result" | "brief" | "report";

export const KIND_COLOR: Record<BlockKind, string> = {
  system: "#8a92a6",
  history: "#6b5a8a",
  user: "#f2b84b",
  assistant: "#c08bff",
  tool_result: "#6ee7a8",
  brief: "#5ec8f2",
  report: "#ffa94d",
};

export const KIND_NAME: Record<BlockKind, string> = {
  system: "system",
  history: "歷史",
  user: "user",
  assistant: "assistant",
  tool_result: "tool_result",
  brief: "任務說明",
  report: "報告",
};

export type Block = {
  /** 相同 id 的方塊在步驟之間平滑變形 */
  id: string;
  kind: BlockKind;
  /** 3D 高度（示意比例） */
  h: number;
  label: string;
  /** 面板裡顯示的內容摘錄 */
  text?: string;
  /** 本步驟的焦點（發光 + 在 3D 中顯示標籤） */
  hot?: boolean;
  /** 出問題的方塊（紅色） */
  warn?: boolean;
  /** 發光但不顯示 3D 標籤（相鄰的薄方塊共用一個標籤） */
  noLabel?: boolean;
};

export type Unit = {
  name: string;
  role: string;
  /** 這一組被允許使用的工具（專門化） */
  tools: string;
};

/** 三個第二攝製組 */
export const UNITS: Unit[] = [
  { name: "A 組", role: "一致性審稿", tools: "Read · Grep（唯讀）" },
  { name: "B 組", role: "節奏分析", tools: "Read（唯讀）" },
  { name: "C 組", role: "角色弧線", tools: "Read · Grep（唯讀）" },
];

export type FlightKind = "brief" | "report";

export type Step = BaseStep & {
  main: Block[];
  /** 每組子代理的 context；null = 不存在（還沒派出或已丟棄） */
  units: (Block[] | null)[];
  /** 封包：派出任務說明，或交回報告 */
  flights?: { kind: FlightKind; unit: number }[];
  /** 在子代理上方顯示工具清單 */
  showTools?: boolean;
};

const b = (id: string, kind: BlockKind, h: number, label: string, text?: string): Block =>
  ({ id, kind, h, label, text });
const hot = (x: Block): Block => ({ ...x, hot: true });

/* ---------- 主代理 ---------- */
const SYS = b("sys", "system", 0.9, "system", "Claude Code 的 system prompt + CLAUDE.md");
const HIST = b("hist", "history", 3.2, "改稿歷史（很長）", "兩小時的改稿對話：讀稿、審稿意見、改第 12、20 場……\n導演說：小美左手的疤要保留，第 9 集會回收。");
const ASK = b("ask", "user", 0.5, "全劇三項檢查", "幫我做全劇的一致性、節奏、角色弧線檢查。");
const CALL = b("call", "assistant", 0.6, "Agent × 3", "tool_use: Agent(A 組…)\ntool_use: Agent(B 組…)\ntool_use: Agent(C 組…)");
const BASE = [SYS, HIST, ASK];
const CALLED = [...BASE, CALL];

const REPORT_TEXT = [
  "A 組：5 處設定矛盾（附場次與行號）",
  "B 組：第二幕中段節奏拖沓（第 18–23 場）",
  "C 組：阿哲的轉變缺少動機鋪陳",
];
const R = UNITS.map((u, i) => b(`r${i}`, "tool_result", 0.45, `${u.name}報告`, REPORT_TEXT[i]));

/* ---------- 子代理 ---------- */
const unitBlocks = (i: number, stage: "brief" | "working" | "done"): Block[] => {
  const u = UNITS[i];
  const blocks = [
    b(`u${i}sys`, "system", 0.6, "system", `子代理 system：你是${u.role}專員，只能讀不能改。`),
    b(`u${i}brief`, "brief", 0.5, "任務說明", `檢查全劇的${u.role}。劇本在 scenes/，回報格式：問題 / 場次 / 建議。`),
  ];
  if (stage === "brief") return blocks;
  blocks.push(
    b(`u${i}read`, "tool_result", 3.0, "劇本全文", "Read scenes/*.fountain（全部 60 場）"),
    b(`u${i}notes`, "assistant", 0.9, "逐場筆記", "第 1 場… 第 2 場… 第 3 場…"),
  );
  if (stage === "done") blocks.push(b(`u${i}rep`, "report", 0.45, "最終報告", REPORT_TEXT[i]));
  return blocks;
};

const all = (stage: "brief" | "working" | "done") => [0, 1, 2].map((i) => unitBlocks(i, stage));
const NONE = [null, null, null];

export const steps: Step[] = [
  {
    title: "主片場：context 已經很重",
    main: [SYS, hot(HIST), hot(ASK)],
    units: NONE,
    desc: (<>
      <p>你已經改稿兩小時，主對話裡堆滿了讀稿、審稿和修改紀錄（第 02 章）。</p>
      <p>這時你要求：「做全劇的一致性、節奏、角色弧線檢查。」三項都要<b>讀完整部劇本</b>。</p>
      <p>如果在主對話裡直接讀，每項各讀一次，視窗很快就滿了。</p>
    </>),
  },
  {
    title: "子代理就是一個工具",
    main: [...BASE, hot(CALL)],
    units: NONE,
    desc: (<>
      <p>Claude Code 的工具清單裡有一個 <b>Agent</b> 工具。對模型來說，它跟 Read、Grep 一樣，只是一個 <code>tool_use</code>。</p>
      <p>差別在 Harness 的實作：它不是去讀檔，而是<b>啟動另一個完整的 agent loop</b>（第 01 章的那個 <code>while</code>）。</p>
      <p>這次模型在同一則回覆裡寫了三個 Agent 呼叫，每個附上一段任務說明。</p>
    </>),
  },
  {
    title: "平行派出三組",
    main: CALLED,
    units: all("brief"),
    flights: [0, 1, 2].map((unit) => ({ kind: "brief" as const, unit })),
    desc: (<>
      <p>三個子代理<b>同時</b>開工。每一組帶走的只有一份<b>任務說明</b>（藍色）。</p>
      <p>同一則回覆裡的多個工具呼叫可以平行執行，這就是第 01 章提過的平行 tool_use。</p>
    </>),
  },
  {
    title: "全新的視窗：看不到主對話",
    main: [SYS, hot({ ...HIST, label: "子代理看不到這段" }), ASK, CALL],
    units: [0, 1, 2].map((i) => unitBlocks(i, "brief").map(hot)),
    desc: (<>
      <p>每個子代理的 context 是<b>從零開始</b>的：只有它自己的 system prompt 和那份任務說明。</p>
      <p>主對話那兩小時的歷史，包括「導演說疤要保留」，<b>子代理完全看不到</b>。</p>
      <p>所以任務說明必須<b>自給自足</b>：該知道的背景、範圍、回報格式，都要寫進去。</p>
    </>),
  },
  {
    title: "各組在自己的視窗裡讀全文",
    main: CALLED,
    units: all("working"),
    showTools: true,
    desc: (<>
      <p>三組各自讀全劇、做筆記。三個視窗各長了一大截，但<b>主視窗一點都沒變</b>。</p>
      <p>每組還可以<b>專門化</b>：不同的 system prompt、不同的工具子集、甚至不同的模型。這裡三組都只拿到唯讀工具。</p>
    </>),
  },
  {
    title: "只交回最終報告",
    main: CALLED,
    units: all("done"),
    flights: [0, 1, 2].map((unit) => ({ kind: "report" as const, unit })),
    desc: (<>
      <p>每組完成後，只把<b>最後一則回覆</b>（報告）交回去，當作 Agent 工具的 <code>tool_result</code>。</p>
      <p>讀過的全文、中間的筆記，都不會跟著回來。</p>
    </>),
  },
  {
    title: "子視窗丟棄，主視窗只多三小塊",
    main: [...CALLED, ...R.map((r, i) => ({ ...hot(r), noLabel: i < 2, label: i === 2 ? "三份報告" : r.label }))],
    units: NONE,
    desc: (<>
      <p>子代理結束後，它的 context 就丟掉了。主視窗只多了三份短報告。</p>
      <p>三次全劇閱讀的成本，<b>全部留在子視窗裡</b>。這是 Claude Code 處理「大量閱讀、少量結論」任務的主要手法。</p>
    </>),
  },
  {
    title: "代價：報告是有損的，交接可能漏東西",
    main: [SYS, hot({ ...HIST, label: "這裡有導演的決定：疤要保留" }), ASK, CALL, R[0], R[1], { ...R[2], label: "C 組：建議刪掉疤的伏筆", hot: true, warn: true, text: "C 組：小美的疤沒有回收，建議刪掉 ← 但導演已決定第 9 集回收" }],
    units: NONE,
    desc: (<>
      <p>C 組建議「刪掉小美的疤」，因為它看不到導演的決定：任務說明裡<b>沒寫</b>。</p>
      <p>主代理還看得到歷史，所以能發現這個矛盾。但要記得：子代理的判斷只基於它拿到的資訊。</p>
      <p>另外兩個成本：報告是摘要，細節要再查得回頭讀；多開幾個完整迴圈，<b>總 token 用量更高</b>。</p>
    </>),
  },
  {
    title: "小任務：自己做比較快",
    main: [
      ...BASE.slice(0, 2),
      { ...hot(b("ask2", "user", 0.5, "第 7 場的疤是哪一句？", "第 7 場裡提到疤的是哪一句？")), noLabel: true },
      { ...hot(b("grep", "tool_result", 0.5, "Grep 結果", "scene_07.fountain:23  小美把袖子往下拉，遮住左手。")), noLabel: true },
      hot(b("ans", "assistant", 0.5, "問 → Grep → 答，三小塊", "第 7 場第 23 行。")),
    ],
    units: NONE,
    desc: (<>
      <p>不是每件事都該派出去。查一句台詞，Grep 一次就好，結果本來就很小。</p>
      <p>派子代理要付出：寫任務說明、啟動新迴圈、等它跑完、可能遺漏背景。</p>
      <p>判斷原則：<b>要讀的東西很多、要帶回來的結論很少</b>，才值得派。</p>
    </>),
  },
];
