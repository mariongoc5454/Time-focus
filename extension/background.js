// FocusQuest Distraction Monitor - Background Service Worker (Manifest V3)

const DEFAULT_SERVER_URL = 'http://127.0.0.1:48123';
const DEFAULT_TOKEN = 'focusquest_default_token';

let cachedToken = DEFAULT_TOKEN;
let cachedServerUrl = DEFAULT_SERVER_URL;
let isConnected = false;
let sessionStatus = 'idle';
let isStudying = false;

// Fast in-memory cached rules & local cooldowns
let cachedRules = [
  { domain: 'youtube.com', is_allowed: false, enabled: true },
  { domain: 'facebook.com', is_allowed: false, enabled: true },
  { domain: 'fb.com', is_allowed: false, enabled: true },
  { domain: 'tiktok.com', is_allowed: false, enabled: true },
  { domain: 'reddit.com', is_allowed: false, enabled: true },
  { domain: 'x.com', is_allowed: false, enabled: true },
  { domain: 'instagram.com', is_allowed: false, enabled: true },
  { domain: 'github.com', is_allowed: true, enabled: true },
  { domain: 'stackoverflow.com', is_allowed: true, enabled: true },
];

const localCooldowns = new Map(); // domain -> expiry timestamp

// Load settings from storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['secretToken', 'serverUrl', 'isStudying', 'sessionStatus'], (data) => {
      if (data.secretToken) cachedToken = data.secretToken;
      if (data.serverUrl) cachedServerUrl = data.serverUrl;
      if (typeof data.isStudying === 'boolean') isStudying = data.isStudying;
      if (data.sessionStatus) sessionStatus = data.sessionStatus;
      resolve();
    });
  });
}

// Extract clean hostname from a full URL or domain string
function getHostname(url) {
  if (!url) return null;
  try {
    let str = String(url).trim();
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      str = 'https://' + str;
    }
    const parsed = new URL(str);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.substring(4);
    return host;
  } catch {
    return null;
  }
}

// Check hostname against in-memory rules with subdomain support
function evaluateDomainLocally(hostname) {
  if (!hostname) return { isDistraction: false };

  // Facebook & fb.com alias handling
  if (hostname === 'fb.com' || hostname.endsWith('.fb.com')) {
    return { isDistraction: true, domain: 'facebook.com' };
  }

  // 1. Check Allowlist first
  for (const r of cachedRules) {
    if (r.enabled && r.is_allowed) {
      if (hostname === r.domain || hostname.endsWith('.' + r.domain)) {
        return { isDistraction: false, isAllowed: true };
      }
    }
  }

  // 2. Check Blocklist
  for (const r of cachedRules) {
    if (r.enabled && !r.is_allowed) {
      if (hostname === r.domain || hostname.endsWith('.' + r.domain)) {
        return { isDistraction: true, domain: r.domain };
      }
    }
  }

  return { isDistraction: false };
}

// Send heartbeat to FocusQuest desktop app
async function sendHeartbeat() {
  try {
    const res = await fetch(`${cachedServerUrl}/api/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
    });

    if (res.ok) {
      const data = await res.json();
      isConnected = true;
      sessionStatus = data.status || 'idle';
      isStudying = Boolean(data.isStudying);
      if (Array.isArray(data.rules) && data.rules.length > 0) {
        cachedRules = data.rules;
        // Ensure fb.com is included if facebook.com exists
        if (cachedRules.some((r) => r.domain === 'facebook.com') && !cachedRules.some((r) => r.domain === 'fb.com')) {
          cachedRules.push({ domain: 'fb.com', is_allowed: false, enabled: true });
        }
      }

      chrome.storage.local.set({
        isConnected: true,
        lastHeartbeat: Date.now(),
        sessionStatus,
        isStudying,
      });

      // If studying, inspect active tab immediately
      if (isStudying) {
        checkCurrentTabDomain();
      }
    } else {
      isConnected = false;
      chrome.storage.local.set({ isConnected: false });
    }
  } catch {
    isConnected = false;
    chrome.storage.local.set({ isConnected: false });
  }
}

// Helper: inject content script if not present
async function injectContentScriptIfNeeded(tabId, domain) {
  try {
    if (chrome.scripting) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      }).catch(() => {});
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_DISTRACTION_BANNER',
          domain,
        }).catch(() => {});
      }, 60);
    }
  } catch {
    // ignore
  }
}

// Check current domain with FocusQuest desktop app
async function checkCurrentTabDomain(targetTabId) {
  let tabId = targetTabId;

  try {
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) return;
      tabId = activeTab.id;
    }

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.active || !tab.url) return;

    const hostname = getHostname(tab.url);
    if (!hostname) return;

    const cooldownExpiry = localCooldowns.get(hostname) || 0;
    if (Date.now() < cooldownExpiry) return;

    const localCheck = evaluateDomainLocally(hostname);
    if (!localCheck.isDistraction) return;

    const domainName = localCheck.domain || hostname;

    // Check with local server
    const res = await fetch(`${cachedServerUrl}/api/check-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
      body: JSON.stringify({ domain: hostname }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isDistraction && !data.suppressed && data.reason !== 'not_studying') {
        isStudying = true;
        chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_DISTRACTION_BANNER',
          domain: data.domain || domainName,
        }).catch(() => {
          injectContentScriptIfNeeded(tabId, data.domain || domainName);
        });
      } else if (data.reason === 'not_studying') {
        isStudying = false;
      }
    }
  } catch {
    // ignore
  }
}

// Tab activation listener (instant on tab switch)
chrome.tabs.onActivated.addListener((activeInfo) => {
  checkCurrentTabDomain(activeInfo.tabId);
});

// Tab update listener (fires as soon as URL changes or page starts loading)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && (changeInfo.status === 'loading' || changeInfo.url)) {
    checkCurrentTabDomain(tabId);
  }
});

// Setup periodic heartbeat alarm
chrome.alarms.create('focusquest_heartbeat', { periodInMinutes: 0.08 }); // ~5 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'focusquest_heartbeat') {
    sendHeartbeat();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings();
  sendHeartbeat();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadSettings();
  sendHeartbeat();
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING') {
    sendHeartbeat().then(() => {
      sendResponse({ isConnected, sessionStatus, isStudying });
    });
    return true;
  }

  if (request.type === 'SETTINGS_UPDATED') {
    loadSettings().then(() => {
      sendHeartbeat();
    });
    sendResponse({ ok: true });
    return false;
  }

  // Fast in-page check requested directly by content.js upon loading
  if (request.type === 'CHECK_CURRENT_PAGE') {
    const rawTarget = request.hostname || request.url || sender.tab?.url;
    const host = getHostname(rawTarget);
    if (!host) {
      sendResponse({ shouldAlert: false });
      return false;
    }

    const expiry = localCooldowns.get(host) || 0;
    if (Date.now() < expiry) {
      sendResponse({ shouldAlert: false, reason: 'in_cooldown' });
      return false;
    }

    const evalResult = evaluateDomainLocally(host);
    if (!evalResult.isDistraction) {
      sendResponse({ shouldAlert: false });
      return false;
    }

    const domainName = evalResult.domain || host;

    // Direct check with desktop server (fast ~1ms response)
    fetch(`${cachedServerUrl}/api/check-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
      body: JSON.stringify({ domain: host }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isDistraction && !data.suppressed && data.reason !== 'not_studying') {
          isStudying = true;
          sendResponse({ shouldAlert: true, domain: data.domain || domainName });
        } else {
          if (data.reason === 'not_studying') isStudying = false;
          sendResponse({ shouldAlert: false, reason: data.reason });
        }
      })
      .catch(() => {
        if (isStudying) {
          sendResponse({ shouldAlert: true, domain: domainName });
        } else {
          sendResponse({ shouldAlert: false });
        }
      });

    return true; // Keep message channel open for async response
  }

  // Content Banner Actions
  if (request.type === 'ACTION_BACK_TO_STUDY') {
    // 1. Bring FocusQuest desktop window to front
    fetch(`${cachedServerUrl}/api/bring-to-front`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
    }).catch(() => {});

    // 2. Also switch to browser tab if running in browser
    chrome.tabs.query({}, (tabs) => {
      const studyTab = tabs.find(
        (t) => t.url && (t.url.includes('localhost:5173') || t.url.includes('127.0.0.1:5173') || (t.title && t.title.includes('FocusQuest')))
      );
      if (studyTab && studyTab.id) {
        chrome.tabs.update(studyTab.id, { active: true });
        if (studyTab.windowId) {
          chrome.windows.update(studyTab.windowId, { focused: true });
        }
      }
    });

    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'ACTION_IGNORE_COOLDOWN') {
    const host = getHostname(request.domain);
    if (host) {
      localCooldowns.set(host, Date.now() + 15 * 60 * 1000);
      if (host === 'facebook.com') localCooldowns.set('fb.com', Date.now() + 15 * 60 * 1000);
    }
    fetch(`${cachedServerUrl}/api/cooldown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
      body: JSON.stringify({ domain: request.domain, minutes: 15 }),
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'ACTION_PAUSE_SESSION') {
    isStudying = false;
    sessionStatus = 'paused';
    chrome.storage.local.set({ isStudying: false, sessionStatus: 'paused' });

    fetch(`${cachedServerUrl}/api/sync-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
      body: JSON.stringify({ action: 'pause' }),
    }).catch(() => {});

    // Hide banners across tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((t) => {
        if (t.id) chrome.tabs.sendMessage(t.id, { type: 'HIDE_DISTRACTION_BANNER' }).catch(() => {});
      });
    });

    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'CLEAR_COOLDOWNS') {
    localCooldowns.clear();
    fetch(`${cachedServerUrl}/api/clear-cooldown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': cachedToken,
      },
      body: JSON.stringify({}),
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});

// Initial run
loadSettings().then(() => sendHeartbeat());
