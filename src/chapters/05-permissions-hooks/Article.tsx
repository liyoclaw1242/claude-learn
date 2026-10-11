import { Link } from "react-router-dom";

const SETTINGS_JSON = `// series/.claude/settings.json（進版控，整個編劇室共用）
{
  "permissions": {
    "allow": [
      "Bash(fountain-lint *)"            // 格式檢查工具：直接放行
    ],
    "ask": [
      "Bash(git push *)"                 // 推到共享版本前一定要問
    ],
    "deny": [
      "Edit(/season1/**)",               // 已播出：任何情況都不能改
      "Read(./contracts/**)"             // 演員合約：不讓模型讀
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command",
                    "command": "python3 \\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/check_bible.py" }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command",
                    "command": "python3 \\"$CLAUDE_PROJECT_DIR\\"/.claude/hooks/fountain_lint.py" }]
      }
    ]
  }
}`;

const STDIN_JSON = `{
  "hook_event_name": "PreToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/Users/me/series/ep09/scene_04.fountain",
    "old_string": "小美推門進來。",
    "new_string": "小美推門進來，今天是她 30 歲生日。"
  },
  "tool_use_id": "toolu_01ABC…",
  "cwd": "/Users/me/series",
  "permission_mode": "default"
}`;

const HOOK_PY = `#!/usr/bin/env python3
# .claude/hooks/check_bible.py —— 改稿前檢查角色年齡是否與設定集一致
import json, re, sys

AGES = {"小美": 28, "阿哲": 32}          # 實務上應該從 bible/characters.md 解析

event = json.load(sys.stdin)              # Harness 把這次工具呼叫的 JSON 從 stdin 傳進來
new_text = event["tool_input"].get("new_string") or event["tool_input"].get("content", "")

for name, age in AGES.items():
    for found in re.findall(rf"{name}[^。\\n]*?(\\d+)\\s*歲", new_text):
        if int(found) != age:
            print(f"{name} 在設定集裡是 {age} 歲，這次修改寫成 {found} 歲。"
                  f"請改正，或先請導演確認是否要更新設定集。", file=sys.stderr)
            sys.exit(2)                   # 2 = 擋下；stderr 會交給模型當作理由

sys.exit(0)                               # 0 = 放行`;

const LOOP_PY = `# 接續第 01 章的迴圈：在「執行工具」前後加上自己的關卡

def pre_check(name, args):
    """回傳 None 表示放行；回傳字串表示擋下，字串就是給模型的理由"""
    path = args.get("path", "")
    if name in ("edit_scene", "delete_scene") and path.startswith("season1/"):
        return "第 1 季已播出，禁止修改。"                       # deny：不問人
    if name == "delete_scene":
        ok = input(f"模型要刪除 {path}，允許嗎？[y/N] ") == "y"   # ask：問導演
        if not ok:
            return "導演拒絕刪除這一場。"
    return None

def post_check(name, args):
    if name == "edit_scene":
        return run_fountain_lint(args["path"])                  # 有問題就回傳說明文字
    return None

results = []
for block in response.content:
    if block.type != "tool_use":
        continue
    reason = pre_check(block.name, block.input)
    if reason:
        results.append({"type": "tool_result", "tool_use_id": block.id,
                        "content": reason, "is_error": True})
        continue
    output = execute_tool(block.name, block.input)
    feedback = post_check(block.name, block.input)
    if feedback:
        output += f"\\n\\n[格式檢查] {feedback}"                  # 驗收結果一起交給模型
    results.append({"type": "tool_result", "tool_use_id": block.id, "content": output})

messages.append({"role": "user", "content": results})`;

export default function Article() {
  return (
    <article>
      <h1>05 · Permissions 與 Hooks：誰有權按下快門</h1>

      <p>第 03 章結尾留了一個問題：CLAUDE.md 寫「不可修改第 1 季」，模型<b>通常</b>會遵守，但不是保證。
        這章講保證從哪裡來。</p>
      <blockquote>
        模型只能<b>提出</b>工具呼叫，真正<b>執行</b>的是 Harness。<br />
        所以 Harness 可以在「提出」和「執行」之間放關卡 —— 那些關卡是程式，不是 prompt，模型說服不了它們。
      </blockquote>
      <p>Claude Code 的文件講得很直接：權限規則由 Claude Code 執行，不是由模型執行；prompt 和 CLAUDE.md 影響的是模型<b>想做什麼</b>，改變不了 Claude Code <b>允許什麼</b>。</p>

      <h2>第 0 層：一次工具呼叫要過幾道門</h2>
      <ol>
        <li>模型回覆裡出現 <code>tool_use</code>（第 01 章）。</li>
        <li><b>PreToolUse hook</b>：你寫的程式先檢查參數。exit 2 直接擋下。</li>
        <li><b>權限規則</b>：依 deny → ask → allow 的順序比對，再參考目前的 <b>permission mode</b>。</li>
        <li>需要時<b>停下來問你</b>。</li>
        <li>真正執行工具。</li>
        <li><b>PostToolUse hook</b>：執行後驗收、後處理。</li>
        <li>結果包成 <code>tool_result</code> 回到模型。被擋下的呼叫也會變成一則 <code>is_error</code> 的 tool_result。</li>
      </ol>
      <p>最後一點很關鍵：<b>被擋不是終點，而是回饋</b>。模型讀到「為什麼被擋」，下一輪會換一個做法。
        關卡設計得好，模型會越用越順；只有一句「denied」，模型就只能亂猜。</p>

      <h2>第 1 層：權限規則</h2>
      <p>規則寫在 <code>settings.json</code> 的 <code>permissions</code> 底下，分 <code>allow</code>、<code>ask</code>、<code>deny</code> 三個清單。格式是「工具名稱（範圍）」：</p>
      <pre>{SETTINGS_JSON}</pre>
      <p>（JSON 本身不允許註解，這裡的 <code>//</code> 只是說明用。）</p>
      <table>
        <thead><tr><th>規則</th><th>意思</th></tr></thead>
        <tbody>
          <tr><td><code>Bash</code></td><td>所有 shell 命令。放在 deny 時，模型連這個工具都看不到</td></tr>
          <tr><td><code>Bash(npm run *)</code></td><td>以 <code>npm run </code> 開頭的命令；<code>*</code> 是萬用字元</td></tr>
          <tr><td><code>Edit(/season1/**)</code></td><td>修改專案根目錄下 <code>season1/</code> 裡的任何檔案（類似 .gitignore 的路徑寫法）</td></tr>
          <tr><td><code>Read(./.env)</code></td><td>讀取目前目錄的 <code>.env</code></td></tr>
          <tr><td><code>WebFetch(domain:example.com)</code></td><td>抓取指定網域</td></tr>
        </tbody>
      </table>
      <p><b>比對順序固定是 deny → ask → allow，第一個命中的決定結果。</b> 規則寫得多精確都不影響順序，所以 allow 沒辦法在 deny 上開例外。
        Claude Code 也會拆開 <code>&&</code>、<code>|</code> 這類串接的命令逐段比對，<code>Bash(safe-cmd *)</code> 不會順便放行 <code>safe-cmd && rm -rf x</code>。</p>
      <p>規則可以來自好幾個地方，優先順序由高到低：</p>
      <table>
        <thead><tr><th>來源</th><th>位置</th><th>用途</th></tr></thead>
        <tbody>
          <tr><td>組織管理（managed）</td><td>IT 派發</td><td>公司政策，其他層都蓋不掉</td></tr>
          <tr><td>命令列參數</td><td>啟動時帶入</td><td>這一次執行的臨時設定</td></tr>
          <tr><td>本地專案</td><td><code>.claude/settings.local.json</code></td><td>你在這個專案的個人設定，不進版控</td></tr>
          <tr><td>共享專案</td><td><code>.claude/settings.json</code></td><td>團隊共用，進版控</td></tr>
          <tr><td>使用者</td><td><code>~/.claude/settings.json</code></td><td>你在所有專案的預設</td></tr>
        </tbody>
      </table>
      <p>另外，只要任何一層 deny 了某個動作，其他層都無法再 allow 它。</p>

      <h3>Permission modes：整體鬆緊度</h3>
      <table>
        <thead><tr><th>模式</th><th>行為</th></tr></thead>
        <tbody>
          <tr><td><code>default</code></td><td>每種動作第一次使用時詢問（介面上叫 Manual）</td></tr>
          <tr><td><code>acceptEdits</code></td><td>工作目錄內的檔案修改和常見檔案操作自動接受</td></tr>
          <tr><td><code>plan</code></td><td>只能讀和探索，不改檔案 —— 先出計畫給你看</td></tr>
          <tr><td><code>auto</code></td><td>不逐項詢問，改由背景分類器審查每個動作是否符合你的要求</td></tr>
          <tr><td><code>dontAsk</code></td><td>任何需要詢問的動作一律拒絕；只執行事先 allow 的</td></tr>
          <tr><td><code>bypassPermissions</code></td><td>跳過詢問。只適合在容器、VM 這類隔離環境使用</td></tr>
        </tbody>
      </table>
      <p>模式調整的是「哪些動作要先問你」。真正的紅線，用 deny 規則或 hook 來寫。</p>

      <h2>第 2 層：Hooks —— 掛在迴圈上的你的程式</h2>
      <p>規則只能比對工具名稱和路徑或命令字串。要檢查<b>內容</b>（這次修改有沒有違反角色設定？），或在固定時機做事（改完自動跑格式檢查），就用 <b>hook</b>。</p>
      <p>hook 就是一段 shell 命令。Harness 在指定時機執行它，把事件內容以 JSON 從 <b>stdin</b> 傳進去。<code>PreToolUse</code> 收到的大致是：</p>
      <pre>{STDIN_JSON}</pre>
      <p>hook 用 <b>exit code</b> 回答：</p>
      <table>
        <thead><tr><th>事件</th><th>exit 0</th><th>exit 2</th><th>其他非 0</th></tr></thead>
        <tbody>
          <tr><td><code>PreToolUse</code></td><td>放行（仍要過權限規則）</td><td><b>擋下</b>，stderr 當作理由交給模型</td><td>當成 hook 自己出錯，動作照常進行</td></tr>
          <tr><td><code>PostToolUse</code></td><td>沒事</td><td>工具已經執行了，擋不了；stderr 交給模型</td><td>同上</td></tr>
          <tr><td><code>UserPromptSubmit</code></td><td>stdout 會被加進脈絡</td><td>擋下這則訊息，不送給模型</td><td>同上</td></tr>
          <tr><td><code>Stop</code></td><td>允許結束</td><td><b>不准停</b>，讓模型繼續工作</td><td>同上</td></tr>
        </tbody>
      </table>
      <p>注意 <b>exit 1 不會擋</b>，要擋一定要 exit 2。這是寫 hook 最常見的坑。</p>
      <p>前面 3D 場景第 7 步的角色年齡檢查，寫出來大概是這樣：</p>
      <pre>{HOOK_PY}</pre>
      <p>hook 除了用 exit code，也可以在 stdout 輸出 JSON 做更細的決定，例如 <code>PreToolUse</code> 回傳 <code>permissionDecision</code>（<code>allow</code> / <code>deny</code> / <code>ask</code>）加上理由。
        但 hook 回傳 allow <b>不會</b>讓呼叫跳過 deny 和 ask 規則 —— 規則仍然是最後一道確定性的門。</p>

      <h3>常用的 hook 時機</h3>
      <table>
        <thead><tr><th>事件</th><th>時機</th><th>編劇場景的用法</th></tr></thead>
        <tbody>
          <tr><td><code>SessionStart</code></td><td>開工時</td><td>載入今天的改稿進度、導演最新意見</td></tr>
          <tr><td><code>UserPromptSubmit</code></td><td>你送出訊息時</td><td>自動附上目前在改哪一集</td></tr>
          <tr><td><code>PreToolUse</code></td><td>工具執行前</td><td>設定一致性檢查、保護已定稿場次</td></tr>
          <tr><td><code>PostToolUse</code></td><td>工具執行後</td><td>Fountain 格式檢查、更新場次表、寫修訂紀錄</td></tr>
          <tr><td><code>PreCompact</code></td><td>壓縮前（第 02 章）</td><td>先把未回收的伏筆存進檔案</td></tr>
          <tr><td><code>Stop</code></td><td>模型想結束時</td><td>修訂紀錄沒更新就不准收工</td></tr>
        </tbody>
      </table>
      <p>實際的事件比這張表多（還有子代理、通知、工作階段結束等）。完整清單以官方 hooks 文件為準。</p>

      <h2>第 3 層：自己做 Harness 時</h2>
      <p>Claude Film 如果是自己寫迴圈，這些機制的本質只是在第 01 章的 <code>execute_tool</code> 前後加判斷：</p>
      <pre>{LOOP_PY}</pre>
      <p>重點有兩個：被擋下時要回傳 <code>is_error: True</code> 的 tool_result，而且<b>理由要寫清楚</b>；驗收的結果要和工具輸出一起交回模型。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>機制</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>allow 規則</td><td>例行工作不用每次請示：場記抄寫、道具歸位。</td></tr>
          <tr><td>ask 規則 / 預設詢問</td><td><b>導演批准</b>。換場景、改對白，要導演點頭才拍。</td></tr>
          <tr><td>deny 規則</td><td><b>製片守門</b>。超預算、已殺青的戲，誰說都不拍。</td></tr>
          <tr><td>permission mode</td><td>今天是「導演全程盯場」還是「交給副導照分鏡拍」。</td></tr>
          <tr><td>PreToolUse hook</td><td><b>場記開拍前比對 continuity</b>：「上一場她左手有疤，這場貼了嗎？」</td></tr>
          <tr><td>PostToolUse hook</td><td>拍完立刻<b>看回放</b>、記入場記表。</td></tr>
          <tr><td>Stop hook</td><td>收工前<b>對通告</b>：今天的鏡頭都拍完了才能放人。</td></tr>
          <tr><td>managed settings</td><td><b>電視台播出規範</b>。劇組自己改不了。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>已定稿的內容做成唯讀。</b> 已播出的集數、已送審的版本，用 deny 規則鎖住，不要只寫在 Bible 裡。</li>
        <li><b>設定一致性交給 PreToolUse hook。</b> 角色年齡、時間線、已死角色不能再出場 —— 這些可以用程式檢查的，就不要只靠模型記得。</li>
        <li><b>改完自動驗收。</b> PostToolUse 跑 Fountain 格式檢查、更新場次表與修訂紀錄。檔案永遠和 Bible 同步，第 08 章的記憶也就有了來源。</li>
        <li><b>重大改動一定要問導演。</b> 刪場、改結局、改角色生死，設成 ask；介面上要讓導演看得懂 diff，而不是只看到一行指令。</li>
        <li><b>擋下時給可行動的理由。</b>「小美設定 28 歲，請改正或先確認是否更新設定集」比「denied」有用得多 —— 模型會照著修。</li>
        <li><b>留下審計紀錄。</b> 每一次批准、拒絕、hook 擋下都記下來。劇本有版權和合約問題，「誰在什麼時候同意了這個修改」是必要的資訊。</li>
        <li><b>產品預設要保守。</b> 編劇不是工程師，不應該需要理解 <code>bypassPermissions</code>。Claude Film 的預設模式應該接近「讀隨意、改要問、定稿不能動」。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>allow 有 <code>Edit(/scenes/**)</code>，deny 有 <code>Edit(/scenes/final/**)</code>。模型要改 <code>scenes/final/ep01.fountain</code>，結果是什麼？為什麼？</li>
        <li>你的 PreToolUse hook 發現問題時用了 <code>exit 1</code>，會發生什麼事？</li>
        <li>PostToolUse hook 擋得住一次錯誤的修改嗎？如果擋不住，它的價值在哪裡？</li>
        <li>「角色不能在死後出場」這條規則，應該寫在 CLAUDE.md、權限規則、還是 hook？各自的優缺點是什麼？</li>
      </ul>
      <p><Link to="/04-tools">← 04 Tools 設計</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/06-subagents">06 Subagents →</Link></p>
    </article>
  );
}
