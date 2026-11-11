/**
 * WebBlocker 浏览器扩展后台脚本
 *
 * 每隔 30 秒（以及浏览器启动、扩展安装、打开弹窗时）尝试连接本机主程序，
 * 读取网站列表，并转换成 declarativeNetRequest 动态规则。
 * 主程序没有运行时保留上一次同步的规则。
 */

const PORTS = [8765, 8766, 8767, 8768, 8769, 8770, 8771, 8772, 8773, 8774];
const CACHE_KEY = "webblockerState";
const ALARM_NAME = "webblocker-sync";
const SYNC_MINUTES = 0.5;
const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
];
const DOMAIN_RE =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

let syncing = null;

function sanitizeSites(sites) {
  const result = new Set();
  if (!Array.isArray(sites)) return [];
  for (const item of sites) {
    if (typeof item !== "string") continue;
    const domain = item.trim().toLowerCase();
    if (DOMAIN_RE.test(domain)) result.add(domain);
  }
  return [...result].sort();
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromApp() {
  for (const port of PORTS) {
    try {
      const data = await fetchJson(`http://127.0.0.1:${port}/rules`, 800);
      if (data && data.app === "WebBlocker" && Array.isArray(data.sites)) {
        return data;
      }
    } catch (_error) {
      // 这个端口没有主程序，继续尝试下一个
    }
  }
  return null;
}

async function getCachedState() {
  const values = await chrome.storage.local.get(CACHE_KEY);
  return values[CACHE_KEY] || null;
}

async function applyRules(state) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = current.map((rule) => rule.id);
  const sites = state && state.enabled ? state.sites : [];

  const addRules = sites.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "block" },
    // requestDomains 会同时匹配该域名及其所有子域名
    condition: { requestDomains: [domain], resourceTypes: RESOURCE_TYPES },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  return addRules.length;
}

async function updateBadge(count) {
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  await chrome.action.setBadgeText({
    text: count > 0 ? (count > 99 ? "99+" : String(count)) : "",
  });
}

async function syncNow() {
  if (syncing) return syncing;

  syncing = (async () => {
    const previous = await getCachedState();
    let data = null;
    try {
      data = await fetchFromApp();
    } catch (_error) {
      data = null;
    }

    if (!data) {
      // 主程序没有运行：不清除规则，继续使用上一次同步的结果
      const count = previous && previous.enabled ? previous.sites.length : 0;
      await updateBadge(count);
      return {
        ok: false,
        online: false,
        count,
        total: previous ? previous.sites.length : 0,
        syncedAt: previous ? previous.syncedAt : null,
      };
    }

    const state = {
      enabled: data.enabled !== false,
      sites: sanitizeSites(data.sites),
      syncedAt: Date.now(),
    };

    await chrome.storage.local.set({ [CACHE_KEY]: state });
    const count = await applyRules(state);
    await updateBadge(count);

    return {
      ok: true,
      online: true,
      count,
      total: state.sites.length,
      enabled: state.enabled,
      syncedAt: state.syncedAt,
    };
  })();

  try {
    return await syncing;
  } finally {
    syncing = null;
  }
}

async function getStatus() {
  const state = await getCachedState();
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return { ok: true, state, activeRules: rules.length };
}

async function ensureAlarm() {
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_MINUTES });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm().catch(() => {});
  syncNow().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarm().catch(() => {});
  syncNow().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncNow().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return undefined;

  if (message.type === "sync") {
    syncNow()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, online: false, error: String(error) }));
    return true;
  }

  if (message.type === "status") {
    getStatus()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return undefined;
});

ensureAlarm().catch(() => {});
