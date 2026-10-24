import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "Claude（模型）沒有手、沒有記憶，它只是一個純函數：`f(system, tools, messages) → 下一則 assistant 訊息`。",
    "Claude Code 是包在外面的 **Harness**，用一個 `while` 迴圈把它變成 Agent：模型提出要求，Harness 去執行，再把結果塞回對話。",
  ],
  eq: "回合 = 送出整疊 messages → 模型回 `tool_use` 或 `end_turn`",
  eqNotes: [
    "`tool_use`：Harness 執行工具，結果包成 `tool_result` 接在後面，再呼叫一次。",
    "`end_turn`：跳出迴圈，等你下一句話。",
  ],
  keys: [
    ["無狀態", "API 不記得上一輪，每次呼叫都要把整份對話從頭送一次。"],
    ["Harness", "外殼程式：組請求、執行工具、檢查權限。執行權在它手上。"],
    ["tool_use", "模型輸出的結構化請求：工具名 + 參數。是請求，不是動作。"],
    ["tool_result", "工具結果，以 **user 角色**回到對話，用 `tool_use_id` 對上請求。"],
  ],
  predict: {
    q: "你說「把 scene_03 的小美改成小雨」。模型先 Read、再 Edit、最後回報完成。這一個回合裡，模型被呼叫了幾次？",
    a: ["1 次：你只說了一句話", "3 次：每個工具結果回來都要再呼叫一次", "2 次：Read 一次、Edit 一次"],
    ok: 1,
  },
  why: "模型每次只能回一則訊息，然後停下來等。Read 結果回來要再呼叫一次才能決定 Edit，Edit 結果回來還要再呼叫一次才會說「完成」並 `end_turn`。所以是 **3 次模型呼叫 + 2 次工具執行**，而且每次都是整疊重送。",
  fig: "讀卡機：滑台每把整疊卡送進機櫃一次 = 一次 API 呼叫",
};
