import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "模型只能**提出**工具呼叫，真正**執行**的是 Harness。所以 Harness 可以在兩者之間放關卡。",
    "這些關卡是程式，不是 prompt，模型說服不了它們。CLAUDE.md 影響模型想做什麼，權限與 hooks 決定它能做什麼。",
  ],
  eq: "`tool_use` → PreToolUse → 權限（deny → ask → allow）→ 執行 → PostToolUse → `tool_result`",
  eqNotes: [
    "被擋不是終點：會變成一則 `is_error` 的 tool_result，模型讀到理由再換做法。",
  ],
  keys: [
    ["權限規則", "`settings.json` 裡的 allow / ask / deny，例如 `Edit(/season1/**)`。"],
    ["permission mode", "整體鬆緊度：`default`、`acceptEdits`、`plan`、`bypassPermissions`…"],
    ["hook", "Harness 在固定時機執行的你自己的程式。`exit 2` = 擋下，stderr 交給模型。"],
    ["Stop hook", "模型想收工時觸發，`exit 2` 會要求它繼續工作。"],
  ],
  predict: {
    q: "設定裡有 `deny: Bash(git push *)`，也有寫得更精確的 `allow: Bash(git push origin dev)`。模型要執行 `git push origin dev`，結果是？",
    a: [
      "放行：越精確的規則越優先",
      "擋下：deny 先比對，命中就算數",
      "停下來問你，因為兩條規則衝突",
    ],
    ok: 1,
  },
  why: "比對順序固定是 **deny → ask → allow**，第一個命中的決定結果，跟哪條寫得比較精確無關。所以 allow 永遠沒辦法在 deny 上開例外。被擋下的呼叫會以錯誤 tool_result 回到模型手上。",
  fig: "分揀輸送線：每張工具請求卡都要依序通過關卡",
};
