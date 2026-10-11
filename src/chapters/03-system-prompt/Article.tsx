import { Link } from "react-router-dom";

const ASSEMBLE_PY = `import anthropic, datetime, pathlib

client = anthropic.Anthropic()
tools = [...]   # 見第 01 章

def load_instructions(cwd: pathlib.Path) -> str:
    """個人層 + 從根目錄到工作目錄的每一層 CLAUDE.md（由外而內）"""
    paths = [pathlib.Path.home() / ".claude" / "CLAUDE.md"]
    paths += [d / "CLAUDE.md" for d in reversed([cwd, *cwd.parents])]
    return "\\n\\n".join(
        f"Contents of {p}:\\n{p.read_text(encoding='utf-8')}"
        for p in paths if p.exists()
    )

cwd = pathlib.Path.cwd()

system = [
    # 產品內建的部分：對所有使用者、所有專案都一樣
    {"type": "text", "text": "你是 Claude Film，一位資深劇本醫生。改稿前一定先讀原文……"},
    # 這次開工的通告單
    {"type": "text", "text": f"工作目錄：{cwd}\\n今天日期：{datetime.date.today()}",
     "cache_control": {"type": "ephemeral"}},   # ← tools + system 這段前綴可被快取
]

messages = [{
    "role": "user",
    "content": [
        # 使用者自己寫的規則放在 messages 開頭，而不是混進 system
        {"type": "text", "text": f"<project-instructions>\\n{load_instructions(cwd)}\\n</project-instructions>"},
        {"type": "text", "text": "幫我把第 3 集第 12 場的對白改得更口語。"},
    ],
}]

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    tools=tools,          # 快取前綴的順序：tools → system → messages
    system=system,
    messages=messages,
)`;

const BIBLE_MD = `# 《夜咖啡》寫作規範

## 格式
- 劇本一律用 Fountain 格式，一場一個檔案：epXX/scene_NN.fountain
- 場景標頭用「INT./EXT. 地點 - 日/夜」

## 世界觀（細節按需讀取，不要一次全讀）
- 角色設定：bible/characters.md
- 時間線：bible/timeline.md
- 伏筆與回收清單：bible/setups.md

## 語氣
- 對白口語、台灣用語；角色不講自己的情緒，用動作表現
- 為什麼：導演偏好留白，觀眾自己讀出情緒

## 禁區（另由 hook 強制）
- season1/ 已播出，不可修改`;

export default function Article() {
  return (
    <article>
      <h1>03 · System Prompt 與 CLAUDE.md：世界觀與規則的注入點</h1>

      <p>第 01 章說模型是無狀態函數，第 02 章說 context 是它唯一的記憶。這章問的是：
        <b>規則和世界觀，要放在請求的哪裡？</b></p>
      <blockquote>
        模型不會「被設定」，它只會「讀到」。<br />
        每一條你希望它遵守的規則，都是在某個時機、被 Harness 寫進請求的某個位置。<br />
        <b>位置決定了三件事：它多常出現、誰能改它、它有多可靠。</b>
      </blockquote>

      <h2>第 0 層：一次請求的三格</h2>
      <p>Messages API 的請求有三個主要欄位，順序是 <code>tools → system → messages</code>。
        這個順序不只是寫法，也是 <b>prompt caching 比對前綴的順序</b>（第 3 層會講）。</p>
      <p>下面是一個極簡版的「Claude Film 組請求」，結構跟 Claude Code 的做法一致：</p>
      <pre>{ASSEMBLE_PY}</pre>
      <p>注意它把東西分成兩類：<b>產品自己的規則</b>放 system，<b>使用者寫的規則</b>（CLAUDE.md）放 messages 開頭。
        Claude Code 目前也是這樣分的：CLAUDE.md 會被包成一段提醒，附在對話開頭。
        （這是實作細節，可能隨版本調整，但背後的考量不會變。）</p>

      <h2>第 1 層：Claude Code 的注入點</h2>
      <table>
        <thead><tr><th>注入點</th><th>放在哪</th><th>什麼時候載入</th><th>誰寫的</th></tr></thead>
        <tbody>
          <tr><td>內建 system prompt</td><td>system</td><td>每次呼叫</td><td>Anthropic；可用 <code>--append-system-prompt</code> 追加</td></tr>
          <tr><td>環境資訊</td><td>system</td><td>開場時</td><td>Harness 自動產生（目錄、平台、日期、git 狀態）</td></tr>
          <tr><td>工具說明</td><td>tools</td><td>每次呼叫</td><td>內建工具 + MCP server 提供</td></tr>
          <tr><td>組織層 CLAUDE.md</td><td>messages 開頭</td><td>開場時</td><td>公司 IT 統一派發的政策檔</td></tr>
          <tr><td>個人層 <code>~/.claude/CLAUDE.md</code></td><td>messages 開頭</td><td>開場時</td><td>你自己，跨所有專案</td></tr>
          <tr><td>專案層 <code>CLAUDE.md</code>（工作目錄及其上層）</td><td>messages 開頭</td><td>開場時</td><td>團隊，進版控</td></tr>
          <tr><td>子目錄 <code>CLAUDE.md</code></td><td>對話中途</td><td>讀到該目錄的檔案時</td><td>團隊</td></tr>
          <tr><td><code>@路徑</code> 匯入</td><td>跟著匯入它的檔案</td><td>同上</td><td>團隊 / 個人</td></tr>
          <tr><td>system reminder</td><td>對話中途</td><td>Harness 判斷需要時</td><td>Harness（例如「這個檔案剛被外部改過」）</td></tr>
        </tbody>
      </table>
      <p>實用指令：<code>/init</code> 讓 Claude 分析專案、產生一份初版 CLAUDE.md；<code>/memory</code> 直接開啟這些檔案來編輯。</p>
      <p>多層 CLAUDE.md 是<b>全部疊在一起</b>給模型讀，不是互相覆蓋。如果兩層寫了矛盾的規則，
        沒有程式去裁決，是模型自己判斷 —— 所以<b>最好的衝突處理就是不要寫出衝突</b>。</p>

      <h2>第 2 層：寫一份好的 CLAUDE.md</h2>
      <p>CLAUDE.md 每次開場都會載入、每次呼叫都會重送，所以它是<b>固定開銷</b>（第 02 章）。原則：</p>
      <ul>
        <li><b>寫目錄，不寫全文。</b> 告訴模型「角色設定在哪個檔案」，讓它需要時再讀；不要用 <code>@</code> 把整本設定集匯入。</li>
        <li><b>具體、可執行。</b>「對白要好」沒用；「角色不直接說出自己的情緒，用動作表現」才有用。</li>
        <li><b>附上理由。</b> 模型知道「為什麼」，遇到規則沒寫到的情況時，比較能推出正確的做法。</li>
        <li><b>只寫它猜不到的事。</b> Fountain 格式怎麼寫它本來就會；你這部劇的特殊慣例它不會。</li>
      </ul>
      <p>一個劇集專案的 CLAUDE.md 大概長這樣：</p>
      <pre>{BIBLE_MD}</pre>

      <h2>第 3 層：Prompt caching 與注入順序</h2>
      <p>每次呼叫都要整份重送，但大部分內容跟上一次一模一樣。API 的 <b>prompt caching</b> 會記住標記過的前綴
        （<code>cache_control</code>），下次遇到<b>逐字相同的前綴</b>就直接重用，費用和延遲都大幅降低。快取預設約 5 分鐘內有效，每次命中會重新計時。</p>
      <p>關鍵在「前綴」：比對是從頭開始的，<b>任何一個位元組不同，那個位置之後全部失效</b>。所以：</p>
      <table>
        <thead><tr><th>放前面（穩定）</th><th>放後面（常變）</th></tr></thead>
        <tbody>
          <tr><td>工具定義、產品規則、Series Bible 目錄</td><td>這次要改哪一場、導演今天的意見、目前的改稿進度</td></tr>
        </tbody>
      </table>
      <p>常見的錯誤是把「目前時間」「這次的任務」塞進 system 開頭 —— 每次都不一樣，等於整個快取永遠不會命中。</p>

      <h2>第 4 層：讀到 ≠ 遵守</h2>
      <p>CLAUDE.md 裡的規則，模型<b>通常</b>會遵守，但它是語言模型，不是規則引擎：</p>
      <ul>
        <li>規則多了會互相稀釋；context 長了，開頭的規則抓取力也會變弱（第 02 章）。</li>
        <li>規則之間有模糊地帶時，模型會做判斷，判斷就可能跟你想的不一樣。</li>
      </ul>
      <p>因此 Claude Code 的設計是<b>兩層防線</b>：</p>
      <table>
        <thead><tr><th></th><th>CLAUDE.md / system prompt</th><th>權限規則 / hooks</th></tr></thead>
        <tbody>
          <tr><td>本質</td><td>給模型讀的文字</td><td>Harness 執行的程式</td></tr>
          <tr><td>可靠度</td><td>機率性</td><td>確定性</td></tr>
          <tr><td>適合</td><td>風格、偏好、慣例、背景知識</td><td>絕對不能發生的事</td></tr>
          <tr><td>劇本例子</td><td>「對白要口語」</td><td>「season1/ 底下的檔案禁止寫入」</td></tr>
        </tbody>
      </table>
      <p>第 05 章會細講第二層。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>注入點</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>內建 system prompt</td><td><b>製作公司的工作守則</b>。每個劇組都一樣，編劇不能改。</td></tr>
          <tr><td>環境資訊</td><td><b>通告單</b>。今天幾號、在哪拍、哪些人到場。</td></tr>
          <tr><td>工具說明</td><td>各部門的<b>服務說明</b>：「美術組接單前要先看到分鏡」。</td></tr>
          <tr><td>組織層</td><td>電視台的<b>播出規範</b>（Standards &amp; Practices）。</td></tr>
          <tr><td>個人層</td><td>編劇自己的<b>寫作習慣</b>，換到哪個劇組都帶著。</td></tr>
          <tr><td>專案層</td><td><b>Series Bible</b>。全編劇室共用，新人進來先讀它。</td></tr>
          <tr><td>子目錄層</td><td><b>單集筆記</b>（episode notes）。寫到第 3 集才翻開第 3 集那份。</td></tr>
          <tr><td>system reminder</td><td>場記在旁邊小聲提醒：「剛剛美術把道具換了。」</td></tr>
          <tr><td>hooks</td><td><b>製片守門</b>。不管編劇怎麼想，超預算的戲就是不能拍。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>用資料夾結構對應劇集結構。</b> <code>series/CLAUDE.md</code> 放全劇規範，<code>series/ep03/CLAUDE.md</code> 放單集筆記。
          子目錄按需載入的機制剛好就是「寫到哪集看哪集的筆記」，不用另外設計。</li>
        <li><b>Claude Film 的內建 system prompt 是產品核心。</b> 編劇專業（場景結構、節奏術語、格式規範、改稿禮儀）應該由產品內建，
          使用者只需要寫「這部劇特有的事」。</li>
        <li><b>Bible 是目錄，細節按需讀。</b> 角色設定、時間線、伏筆清單各自成檔，CLAUDE.md 只寫指向它們的路徑。</li>
        <li><b>穩定在前、變動在後。</b> 今天的改稿目標和導演意見放進對話，不要動 system；這樣整部劇的規範可以一直命中快取。</li>
        <li><b>硬規則交給 Harness。</b> 已播出的集數不可修改、角色年齡不得與設定衝突 —— 這些用 hook 檢查（第 05 章），不要只靠 Bible 的一句話。</li>
        <li><b>Bible 會過時。</b> 改稿改了設定，Bible 也要跟著更新，不然模型會依舊設定寫作。這需要回寫機制（第 08 章）。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>為什麼 Claude Code 把 CLAUDE.md 放在 messages 開頭，而不是直接併進 system？從快取的角度想。</li>
        <li>你在 Bible 裡寫「小美 28 歲」，但模型在第 9 集寫了「小美 30 歲生日」。有哪兩種層級的解法？</li>
        <li>如果把「今天日期」放在 system 的最前面，對快取會有什麼影響？</li>
      </ul>
      <p><Link to="/02-context-window">← 02 Context Window</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/04-tools">04 Tools 設計 →</Link></p>
    </article>
  );
}
