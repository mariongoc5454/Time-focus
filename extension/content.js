// FocusQuest In-Page Content Script (Shadow DOM Isolated)

const BANNER_HOST_ID = 'focusquest-distraction-root';

function removeExistingBanner() {
  const existing = document.getElementById(BANNER_HOST_ID);
  if (existing) {
    existing.remove();
  }
}

function showDistractionBanner(domain) {
  removeExistingBanner();

  const host = document.createElement('div');
  host.id = BANNER_HOST_ID;
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100%';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';

  const shadow = host.attachShadow({ mode: 'open' });

  // Styles isolated in shadow root: zero interference from Facebook's CSS
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .fq-wrapper {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 520px;
      width: calc(100% - 32px);
      pointer-events: auto;
      animation: fqSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fqSlideDown {
      from {
        opacity: 0;
        transform: translate(-50%, -20px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0) scale(1);
      }
    }
    .fq-card {
      background: #111726;
      color: #f1f5f9;
      border: 1px solid rgba(245, 158, 11, 0.6);
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.25);
      position: relative;
      overflow: hidden;
    }
    .fq-top-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6);
    }
    .fq-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .fq-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .fq-text {
      flex: 1;
    }
    .fq-tag {
      display: block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #fbbf24;
      margin-bottom: 3px;
    }
    .fq-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.35;
    }
    .fq-domain {
      color: #fde047;
      font-family: monospace;
      text-decoration: underline;
    }
    .fq-subtitle {
      margin-top: 4px;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .fq-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 14px;
    }
    .fq-btn-primary {
      width: 100%;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.18s ease;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35);
    }
    .fq-btn-primary:hover {
      background: #6d28d9;
      transform: translateY(-1px);
    }
    .fq-btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .fq-btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.18s ease;
    }
    .fq-btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }
    .fq-btn-pause {
      background: rgba(239, 68, 68, 0.12);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.18s ease;
    }
    .fq-btn-pause:hover {
      background: rgba(239, 68, 68, 0.22);
      color: #ffffff;
    }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'fq-wrapper';
  wrapper.innerHTML = `
    <div class="fq-card">
      <div class="fq-top-accent"></div>
      <div class="fq-header">
        <div class="fq-icon">⚠️</div>
        <div class="fq-text">
          <span class="fq-tag">Phát Hiện Website Xao Nhãng</span>
          <div class="fq-title">Bạn đang ở trên <span class="fq-domain">${domain}</span>.</div>
          <p class="fq-subtitle">Bạn có muốn quay lại nhiệm vụ học tập không?</p>
        </div>
      </div>
      <div class="fq-actions">
        <button id="fq-btn-back" class="fq-btn-primary">
          <span>📖</span> Quay lại học
        </button>
        <div class="fq-btn-row">
          <button id="fq-btn-ignore" class="fq-btn-secondary">
            <span>⏰</span> Bỏ qua lần này
          </button>
          <button id="fq-btn-pause" class="fq-btn-pause">
            <span>⏸️</span> Tạm dừng phiên học
          </button>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // Safe mounting to DOM
  const mount = () => {
    const parent = document.body || document.documentElement;
    if (parent && !document.getElementById(BANNER_HOST_ID)) {
      parent.appendChild(host);
    }
  };

  mount();
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', mount);
    window.addEventListener('load', mount);
  }

  // Bind actions
  shadow.getElementById('fq-btn-back')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ACTION_BACK_TO_STUDY' });
    removeExistingBanner();
  });

  shadow.getElementById('fq-btn-ignore')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ACTION_IGNORE_COOLDOWN', domain });
    removeExistingBanner();
  });

  shadow.getElementById('fq-btn-pause')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ACTION_PAUSE_SESSION' });
    removeExistingBanner();
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SHOW_DISTRACTION_BANNER') {
    showDistractionBanner(request.domain || window.location.hostname);
    sendResponse({ ok: true });
    return true;
  }
  if (request.type === 'HIDE_DISTRACTION_BANNER') {
    removeExistingBanner();
    sendResponse({ ok: true });
    return true;
  }
});

// Self-check function
function triggerCheck() {
  try {
    const currentHost = window.location.hostname;
    const currentUrl = window.location.href;
    if (currentHost && !currentHost.includes('127.0.0.1') && !currentHost.includes('localhost')) {
      chrome.runtime.sendMessage(
        { type: 'CHECK_CURRENT_PAGE', hostname: currentHost, url: currentUrl },
        (res) => {
          if (chrome.runtime.lastError) return;
          if (res && res.shouldAlert) {
            showDistractionBanner(res.domain || currentHost);
          }
        }
      );
    }
  } catch {
    // ignore
  }
}

// Initial trigger on load
triggerCheck();

// Watch for URL changes in SPA (Facebook, YouTube, etc.)
let lastUrl = location.href;
try {
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      triggerCheck();
    }
  }).observe(document, { subtree: true, childList: true });
} catch {
  // ignore
}
