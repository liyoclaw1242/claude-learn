import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "前八章各拆了 Claude Code 的一個機制，這章把它們拼回一張圖：如果要做給編劇用的 **Claude Film**，它長什麼樣子？這是設計提案，還沒被驗證過。",
    "迴圈只有二十行，不是重點；真正決定好不好用的，是**掛在迴圈上的東西**。以 Claude Agent SDK 為底，Claude Film 的價值集中在劇本工具、規則內容、記憶結構。",
  ],
  eq: "Claude Film = SDK 現成的 Harness + 自建的劇本工具、規則內容、記憶結構",
  eqNotes: [
    "迴圈、壓縮、權限、hooks、子代理、技能、MCP，SDK 都已經有了。",
    "先用 Claude Code 本身當原型，驗證設計再寫程式。",
  ],
  keys: [
    ["Claude Agent SDK", "Claude Code 背後的 Harness，以函式庫的形式提供。"],
    ["劇本工具", "`get_outline`、`read_scene`、`find_mentions`、`edit_scene`：讓劇本可定址。"],
    ["建議 vs. 保證", "寫在 CLAUDE.md 是建議；後果嚴重的規則要寫成 hook。"],
    ["回寫", "每次改稿後更新 bible/；記憶的難點是回寫，不是儲存。"],
  ],
  predict: {
    q: "「把第 3 集結尾改成開放式」：載入技能、讀第 42 場、派審稿人，這個順序是誰決定的？",
    a: [
      "Harness 裡寫死的處理管線",
      "模型在迴圈裡一步步決定",
      "Claude Film 依請求類型套用的固定流程",
    ],
    ok: 1,
  },
  why: "順序**不是寫死的**：圖中的滑台回到 Agent Loop 很多次，每次都是一輪「呼叫模型 → 執行工具」。換一個請求，路徑就不一樣。Harness 只保證兩件事：模型拿得到好用的工具，不該發生的事一定會被擋下。",
  fig: "總成工作台：各章機器排在導軌後，底板刻線標出 SDK 現成與 Film 自建",
};
