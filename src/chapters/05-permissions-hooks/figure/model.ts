import type { Step } from "../steps";
import { BEFORE_GATE, CARD_TOP, PROBE_REST, TOOL_REST, X } from "./view";

/** 一步之內，輸送線依序做的動作 */
export type Action =
  | { t: "move"; x: number; label: string }
  | { t: "probe"; which: "pre" | "post" }
  | { t: "barrier" }
  | { t: "ask" }
  | { t: "stamp" }
  | { t: "result"; kind: "ok" | "error" | "warn" }
  | { t: "end" }
  | { t: "latch" };

export type CardMode = "request" | "ok" | "error" | "warn";

export interface Plan {
  actions: Action[];
  /** 這一步的關卡有沒有裝上（第 1 步沒有） */
  armed: boolean;
  stopArmed: boolean;
  /** 閘板一開始是否關閉：deny、ask、allow */
  closed: [boolean, boolean, boolean];
  mode: number;
  verdict: string;
}

const MODES = ["default", "acceptEdits", "plan", "auto", "dontAsk", "bypassPermissions"];

export function planOf(step: Step): Plan {
  const st = step.state ?? {};
  const armed = step.gates.length > 0;
  const mode = Math.max(0, MODES.indexOf(step.mode ?? "default"));
  const back: Action = { t: "move", x: X.model, label: "回到模型" };
  const toTool: Action[] = [{ t: "move", x: X.tool, label: `前往 ${step.tool.name}` }, { t: "stamp" }];
  const closed: [boolean, boolean, boolean] = [st.rules === "block", st.rules === "ask", false];

  if (!armed) {
    return { actions: [...toTool, { t: "result", kind: "ok" }, back], armed, stopArmed: false, closed, mode, verdict: "直接執行 · 沒有任何檢查" };
  }
  if (step.focus === "stop") {
    return { actions: [{ t: "end" }, { t: "latch" }], armed, stopArmed: true, closed, mode, verdict: "Stop hook exit 2 · 不准收工" };
  }
  const actions: Action[] = [{ t: "move", x: X.pre, label: "PreToolUse 檢查" }, { t: "probe", which: "pre" }];
  let verdict: string;
  if (st.pre === "block") {
    actions.push({ t: "barrier" }, { t: "result", kind: "error" }, back);
    verdict = "PreToolUse exit 2 · 擋下";
  } else if (st.rules === "block") {
    actions.push({ t: "move", x: X.deny - BEFORE_GATE, label: "權限規則" }, { t: "result", kind: "error" }, back);
    verdict = "命中 deny · is_error 回到模型";
  } else {
    if (st.rules === "ask") actions.push({ t: "move", x: X.ask - BEFORE_GATE, label: "權限規則" }, { t: "ask" });
    actions.push(...toTool, { t: "move", x: X.post, label: "PostToolUse 驗收" }, { t: "probe", which: "post" });
    const warn = st.post === "warn";
    actions.push({ t: "result", kind: warn ? "warn" : "ok" }, back);
    verdict = warn ? "PostToolUse exit 2 · 回饋給模型" : st.rules === "ask" ? "導演批准 · 已執行" : "放行 · tool_result 回到模型";
  }
  return { actions, armed, stopArmed: Boolean(step.gates.includes("stop")), closed, mode, verdict };
}

/** 動畫狀態：全部由 loop 逐幀推進 */
export interface Machine {
  x: number;
  pre: number;
  post: number;
  tool: number;
  barrier: number;
  /** 閘板打開的比例：deny、ask、allow（1 = 完全收進機殼） */
  open: [number, number, number];
  button: number;
  deskLamp: boolean;
  card: CardMode;
  modelLamp: boolean;
  /** 門閂收起的比例（1 = 打開） */
  bolt: number;
  mode: number;
  /** 持續目標：擋板升起、閘板打開、門閂收起 */
  want: { barrier: number; open: [number, number, number]; bolt: number };
  ai: number;
  at: number;
  phase: number;
  label: string;
}

export function freshMachine(plan: Plan): Machine {
  return {
    x: X.model, pre: PROBE_REST, post: PROBE_REST, tool: TOOL_REST, barrier: 0,
    open: plan.closed.map((c) => (c ? 0 : 1)) as [number, number, number],
    button: 0, deskLamp: false, card: "request", modelLamp: false, bolt: 1, mode: plan.mode,
    want: { barrier: 0, open: plan.closed.map((c) => (c ? 0 : 1)) as [number, number, number], bolt: 1 },
    ai: 0, at: 0, phase: 0, label: "",
  };
}

/** 換步：重頭跑新腳本，位置類狀態保留（從目前位置緩動過去） */
export function restart(m: Machine, plan: Plan) {
  m.ai = 0; m.at = 0; m.phase = 0; m.label = "";
  m.card = "request"; m.deskLamp = false; m.modelLamp = false; m.button = 0;
  m.want = { barrier: 0, open: plan.closed.map((c) => (c ? 0 : 1)) as [number, number, number], bolt: 1 };
}

const ease = (current: number, target: number, dt: number, seconds: number, calm: boolean) => {
  if (calm) return target;
  const next = current + (target - current) * (1 - Math.exp(-dt / seconds));
  return Math.abs(target - next) < 1e-2 ? target : next;
};

/** 推進目前的動作；回傳 true 表示整份腳本還沒跑完 */
export function advance(m: Machine, plan: Plan, dt: number, calm: boolean): boolean {
  // 不屬於腳本的持續狀態：模式旋鈕、閘板（依這一步的設定）
  m.mode = ease(m.mode, plan.mode, dt, 0.35, calm);
  m.barrier = ease(m.barrier, m.want.barrier, dt, 0.18, calm);
  m.bolt = ease(m.bolt, m.want.bolt, dt, 0.2, calm);
  for (const i of [0, 1, 2] as const) m.open[i] = ease(m.open[i], m.want.open[i], dt, 0.2, calm);
  const settled = m.mode === plan.mode && m.barrier === m.want.barrier && m.bolt === m.want.bolt && m.open.every((o, i) => o === m.want.open[i]);
  const action = plan.actions[m.ai];
  if (!action) return !settled;
  m.at += calm ? 99 : dt;
  let done = false;
  switch (action.t) {
    case "move":
      m.label = action.label;
      m.x = ease(m.x, action.x, dt, 0.3, calm);
      done = m.x === action.x;
      break;
    case "probe": {
      // 探針落到卡面、停一下、再抬起
      const key = action.which;
      const down = m.phase === 0;
      m[key] = ease(m[key], down ? CARD_TOP : PROBE_REST, dt, 0.14, calm);
      if (down && m[key] === CARD_TOP) m.phase = 1;
      done = !down && m[key] === PROBE_REST;
      break;
    }
    case "barrier":
      m.want.barrier = 1;
      done = m.barrier === 1;
      break;
    case "ask":
      // 燈亮 → 等導演 → 按下按鈕 → ask 閘板打開
      m.deskLamp = true;
      m.label = "等待導演批准";
      if (m.at > 0.7 || calm) m.button = ease(m.button, m.at > 1.1 || calm ? 0 : 1, dt, 0.08, calm);
      if (m.at > 1.1 || calm) m.want.open[1] = 1;
      done = m.open[1] === 1 && m.button === 0;
      if (done) m.deskLamp = false;
      break;
    case "stamp": {
      const down = m.phase === 0;
      m.tool = ease(m.tool, down ? CARD_TOP : TOOL_REST, dt, 0.14, calm);
      if (down && m.tool === CARD_TOP) m.phase = 1;
      done = !down && m.tool === TOOL_REST;
      break;
    }
    case "result":
      m.card = action.kind;
      done = m.at > 0.35 || calm;
      break;
    case "end":
      m.modelLamp = true;
      m.label = "模型想收工";
      done = m.at > 0.5 || calm;
      break;
    case "latch":
      m.want.bolt = 0;
      done = m.bolt === 0;
      break;
  }
  if (done) { m.ai++; m.at = 0; m.phase = 0; }
  return true;
}

/** 直接跑到這一步的結尾（首次掛載、深連結） */
export function settle(m: Machine, plan: Plan) {
  for (let guard = 0; guard < 200 && advance(m, plan, 1, true); guard++);
  m.mode = plan.mode;
}
