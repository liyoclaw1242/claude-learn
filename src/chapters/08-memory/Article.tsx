import { Link } from "react-router-dom";

const MEMORY_TREE = `~/.claude/projects/<project>/memory/
├── MEMORY.md               # 索引：每則記憶一行，每次開場載入
├── user_role.md            # 一則記憶
├── feedback_dialogue.md    # 一則記憶
└── project_xiaomei.md      # 一則記憶`;

const MEMORY_FILE = `---
name: feedback-dialogue
description: 對白不要用「其實」開頭
metadata:
  type: feedback
---

對白不要用「其實」開頭。

**Why:** 導演覺得像在念稿，演員也不好接。
**How to apply:** 寫任何角色的台詞時都適用；旁白和字卡不受限。`;

const MEMORY_TOOL_PY = `import anthropic
from anthropic.lib.tools import BetaAbstractMemoryTool

client = anthropic.Anthropic()

class ScriptMemory(BetaAbstractMemoryTool):
    """記憶存在哪裡由你決定：本機資料夾、資料庫、雲端都可以。
    模型只會送出 view / create / str_replace / insert / delete / rename 指令，
    路徑都在 /memories 底下。實作時務必檢查路徑，不能讓它跳出記憶目錄。"""
    def view(self, command): ...
    def create(self, command): ...
    def str_replace(self, command): ...
    def insert(self, command): ...
    def delete(self, command): ...
    def rename(self, command): ...

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=16000,
    tools=[ScriptMemory()],
    messages=[{"role": "user", "content": "小美從第 5 集起改成 30 歲，記下來。"}],
)
for message in runner:
    print(message)`;

export default function Article() {
  return (
    <article>
      <h1>08 · Memory 與持久化：跨集數的角色弧線記憶</h1>

      <p>第 02 章：context 是模型唯一的記憶。第 03 章：CLAUDE.md 是你寫給它的規則。
        這章把兩者接起來，問一個更長期的問題：<b>關掉對話之後，什麼東西能留到明天？</b></p>
      <blockquote>
        模型本身什麼都不會記住。<br />
        所謂「記憶」，其實是 Harness 把某些東西<b>存到磁碟</b>，下次再<b>放回 context</b>。<br />
        設計記憶，就是在決定：<b>存什麼、存成什麼樣子、什麼時候放回去。</b>
      </blockquote>

      <h2>第 0 層：三種時間尺度</h2>
      <table>
        <thead><tr><th>記憶</th><th>壽命</th><th>誰寫的</th><th>怎麼回到 context</th></tr></thead>
        <tbody>
          <tr><td><b>context</b></td><td>一次對話</td><td>對話本身</td><td>它就在 context 裡；結束或 <code>/clear</code> 就沒了</td></tr>
          <tr><td><b>transcript</b></td><td>預設保留約 30 天</td><td>Claude Code 自動存</td><td><code>claude --continue</code>／<code>--resume</code> 整段載回</td></tr>
          <tr><td><b>CLAUDE.md</b></td><td>直到你修改</td><td>你</td><td>每次開場載入（第 03 章）</td></tr>
          <tr><td><b>自動記憶</b></td><td>直到被修改或刪除</td><td>模型自己</td><td>開場只載入索引，單檔按需讀取</td></tr>
        </tbody>
      </table>
      <p>前兩者是<b>原樣保存</b>，後兩者是<b>精選過的知識</b>。這個差別決定了它們的用途。</p>

      <h2>第 1 層：接續對話 vs. 開新對話</h2>
      <p>Claude Code 把每次對話存成一個 JSONL 檔（<code>~/.claude/projects/&lt;project&gt;/&lt;session-id&gt;.jsonl</code>），
        每一行是一則訊息、一次工具呼叫或一筆中繼資料。</p>
      <ul>
        <li><code>claude --continue</code>：接回這個目錄最近一次的對話。</li>
        <li><code>claude --resume</code>：從清單挑一段對話接回。</li>
      </ul>
      <p>接回時，<b>完整的歷史</b>（包括工具呼叫和結果）都會回到 context。好處是細節都在；代價是第 02 章那些問題全部回來了：
        對話越長，每次呼叫越貴，也越接近壓縮門檻。官方文件也提到，很久沒動的長對話在接回時，可以選擇改用摘要接續。</p>
      <p>所以 transcript 適合<b>「昨天那件事還沒做完」</b>；跨好幾天、好幾集的知識，要靠下面的記憶檔。</p>

      <h2>第 2 層：自動記憶的結構</h2>
      <p>Claude Code 的自動記憶（auto memory）是模型<b>自己寫給自己的筆記</b>。依目前的官方文件（實作細節可能隨版本調整），結構如下：</p>
      <pre>{MEMORY_TREE}</pre>
      <ul>
        <li><b>一則記憶一個檔案</b>，用 frontmatter 標類型：<code>user</code>（你是誰）、<code>feedback</code>（你的修正與偏好）、
          <code>project</code>（進行中的工作與決策）、<code>reference</code>（外部資料在哪）。</li>
        <li><b>MEMORY.md 是索引</b>，每則一行。開場時只載入它的前 200 行或 25KB（取先到者），單檔不會預先載入。</li>
        <li>模型需要時，用<b>一般的檔案工具</b>讀單檔。沒有特殊的「記憶 API」，就是讀寫 markdown。</li>
        <li>寫入時會記錄修改時間，看得出這則記憶有多新。</li>
        <li>都是純文字檔，你可以用 <code>/memory</code> 打開目錄，自己<b>檢查、修改、刪除</b>。</li>
      </ul>
      <p>一個記憶檔大概長這樣（把「為什麼」和「怎麼套用」也寫進去，下次遇到邊界情況才判斷得了）：</p>
      <pre>{MEMORY_FILE}</pre>
      <p>官方文件也寫明：<b>能從程式碼或 git 歷史推得的東西不記</b>，CLAUDE.md 已經寫了的也不記。</p>

      <h2>第 3 層：記憶的四個難題</h2>
      <table>
        <thead><tr><th>難題</th><th>失敗的樣子</th><th>原則</th></tr></thead>
        <tbody>
          <tr><td><b>寫什麼</b></td><td>把場次清單也記下來，結果跟劇本不同步</td><td>只記從原始資料推不出來的事</td></tr>
          <tr><td><b>何時更新</b></td><td>設定改了，記憶還是舊的</td><td>改設定的同時更新記憶，而不是事後補</td></tr>
          <tr><td><b>過期與矛盾</b></td><td>「小美 28 歲」和「小美 30 歲」並存</td><td>改寫舊檔，不要新增一則互相矛盾的記憶</td></tr>
          <tr><td><b>索引 vs. 全文</b></td><td>記憶越來越多，開場的固定開銷越來越大</td><td>開場只放索引，需要時再讀單檔（第 02 章）</td></tr>
        </tbody>
      </table>
      <p>還有一點跟第 03 章一樣：記憶是 <b>context，不是強制設定</b>。模型讀到了通常會照做，但真正不能違反的規則，仍然要交給 hook（第 05 章）。</p>

      <h2>第 4 層：在 API 上自己做記憶</h2>
      <p>如果 Claude Film 直接用 Claude API 開發，可以用 API 提供的 <b>memory tool</b>。它是<b>客戶端工具</b>：
        模型送出「查看／建立／取代／刪除檔案」的指令，實際存在哪裡由你的程式決定。</p>
      <pre>{MEMORY_TOOL_PY}</pre>
      <p>注意兩件事：記憶目錄要<b>按使用者（或按劇集）隔開</b>；不要把密碼、金鑰這類敏感資料寫進記憶。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>記憶</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>context</td><td>今天在編劇室裡說過的話。散會就沒了。</td></tr>
          <tr><td>transcript</td><td><b>會議逐字稿</b>。什麼都有，但沒人會每天從頭重讀。</td></tr>
          <tr><td>CLAUDE.md</td><td><b>Series Bible</b>。製作人親手寫的正式規範。</td></tr>
          <tr><td>自動記憶</td><td><b>編劇助理的筆記本</b>。只記重點：導演討厭什麼、誰改了什麼設定、資料放在哪。</td></tr>
          <tr><td>MEMORY.md</td><td>筆記本的<b>目錄頁</b>。開會前先掃一眼，需要哪頁再翻。</td></tr>
          <tr><td>過時的記憶</td><td>舊版角色表沒收回，新來的編劇照著寫錯。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>角色弧線是記憶的核心。</b> 每個主要角色一個狀態檔，每寫完一集就更新：目前的處境、知道了哪些秘密、和誰的關係變了。
          這是長篇劇集最容易出錯、也最需要跨 session 保存的東西。</li>
        <li><b>伏筆與回收要可追蹤。</b> 每個伏筆一筆紀錄：在哪一集埋下、預計在哪裡回收、目前狀態。這種資訊散在劇本各處，模型每次重讀都可能漏掉。</li>
        <li><b>把導演和製片的意見記成 feedback。</b>「對白不要用『其實』開頭」這種修正，連同理由一起記下，才不會每一集都要重講一次。</li>
        <li><b>記憶要對編劇透明。</b> 編劇必須能看到、改掉、刪掉模型記下的東西。被模型默默記錯的設定，比沒有記憶更危險。</li>
        <li><b>記憶要有時間點。</b>「小美幾歲」的答案取決於你在寫第幾集。角色狀態應該按集數存版本，而不是只保留最新值，
          否則回頭修第 3 集時，模型會用第 10 集的設定去寫。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li><code>--resume</code> 接回昨天的對話，跟開新對話但有自動記憶，各適合什麼情況？</li>
        <li>為什麼 MEMORY.md 只放索引，而不是把所有記憶全文都在開場載入？</li>
        <li>編劇把小美的年齡從 28 改成 30。如果記憶只「新增」不「修改」，三集之後會發生什麼事？</li>
        <li>「第 4 集共有 18 場」該不該記？「導演說第 4 集節奏太慢」呢？為什麼？</li>
      </ul>
      <p><Link to="/07-skills-mcp">← 07 Skills / MCP</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/09-architecture">09 總成：Claude Film 架構 →</Link></p>
    </article>
  );
}
