import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "最後一章反過來：用大約 290 行 Python，把前面的機制**組回一個能真的改劇本的 Agent**，也就是 `claude_film.py`。",
    "它不是產品，是骨架。Claude Code 的每個功能，落到程式碼裡都只是迴圈上的一個插入點；第 07 層的 skills 刻意留空，當作練習。",
  ],
  eq: "claude_film.py = 一個 while 迴圈 + 每章一個插入點",
  eqNotes: [
    "做產品時可改用 Claude Agent SDK：迴圈、壓縮、權限、子代理都內建，只剩編劇領域要自己寫。",
  ],
  keys: [
    ["run_agent", "第 01 章的迴圈：串流呼叫模型、執行 tool_use、把結果放回 messages。"],
    ["pre_tool_use", "執行前檢查：已播出的第 1 集直接拒絕，其他修改先問導演。"],
    ["review_script", "工具內部再跑一次 `run_agent`：全新的 messages、只有唯讀工具。"],
    ["remember", "把編劇確認的事寫進 `memory/notes.md`，下次開場一起載入。"],
  ],
  predict: {
    q: "把「第 1 集已播出，不可修改」的檢查從 `pre_tool_use` 搬到 system prompt 裡，會失去什麼？",
    a: [
      "確定性的保證：模型通常照做，但不一定",
      "什麼都不會失去，模型一定遵守 system prompt",
      "只是多花一點 token，行為完全相同",
    ],
    ok: 0,
  },
  why: "`pre_tool_use` 是程式：`edit_scene` 碰到第 1 集就直接回 `is_error`，模型怎麼想都改不了。寫進 system prompt 只是 context 裡的一句話，通常有效，但不是保證（第 05 章）。後果嚴重的規則，就該放在程式裡。",
  fig: "抽屜塔：一層托盤 = 一章的程式碼，托盤高度 ∝ 行數",
};
