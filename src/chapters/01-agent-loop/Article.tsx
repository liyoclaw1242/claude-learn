import { Link } from "react-router-dom";

const TOOL_USE_JSON = `{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "我先讀一下這場戲。" },
    { "type": "tool_use", "id": "toolu_01", "name": "Read",
      "input": { "file_path": "scenes/scene_03.fountain" } }
  ],
  "stop_reason": "tool_use"     ← 模型停下來，等待結果
}`;

const TOOL_RESULT_JSON = `{
  "role": "user",
  "content": [
    { "type": "tool_result", "tool_use_id": "toolu_01",   ← 必須對上 id
      "content": "INT. 咖啡店 - 夜\\n小美推門進來……" }
  ]
}`;

const LOOP_PY = `import anthropic

client = anthropic.Anthropic()

tools = [{
    "name": "read_file",
    "description": "讀取一個劇本檔案的完整內容",
    "input_schema": {
        "type": "object",
        "properties": {"path": {"type": "string"}},
        "required": ["path"],
    },
}]

def execute_tool(name, args):
    if name == "read_file":
        return open(args["path"], encoding="utf-8").read()

messages = [{"role": "user", "content": input("> ")}]

while True:                                         # ← 這個 while 就是「Agent」
    response = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=16000,
        system="你是一位資深劇本醫生。",
        tools=tools,
        messages=messages,                          # ← 每次都送整份歷史
    )
    messages.append({"role": "assistant", "content": response.content})

    if response.stop_reason != "tool_use":          # end_turn：模型說它做完了
        break

    results = []
    for block in response.content:
        if block.type == "tool_use":
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": execute_tool(block.name, block.input),
            })
    messages.append({"role": "user", "content": results})

print(next(b.text for b in response.content if b.type == "text"))`;

export default function Article() {
  return (
    <article>
      <h1>01 · Agent Loop：模型只是一個函數，迴圈才是 Agent</h1>

      <p>上面的讀卡機先跑完一輪再讀這裡。這章要建立整個系列最重要的一個心智模型：</p>
      <blockquote>
        <b>Claude（模型）沒有手、沒有記憶、不會主動做任何事。</b><br />
        它是一個純函數：<code>f(system, tools, messages) → 下一則 assistant 訊息</code>。<br />
        Claude Code 是包在這個函數外面的 <b>Harness（外殼程式）</b>，用一個 <code>while</code> 迴圈把它變成 Agent。
      </blockquote>

      <h2>第 0 層：模型是什麼</h2>
      <p>大型語言模型做的事只有一件：給一段文字（實際上是 token 序列），預測接下來的文字。
        所有「聊天」「思考」「使用工具」都是建立在這之上的<b>格式約定</b>。</p>
      <p>它是 <b>stateless（無狀態）</b> 的。API 伺服器不會幫你記得上一輪說了什麼 ——
        你每次呼叫都要把<b>整份對話從頭送一次</b>。上面那台讀卡機裡，滑台載著的整疊卡就是這份對話：每呼叫一次，滑台就把整疊送到模型機櫃下壓讀一次，機櫃頂上的錶顯示這次讀進了多少 token。</p>
      <p>這帶來兩個工程後果：</p>
      <ul>
        <li><b>成本與延遲隨對話長度增長</b> —— 所以有 prompt caching（重複的前綴不用重算）。</li>
        <li><b>上下文有上限</b>（context window）—— 塞滿了就得壓縮或丟棄，這是第 02 章的主題。</li>
      </ul>

      <h2>第 1 層：Messages API 的三個輸入</h2>
      <table>
        <thead><tr><th>欄位</th><th>內容</th><th>Claude Code 裡對應什麼</th></tr></thead>
        <tbody>
          <tr><td><code>system</code></td><td>系統提示：身份、規則、環境資訊</td><td>內建的長篇 system prompt + 你的 CLAUDE.md + 工作目錄、git 狀態、日期等</td></tr>
          <tr><td><code>tools</code></td><td>工具清單：名稱 + 說明 + JSON Schema</td><td>Read、Edit、Write、Bash、Grep、Glob、WebFetch、Agent（子代理）… 以及 MCP 帶進來的工具</td></tr>
          <tr><td><code>messages</code></td><td>user / assistant 交替的對話紀錄</td><td>你打的字、Claude 的回覆、每一次工具呼叫與結果</td></tr>
        </tbody>
      </table>
      <p>注意 <code>tools</code> 只是<b>文字描述</b>。模型從來沒有「執行」過任何東西 —— 它只是讀了說明，
        然後在輸出裡寫下「我想呼叫 Read，參數是 {"{path: ...}"}」。</p>

      <h2>第 2 層：Tool Use 的往返協定</h2>
      <p>模型的一則回覆（<code>content</code>）是一個 block 陣列，可能混合：</p>
      <pre>{TOOL_USE_JSON}</pre>
      <p>Harness 看到 <code>stop_reason == "tool_use"</code>，就去真的執行工具，然後把結果包成<b>下一則 user 訊息</b>送回去：</p>
      <pre>{TOOL_RESULT_JSON}</pre>
      <p>關鍵細節：</p>
      <ul>
        <li>工具結果是以 <b>user 角色</b>回傳的 —— 從模型的角度，「世界」對它說話的唯一管道就是 user 訊息。</li>
        <li>一則回覆可以有<b>多個</b> <code>tool_use</code>（平行呼叫），結果要在<b>同一則</b> user 訊息裡全部回傳。</li>
        <li>工具失敗不是丟掉，而是回傳 <code>is_error: true</code> 的 tool_result —— 讓模型自己看到錯誤並修正。這是 Agent「會自我修復」的來源。</li>
      </ul>

      <h2>第 3 層：迴圈本體（約 20 行）</h2>
      <p>把上面接起來，就是所有 coding agent 的骨架。這是用官方 Python SDK 寫的最小可跑版本：</p>
      <pre>{LOOP_PY}</pre>
      <p>這段 code 已經是一個能自己決定「要讀哪些檔案、讀幾次」的 Agent 了。
        <b>決策權在模型，執行權在 Harness</b> —— 這個分工是整個系列的主軸。</p>

      <h2>那 Claude Code 多做了什麼？</h2>
      <p>它的核心就是上面這個迴圈。其餘幾乎所有功能，都是在這個迴圈的某個<b>插入點</b>上加料：</p>
      <table>
        <thead><tr><th>插入點</th><th>Claude Code 的機制</th><th>章節</th></tr></thead>
        <tbody>
          <tr><td>呼叫前：組 <code>system</code></td><td>CLAUDE.md、環境資訊、skills 清單、memory</td><td>03 / 07 / 08</td></tr>
          <tr><td>呼叫前：組 <code>tools</code></td><td>內建工具 + MCP 工具 + 延遲載入</td><td>04 / 07</td></tr>
          <tr><td>呼叫前：整理 <code>messages</code></td><td>上下文快滿時自動壓縮（compaction）</td><td>02</td></tr>
          <tr><td>呼叫中</td><td>串流輸出到終端機（你看到字一個個出現）</td><td>—</td></tr>
          <tr><td>執行工具前</td><td>權限檢查（允許/詢問/拒絕）、PreToolUse hooks</td><td>05</td></tr>
          <tr><td>執行工具</td><td>某些「工具」本身就是另一個迴圈（Agent 工具 = 子代理）</td><td>06</td></tr>
          <tr><td>執行工具後</td><td>PostToolUse hooks、結果截斷、塞入提醒</td><td>05</td></tr>
          <tr><td>迴圈結束</td><td>Stop hooks、等待下一次使用者輸入</td><td>05</td></tr>
        </tbody>
      </table>

      <h2>影視類比（給 Claude Film 用的心智模型）</h2>
      <table>
        <thead><tr><th>Claude Code</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td className="tag-model">Model</td><td><b>關在密室裡的天才編劇</b>。看不到外面、不記得昨天，只能讀你塞進門縫的那疊紙，然後寫一張紙條遞出來。</td></tr>
          <tr><td className="tag-harness">Harness</td><td><b>副導 / 場務</b>。看紙條：「去把第三場拿來」→ 跑去拿、影印、附在那疊紙後面再塞回去。也負責判斷「這個要求要不要先問導演」。</td></tr>
          <tr><td className="tag-ctx">messages[]</td><td><b>場記本（continuity log）</b>。編劇的唯一記憶。每次都要整本塞進去 —— 場記本太厚，編劇就讀不完（context window）。</td></tr>
          <tr><td className="tag-tool">Tools</td><td><b>道具組、資料組、剪接室</b>。真正接觸實體世界的部門。</td></tr>
          <tr><td className="tag-user">User</td><td><b>導演 / 製片</b>。下指令、在關鍵處批准。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>你要設計的主體不是模型，是 Harness。</b> Claude Film 的價值 = 給編劇用的工具集 + 規則注入 + 權限設計 + 上下文管理策略。</li>
        <li><b>工具的粒度決定 Agent 的能力邊界。</b>「讀整份劇本」vs「讀第 N 場」vs「查某角色所有出場」—— 不同設計，模型的行為會完全不同（第 04 章）。</li>
        <li><b>劇本是長文本，context 管理會是 Claude Film 的第一個硬問題。</b> 一部 120 頁的電影劇本約幾萬 token，連續劇整季更多 —— 這正是第 02 章要解的。</li>
        <li><b>tool_result 是「世界的回饋」。</b> 例如一個「格式檢查」工具回報「第 12 場缺少場景標頭」，模型就會自己去修 —— 這是 Agent 迭代改稿的引擎。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>為什麼工具結果用 <code>role: "user"</code> 回傳，而不是 assistant？</li>
        <li>如果 Harness 執行完工具但<b>忘了</b>把 tool_result 放回 messages，下一次呼叫會怎樣？</li>
        <li>模型有沒有可能「直接修改檔案」而不經過 Harness？（答案決定了 Claude Film 的安全邊界在哪裡。）</li>
      </ul>
      <p><Link to="/">← 回目錄</Link>　·　<Link to="/02-context-window">02 Context Window →</Link></p>
    </article>
  );
}
