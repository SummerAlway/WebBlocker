const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const totalEl = document.getElementById("total");
const syncedEl = document.getElementById("synced");
const button = document.getElementById("sync");

function formatTime(timestamp) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("zh-CN", { hour12: false });
}

function render(result) {
  if (!result) {
    statusEl.textContent = "无法获取状态";
    statusEl.className = "bad";
    return;
  }

  if (result.ok) {
    statusEl.textContent = result.enabled === false ? "已连接（拦截已关闭）" : "已同步";
    statusEl.className = "good";
  } else {
    statusEl.textContent = "主程序未运行";
    statusEl.className = "bad";
  }

  countEl.textContent = String(result.count ?? 0);
  totalEl.textContent = String(result.total ?? 0);
  if (result.syncedAt) syncedEl.textContent = formatTime(result.syncedAt);
}

async function syncNow() {
  button.disabled = true;
  statusEl.textContent = "同步中…";
  statusEl.className = "";

  try {
    const result = await chrome.runtime.sendMessage({ type: "sync" });
    render(result);
  } catch (_error) {
    statusEl.textContent = "同步失败";
    statusEl.className = "bad";
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", syncNow);
syncNow();
