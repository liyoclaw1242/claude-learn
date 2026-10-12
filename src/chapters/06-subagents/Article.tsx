import { Link } from "react-router-dom";

const SUBAGENT_PY = `import anthropic
from concurrent.futures import ThreadPoolExecutor

client = anthropic.Anthropic()

def agent_loop(system, tools, messages):
    """第 01 章的迴圈，原封不動"""
    while True:
        response = client.messages.create(
            model="claude-opus-5-5", max_tokens=16000,
            system=system, tools=tools, messages=messages,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return response
        messages.append({"role": "user", "content": run_tools(response.content)})

def run_subagent(task: str) -> str:
    final = agent_loop(
        system="你是劇本審稿專員，只能讀、不能改。最後用條列回報：問題 / 場次 / 建議。",
        tools=READ_ONLY_TOOLS,                          # 工具子集：只有 read_scene、grep
        messages=[{"role": "user", "content": task}],   # 全新的對話：只有任務說明
    )
    # 子代理的整段對話到此丟棄，只有最後的文字回到主代理
    return "".join(b.text for b in final.content if b.type == "text")

# 對主代理來說，它只是一個普通的工具
DISPATCH_TOOL = {
    "name": "dispatch_reviewer",
    "description": "派一位獨立的審稿專員去讀大量劇本，只帶回結論。"
                   "它看不到目前的對話，所以 task 必須寫清楚背景、範圍與回報格式。",
    "input_schema": {
        "type": "object",
        "properties": {"task": {"type": "string"}},
        "required": ["task"],
    },
}

def run_tools(content):
    calls = [b for b in content if b.type == "tool_use"]
    # 同一則回覆裡的多個呼叫可以平行跑：三組同時開工
    with ThreadPoolExecutor() as pool:
        outputs = list(pool.map(execute_tool, calls))
    return [
        {"type": "tool_result", "tool_use_id": c.id, "content": out}
        for c, out in zip(calls, outputs)
    ]

def execute_tool(call):
    if call.name == "dispatch_reviewer":
        return run_subagent(call.input["task"])
    ...  # read_scene、grep 等一般工具`;

const AGENT_MD = `---
name: continuity-checker
description: 劇本一致性審稿。需要檢查角色設定、時間線、道具前後矛盾時使用。
tools: Read, Grep, Glob
model: opus
---

你是一位資深場記，負責找出劇本中的前後矛盾。
只讀不改。每個問題都要附上場次與行號，並區分「確定矛盾」與「可能矛盾」。
回報格式：
- 問題：
- 出現位置：
- 衝突的設定來源：
- 建議：`;

export default function Article() {
  return (
    <article>
      <h1>06 · Subagents：第二攝製組</h1>

      <p>第 02 章最後提過一招：把需要讀全文的工作交給<b>另一個視窗</b>。這章拆開來看它到底是什麼。</p>
      <blockquote>
        子代理不是新的魔法，它是<b>一個工具</b>：<br />
        工具的實作剛好是另一個完整的 agent loop，有自己全新的 context window。<br />
        主代理派出去的是一段文字，收回來的也是一段文字。
      </blockquote>

      <h2>第 0 層：從主代理的角度看</h2>
      <p>在 Claude Code 裡，子代理是透過 <b>Agent 工具</b>啟動的。對主代理的模型來說，它跟 Read、Grep 沒有差別：</p>
      <ol>
        <li>模型寫出一個 <code>tool_use</code>，參數是一段<b>任務說明</b>。</li>
        <li>Harness 收到後，不是去讀檔，而是開一個<b>新的迴圈</b>：新的 system prompt、新的 messages、可能不同的工具清單。</li>
        <li>子迴圈跑到 <code>end_turn</code>，它的<b>最後一則回覆</b>變成主代理那邊的 <code>tool_result</code>。</li>
        <li>子迴圈的 messages 隨即丟棄。</li>
      </ol>
      <p>用第 01 章的程式碼寫，大概是這樣：</p>
      <pre>{SUBAGENT_PY}</pre>
      <p>整段程式的新東西只有 <code>run_subagent</code>：<b>呼叫同一個迴圈，但給它一份全新的 messages</b>。</p>

      <h2>第 1 層：三個好處</h2>
      <table>
        <thead><tr><th>好處</th><th>機制</th><th>劇本場景</th></tr></thead>
        <tbody>
          <tr><td><b>Context 隔離</b></td><td>大量閱讀發生在子視窗，主視窗只收到結論</td><td>讀完 60 場、只帶回 5 個問題</td></tr>
          <tr><td><b>平行</b></td><td>同一則回覆裡多個 Agent 呼叫可以同時跑</td><td>一致性、節奏、角色弧線三組同時審</td></tr>
          <tr><td><b>專門化</b></td><td>每個子代理可以有自己的 system prompt、工具子集、模型</td><td>審稿專員只拿唯讀工具，不可能誤改劇本</td></tr>
        </tbody>
      </table>

      <h2>第 2 層：三個代價</h2>
      <ul>
        <li><b>看不到主對話。</b> 子代理只知道任務說明裡寫的東西。主對話裡導演說過的話、已經否決的方案，沒寫進去就不存在。
          圖中第 8 步的 C 組就是這樣，建議刪掉一個導演已經決定要回收的伏筆。</li>
        <li><b>報告是有損摘要。</b> 子代理讀過的細節不會回來。主代理要追問細節，只能自己再讀，或再派一次。</li>
        <li><b>更花錢。</b> 每個子代理都是完整的迴圈，各自讀全文。省的是<b>主視窗的空間</b>，不是總 token 數。</li>
      </ul>
      <p>所以判斷原則很簡單：<b>要讀的很多、要帶回的很少</b>，才值得派。查一句台詞直接 Grep 就好。</p>

      <h2>第 3 層：自訂子代理</h2>
      <p>Claude Code 允許你用 Markdown 檔定義自己的子代理：專案用的放 <code>.claude/agents/</code>（可進版控），個人用的放 <code>~/.claude/agents/</code>。</p>
      <pre>{AGENT_MD}</pre>
      <table>
        <thead><tr><th>欄位</th><th>作用</th></tr></thead>
        <tbody>
          <tr><td><code>name</code></td><td>識別名稱（必填）</td></tr>
          <tr><td><code>description</code></td><td><b>主代理靠這段決定什麼時候派它</b>（必填）。它會出現在主代理的工具說明裡，所以也要簡短。</td></tr>
          <tr><td><code>tools</code></td><td>允許的工具清單；省略則繼承全部。審稿類的子代理應該只給唯讀工具。</td></tr>
          <tr><td><code>model</code></td><td>指定模型，或 <code>inherit</code> 跟主對話相同</td></tr>
          <tr><td>內文</td><td>這個子代理的 system prompt，<b>只在它被派出時才載入</b></td></tr>
        </tbody>
      </table>
      <p>還有更多選用欄位（例如限制回合數、權限模式），細節以官方文件為準。注意 <code>description</code> 和內文的分工：
        description 每次都在主代理的 context 裡（固定開銷），內文只有派出時才付費。這跟第 03 章「Bible 寫目錄、細節按需讀」是同一個道理。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>Subagent 概念</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>子代理</td><td><b>第二攝製組</b>（second unit）。主組拍主戲，二組去外景拍空景、動作戲。</td></tr>
          <tr><td>任務說明</td><td><b>二組的工作單</b>。二組導演沒參加主組的會議，工作單沒寫的就不知道。</td></tr>
          <tr><td>獨立 context</td><td>二組有自己的片場、自己的場記本。</td></tr>
          <tr><td>最終報告</td><td>交回來的<b>素材與拍攝報告</b>，不是二組整天的工作紀錄。</td></tr>
          <tr><td>平行</td><td>三個組同一天在三個地點開拍。</td></tr>
          <tr><td>工具子集</td><td>二組只領到需要的器材；審稿專員只拿到「讀」的權限。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>「冷眼讀者」是子代理最好的用途。</b> 主對話改稿兩小時，模型已經被改稿過程「汙染」：它知道每一場為什麼改，會替劇本補上劇本裡沒寫的東西。
          一個只拿到劇本、什麼都不知道的子代理，才像第一次看劇本的觀眾或評審。這種隔離反而是優點。</li>
        <li><b>審稿類子代理一律唯讀。</b> 用工具子集保證它不會改稿，修改權只留在主代理（和你的批准）手上（第 05 章）。</li>
        <li><b>報告格式要結構化。</b> 問題 / 場次 / 行號 / 衝突來源 / 建議。結構化的報告主代理才能逐條處理，也方便呈現在 UI 上。</li>
        <li><b>任務說明要帶上「已決定的事」。</b> Claude Film 派子代理時，應自動附上導演意見與已確認決策（例如從 Bible 的決策紀錄取出），避免第 8 步的錯誤。</li>
        <li><b>分場平行寫初稿要小心。</b> 平行寫作很快，但每組看不到彼此，語氣、角色口吻容易不一致。比較穩的做法是平行寫、<b>由一個代理統一修潤</b>，或只把平行用在分析而不是創作。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>子代理讀了整部劇本，為什麼主代理的 context 用量幾乎沒變？讀過的內容去哪了？</li>
        <li>派三個子代理去做三項檢查，總 token 用量比主代理自己做多還是少？那為什麼還要派？</li>
        <li>你要設計一個「角色口吻檢查」子代理。它的 <code>description</code>、<code>tools</code>、任務說明各應該寫什麼？</li>
      </ul>
      <p><Link to="/05-permissions-hooks">← 05 Permissions 與 Hooks</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/07-skills-mcp">07 Skills / Slash Commands / MCP →</Link></p>
    </article>
  );
}
