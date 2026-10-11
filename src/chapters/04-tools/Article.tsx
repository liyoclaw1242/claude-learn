import { Link } from "react-router-dom";

const TOOLS_PY = `tools = [
    {
        "name": "find_mentions",
        "description": (
            "找出某個角色或關鍵字出現在哪幾場。回傳場次編號與命中的那一行，"
            "不回傳整場內容。想知道『某人在哪裡出現』時優先用這個，"
            "不要為此讀整份劇本。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "角色名或關鍵字，例如：小美"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "edit_scene",
        "description": (
            "把指定場次中的 old_text 精確取代為 new_text。"
            "old_text 必須在該場中只出現一次；若出現多次，請附上更多前後文。"
            "修改前請先用 read_scene 讀過該場。成功時回傳 diff。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "scene": {"type": "integer", "description": "場次編號"},
                "old_text": {"type": "string"},
                "new_text": {"type": "string"},
            },
            "required": ["scene", "old_text", "new_text"],
        },
    },
]`;

const EXEC_PY = `def run_tool(block):
    """執行一個 tool_use，永遠回傳 tool_result —— 失敗也一樣"""
    try:
        if block.name == "edit_scene":
            scene = load_scene(block.input["scene"])
            old = block.input["old_text"]
            hits = scene.count(old)
            if hits != 1:
                # 不丟例外：把「怎麼修」寫進錯誤訊息，讓模型自己重試
                return {
                    "type": "tool_result", "tool_use_id": block.id, "is_error": True,
                    "content": f"old_text 在第 {block.input['scene']} 場出現 {hits} 次。"
                               "請附上前後文讓它唯一。" if hits else
                               "找不到 old_text。請先用 read_scene 確認目前的原文。",
                }
            new_scene = scene.replace(old, block.input["new_text"])
            save_scene(block.input["scene"], new_scene)
            return {"type": "tool_result", "tool_use_id": block.id,
                    "content": unified_diff(scene, new_scene)}   # 回傳 diff，不回傳整場
        ...
    except Exception as e:
        return {"type": "tool_result", "tool_use_id": block.id,
                "is_error": True, "content": f"{type(e).__name__}: {e}"}`;

export default function Article() {
  return (
    <article>
      <h1>04 · Tools 設計：工具描述就是介面</h1>

      <p>第 01 章說「決策權在模型，執行權在 Harness」。這章看兩者之間的那條介面：<b>工具</b>。</p>
      <blockquote>
        模型不會讀你的程式碼，它只讀工具的<b>名稱、說明、參數格式</b>。<br />
        工具設計得好不好，決定了 Agent 是精準地查一行，還是把整部劇本讀進來再猜。
      </blockquote>

      <h2>第 0 層：模型看到的工具長什麼樣</h2>
      <p>一個工具定義只有三個欄位。<code>description</code> 是給模型讀的說明書，<code>input_schema</code> 是 JSON Schema，規定參數格式：</p>
      <pre>{TOOLS_PY}</pre>
      <p>寫 description 時，把自己當成在寫給一位<b>聰明但完全沒有背景的新同事</b>：</p>
      <ul>
        <li><b>什麼時候該用、什麼時候不該用。</b>「想知道某人在哪裡出現時用這個，不要為此讀整份劇本」比「搜尋劇本」有用得多。</li>
        <li><b>參數的意義與限制。</b>場次編號從哪裡來？old_text 要多長？</li>
        <li><b>回傳什麼。</b>模型知道會拿到「場次 + 一行」，就不會期待拿到全文。</li>
        <li><b>和其他工具的關係。</b>「修改前請先用 read_scene 讀過」把工具串成工作流程。</li>
      </ul>

      <h2>第 1 層：粒度決定行為</h2>
      <table>
        <thead><tr><th>工具</th><th>回答「小美在哪幾場出場」的代價</th><th>適合</th></tr></thead>
        <tbody>
          <tr><td><code>read_file</code></td><td>整集全文進 context</td><td>真的需要逐字讀全部時（通常交給子代理，第 06 章）</td></tr>
          <tr><td><code>get_outline</code></td><td>每場一行</td><td>結構、節奏、場次安排</td></tr>
          <tr><td><code>find_mentions</code></td><td>幾行</td><td>角色出場、伏筆、道具追蹤</td></tr>
          <tr><td><code>read_scene</code></td><td>一場</td><td>細讀、改稿前確認原文</td></tr>
        </tbody>
      </table>
      <p>給模型「地圖 → 索引 → 細讀」三種粒度，它會自然地先看大綱、再定位、最後只讀需要的部分。
        這就是第 02 章「按需讀取」在工具層的實現。</p>
      <p>反過來，粒度也不能太細。如果「改一句對白」要依序呼叫五個工具，每一步都是一次往返和一段 context。
        <b>好的粒度對應的是使用者心中的一個動作</b>：「讀第 7 場」「把這句改掉」。</p>

      <h2>第 2 層：回傳設計與錯誤</h2>
      <p>工具結果會留在 context 裡、之後每次呼叫都重送，所以回傳也要設計：</p>
      <ul>
        <li><b>只回傳模型需要的。</b>改稿回傳 diff；搜尋回傳命中的行，而不是整場。</li>
        <li><b>大結果要截斷並說明。</b>例如「共 230 筆，只列前 50 筆，請縮小範圍」——讓模型知道還有更多、以及怎麼縮小。</li>
        <li><b>錯誤是回饋，不是例外。</b>用 <code>is_error: true</code> 的 tool_result 回傳，內容寫清楚「哪裡錯、怎麼修」。</li>
      </ul>
      <pre>{EXEC_PY}</pre>
      <p>注意錯誤訊息的寫法：它不是給工程師看的 stack trace，而是給模型的<b>下一步指示</b>。
        Agent 會「自我修正」，有一大半功勞來自寫得好的錯誤訊息。</p>

      <h2>第 3 層：Claude Code 的內建工具</h2>
      <table>
        <thead><tr><th>工具</th><th>用途</th><th>值得注意的設計</th></tr></thead>
        <tbody>
          <tr><td>Read</td><td>讀檔案</td><td>可指定起始行與行數，只讀一段；也能讀圖片、PDF</td></tr>
          <tr><td>Edit</td><td>修改檔案</td><td><b>精確字串取代</b>：old_string 必須唯一；而且必須先 Read 過該檔案，否則直接拒絕</td></tr>
          <tr><td>Write</td><td>建立 / 覆寫檔案</td><td>覆寫既有檔案前同樣要求先讀過</td></tr>
          <tr><td>Grep / Glob</td><td>搜內容 / 找檔名</td><td>用文字搜尋，而不是預先建向量索引（第 02 章的 agentic search）</td></tr>
          <tr><td>Bash</td><td>執行指令</td><td>最萬能也最危險，權限控管的重點（第 05 章）</td></tr>
          <tr><td>WebFetch / WebSearch</td><td>上網</td><td>結果會先經過整理再交給模型，不是整頁原始 HTML</td></tr>
          <tr><td>Agent</td><td>派子代理</td><td>一個「工具」本身就是另一個 Agent 迴圈（第 06 章）</td></tr>
        </tbody>
      </table>
      <p>Edit 的設計特別值得學：為什麼不讓模型直接「覆寫整個檔案」？因為整份重寫既耗 token，又容易不小心改到別的地方。
        精確字串取代讓每次修改都<b>小、可驗證、可回溯</b>。「先讀才能改」則保證模型改的是它真的看過的版本。</p>

      <h2>第 4 層：平行呼叫與工具數量</h2>
      <p>模型可以在一則回覆裡放多個 <code>tool_use</code>，例如同時讀三場。Harness 一起執行，結果放在同一則 user 訊息回傳。
        互不相依的讀取可以平行；有先後關係的（先讀再改）就得分開。</p>
      <p>工具也不是越多越好：</p>
      <ul>
        <li>每個工具定義都會放進每一次請求，<b>工具清單本身就是固定開銷</b>（第 02、03 章）。</li>
        <li>功能重疊的工具會讓模型猶豫或選錯。</li>
        <li>接上很多 MCP server 時尤其明顯。Claude Code 的對策之一是<b>按需載入工具定義</b>：先只給名稱，需要時才載入完整說明（實作細節可能隨版本變動）。</li>
      </ul>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>工具概念</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>tool description</td><td>各部門貼在門口的<b>服務說明</b>：「借道具請填單，註明場次與數量」。</td></tr>
          <tr><td>粒度</td><td>跟場記要「第 7 場的鏡次表」，而不是「整本場記本影印一份」。</td></tr>
          <tr><td>get_outline</td><td><b>分場表</b>（scene breakdown）。開會前大家先看這張。</td></tr>
          <tr><td>find_mentions</td><td>美術組的<b>道具追蹤表</b>：這把傘在哪幾場出現。</td></tr>
          <tr><td>回傳 diff</td><td>改稿用<b>修訂頁</b>（彩色頁、星號標記），不是每次重印整本劇本。</td></tr>
          <tr><td>is_error</td><td>場務回報「這個景今天借不到，改下午三點可以」—— 附上替代方案的拒絕。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示：劇本工具集草案</h2>
      <table>
        <thead><tr><th>工具</th><th>用途</th><th>輸入</th><th>回傳</th></tr></thead>
        <tbody>
          <tr><td><code>get_outline</code></td><td>看結構</td><td>集數</td><td>每場一行：場次、地點、日夜、角色、摘要</td></tr>
          <tr><td><code>find_mentions</code></td><td>定位</td><td>角色名 / 關鍵字、範圍（集數）</td><td>場次 + 命中行，超過上限會截斷並說明</td></tr>
          <tr><td><code>read_scene</code></td><td>細讀</td><td>集數、場次（可多場）</td><td>該場全文，含行號</td></tr>
          <tr><td><code>edit_scene</code></td><td>改稿</td><td>場次、old_text、new_text</td><td>diff；不唯一或找不到時回傳 is_error 與修正建議</td></tr>
          <tr><td><code>insert_scene</code> / <code>move_scene</code></td><td>調整結構</td><td>位置</td><td>新的場次編號對照表</td></tr>
          <tr><td><code>check_format</code></td><td>驗證</td><td>場次或整集</td><td>通過，或逐條問題 + 行號</td></tr>
          <tr><td><code>get_character</code></td><td>查設定</td><td>角色名</td><td>Bible 裡的角色條目（第 03 章）</td></tr>
          <tr><td><code>check_continuity</code></td><td>一致性</td><td>角色或道具</td><td>可能的矛盾清單（內部可能派子代理讀全文）</td></tr>
        </tbody>
      </table>
      <ol>
        <li><b>工具對應編劇的動作，不是對應檔案系統。</b>編劇想的是「第 7 場」，不是「ep03.fountain 第 412 行」。</li>
        <li><b>三種粒度都要有</b>：大綱、索引、細讀。缺了中間那層，模型就會退回讀全文。</li>
        <li><b>改稿一律回傳 diff</b>，並保留修訂紀錄，之後可以做「這一版改了什麼」的報告。</li>
        <li><b>錯誤訊息是給模型的指示</b>，每一種失敗都要寫出下一步怎麼做。</li>
        <li><b>危險的操作做成獨立工具</b>（例如刪除場次），方便第 05 章對它單獨設權限。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>如果只有 <code>read_file</code> 和 <code>write_file</code> 兩個工具，Claude Film 改一句對白要付出什麼代價？</li>
        <li>為什麼 Edit 要求 old_string 必須唯一，而不是預設改第一個？</li>
        <li>把「刪除場次」做成 <code>edit_scene</code> 的一種用法，和做成獨立的 <code>delete_scene</code> 工具，對權限設計有什麼差別？</li>
      </ul>
      <p><Link to="/03-system-prompt">← 03 System Prompt 與 CLAUDE.md</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/05-permissions-hooks">05 Permissions 與 Hooks →</Link></p>
    </article>
  );
}
