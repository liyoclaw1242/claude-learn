import type { Msg, Step } from "../steps";
import { CARD_Z, TOK_PER_UNIT, type Station } from "./view";

/** 讀數錶的滿刻度（token） */
export const DIAL_FULL = 8000;

export type Action = "idle" | "feed" | "read" | "reply" | "stamp" | "result" | "deliver";

export interface Pose {
  station: Station;
  action: Action;
  /** 到目前為止的第幾次 API 呼叫 */
  call: number;
  /** 最近一次呼叫時讀進模型的 token 數 */
  readTokens: number;
  /** 模型已回覆 end_turn */
  done: boolean;
}

export const tokensOf = (msgs: Msg[]) => msgs.reduce((sum, m) => sum + m.tok * 10, 0);
export const thicknessOf = (m: Msg) => (m.tok * 10) / TOK_PER_UNIT;

/** 每張卡的底面高度與厚度（相對於滑台） */
export function stackOf(msgs: Msg[]) {
  let z = CARD_Z;
  return msgs.map((m) => {
    const t = thicknessOf(m);
    const card = { z, t };
    z += t;
    return card;
  });
}

export const deckTop = (msgs: Msg[]) => CARD_Z + msgs.reduce((sum, m) => sum + thicknessOf(m), 0);

/** 把第 01 章的步驟資料翻譯成機器狀態 */
export function poseOf(steps: Step[], index: number): Pose {
  let call = 0;
  let readTokens = 0;
  let station: Station = "home";
  for (let i = 0; i <= index; i++) {
    const fly = steps[i].fly;
    if (fly?.from === "tower") { call++; readTokens = tokensOf(steps[i].msgs); }
  }
  const step = steps[index];
  const fly = step.fly;
  let action: Action = "idle";
  if (!fly) action = "idle";
  else if (fly.from === "user") { action = "deliver"; station = "home"; }
  else if (fly.from === "tower") { action = "read"; station = "dock"; }
  else if (fly.from === "model") { action = "reply"; station = "dock"; }
  else if (fly.from === "harness" && fly.to === "user") { action = "idle"; station = "home"; }
  else if (fly.from === "harness") { action = "stamp"; station = fly.to as Station; }
  else { action = "result"; station = fly.from as Station; }
  const last = step.msgs[step.msgs.length - 1];
  const done = last.kind === "assistant" && last.text.includes("end_turn");
  return { station, action, call, readTokens, done };
}

const STATION_NAME: Record<Station, string> = { dock: "模型", Read: "Read", Edit: "Edit", Bash: "Bash", home: "使用者" };

export function readoutOf(pose: Pose, msgs: Msg[], moving: boolean) {
  const tok = tokensOf(msgs).toLocaleString();
  if (moving) return `前往 ${STATION_NAME[pose.station]} · ${msgs.length} 張卡`;
  const head = pose.call ? `第 ${pose.call} 次呼叫` : "尚未呼叫";
  const tail =
    pose.action === "read" ? `讀入 ${pose.readTokens.toLocaleString()} tok`
    : pose.action === "reply" ? (pose.done ? "end_turn" : "tool_use")
    : pose.action === "stamp" ? `執行 ${pose.station}`
    : `${tok} tok`;
  return `${head} · ${msgs.length} 張卡 · ${tail}`;
}
