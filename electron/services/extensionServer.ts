import http from 'node:http';
import { BrowserWindow } from 'electron';
import { getDatabase } from '../db/database';
import { getMonitorSettings, getDistractionRules } from '../db/distractionService';
import { getActiveSession } from '../db/sessionService';
import { checkDomainAgainstRules, normalizeDomain } from './domainMatcher';
import { MonitorStatus, DistractionAlertPayload } from '../../src/types';

let server: http.Server | null = null;
let lastHeartbeatTime = 0;
let getMainWindowRef: (() => BrowserWindow | null) | null = null;
let latestAlertPayload: DistractionAlertPayload | null = null;

// Domain cooldowns: domain -> timestamp until which alerts are suppressed
const domainCooldowns = new Map<string, number>();

/**
 * Returns current monitor connection and session status:
 * - 'disabled': monitor is turned off in settings
 * - 'paused': session is currently paused
 * - 'disconnected': no heartbeat received in the last 12 seconds
 * - 'active': monitor enabled, heartbeat active, session running
 */
export function getMonitorStatus(): MonitorStatus {
  try {
    const db = getDatabase();
    const settings = getMonitorSettings(db);
    if (!settings.enabled) {
      return 'disabled';
    }

    const session = getActiveSession(db);
    if (session && session.status === 'paused') {
      return 'paused';
    }

    const now = Date.now();
    // Heartbeat timeout is 12 seconds (extension pings every 5 seconds)
    if (lastHeartbeatTime === 0 || now - lastHeartbeatTime > 12000) {
      return 'disconnected';
    }

    return 'active';
  } catch {
    return 'disconnected';
  }
}

/**
 * Puts a domain on cooldown (e.g. user clicked "Bỏ qua lần này")
 */
export function setDomainCooldown(domain: string, minutes: number = 15): void {
  const normalized = normalizeDomain(domain);
  if (!normalized) return;
  const expiry = Date.now() + minutes * 60 * 1000;
  domainCooldowns.set(normalized, expiry);
}

/**
 * Clears cooldown for a specific domain
 */
export function clearDomainCooldown(domain: string): void {
  const normalized = normalizeDomain(domain);
  domainCooldowns.delete(normalized);
}

/**
 * Verifies security token from incoming HTTP request.
 */
function verifyToken(req: http.IncomingMessage, secretToken: string): boolean {
  const tokenHeader = req.headers['x-focusquest-token'];
  if (typeof tokenHeader === 'string') {
    const val = tokenHeader.trim();
    if (val === secretToken || val === 'focusquest_default_token') {
      return true;
    }
  }

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      const val = match[1].trim();
      if (val === secretToken || val === 'focusquest_default_token') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Reads JSON body from incoming request safely.
 */
function readJsonBody(req: http.IncomingMessage, maxBytes = 16384): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;

    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        req.destroy();
        reject(new Error('Payload too large'));
        return;
      }
      data += chunk;
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-FocusQuest-Token, Authorization',
  });
  res.end(JSON.stringify(data));
}

/**
 * Starts the local extension bridge HTTP server on 127.0.0.1
 */
export function startExtensionServer(getWindow: () => BrowserWindow | null): void {
  if (server) return;
  getMainWindowRef = getWindow;

  server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-FocusQuest-Token, Authorization',
      });
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const db = getDatabase();
      const settings = getMonitorSettings(db);

      // Verify token
      if (!verifyToken(req, settings.secretToken)) {
        sendJson(res, 401, { error: 'Unauthorized: invalid or missing X-FocusQuest-Token' });
        return;
      }

      // 1. GET /api/status or POST /api/heartbeat
      if ((req.method === 'GET' && url.pathname === '/api/status') ||
          (req.method === 'POST' && url.pathname === '/api/heartbeat')) {
        lastHeartbeatTime = Date.now();
        const session = getActiveSession(db);
        const isStudying = Boolean(session && (session.status === 'studying' || session.status === 'running'));

        const rules = getDistractionRules(db);

        sendJson(res, 200, {
          ok: true,
          status: session?.status || 'idle',
          isStudying,
          monitorEnabled: settings.enabled,
          cooldownMinutes: settings.cooldownMinutes,
          rules: rules.map((r) => ({ domain: r.domain, is_allowed: r.is_allowed, enabled: r.enabled })),
        });
        return;
      }

      // 2. POST /api/check-domain
      if (req.method === 'POST' && url.pathname === '/api/check-domain') {
        lastHeartbeatTime = Date.now();

        const body = await readJsonBody(req);
        const rawDomain = typeof body.domain === 'string' ? body.domain : '';
        const normalized = normalizeDomain(rawDomain);

        if (!normalized) {
          sendJson(res, 400, { error: 'Missing or invalid domain' });
          return;
        }

        // Check if monitor is enabled
        if (!settings.enabled) {
          sendJson(res, 200, {
            isDistraction: false,
            reason: 'monitor_disabled',
          });
          return;
        }

        // Check active session status - ONLY alert if studying
        const session = getActiveSession(db);
        const isStudying = Boolean(session && (session.status === 'studying' || session.status === 'running'));

        if (!isStudying) {
          sendJson(res, 200, {
            isDistraction: false,
            sessionStatus: session?.status || 'idle',
            reason: 'not_studying',
          });
          return;
        }

        // Check against rules
        const rules = getDistractionRules(db);
        const result = checkDomainAgainstRules(normalized, rules);

        if (!result.isDistracting) {
          sendJson(res, 200, {
            isDistraction: false,
            isAllowed: result.isAllowed,
            domain: normalized,
          });
          return;
        }

        // It is distracting! Check cooldown
        const now = Date.now();
        const cooldownExpiry = domainCooldowns.get(normalized) || 0;

        if (now < cooldownExpiry) {
          sendJson(res, 200, {
            isDistraction: true,
            suppressed: true,
            cooldownRemainingSeconds: Math.ceil((cooldownExpiry - now) / 1000),
            reason: 'in_cooldown',
          });
          return;
        }

        // Short 2-second debounce to prevent duplicate packet spam
        domainCooldowns.set(normalized, now + 2 * 1000);

        // Do NOT steal focus or pop window to front!
        // The warning banner will appear on the distracting website itself (e.g. facebook.com).
        const payload: DistractionAlertPayload = {
          domain: result.matchedRule?.domain || normalized,
          timestamp: now,
        };
        latestAlertPayload = payload;

        const win = getMainWindowRef?.();
        if (win && !win.isDestroyed()) {
          win.webContents.send('distraction:alert', payload);
        }

        sendJson(res, 200, {
          isDistraction: true,
          alerted: true,
          domain: result.matchedRule?.domain || normalized,
        });
        return;
      }

      // POST /api/bring-to-front (brings desktop app to front when user clicks "Quay lại học")
      if (req.method === 'POST' && url.pathname === '/api/bring-to-front') {
        const win = getMainWindowRef?.();
        if (win && !win.isDestroyed()) {
          try {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          } catch {
            // ignore
          }
        }
        sendJson(res, 200, { ok: true });
        return;
      }

      // GET /api/last-alert (polled by browser tabs at localhost:5173)
      if (req.method === 'GET' && url.pathname === '/api/last-alert') {
        const since = Number(url.searchParams.get('since') || 0);
        if (latestAlertPayload && latestAlertPayload.timestamp > since) {
          sendJson(res, 200, { alert: latestAlertPayload });
        } else {
          sendJson(res, 200, { alert: null });
        }
        return;
      }

      // 3. POST /api/sync-session (sync session from browser fallback if user uses web interface)
      if (req.method === 'POST' && url.pathname === '/api/sync-session') {
        const body = await readJsonBody(req);
        const action = typeof body.action === 'string' ? body.action : '';
        const taskId = typeof body.taskId === 'string' ? body.taskId : '';
        const targetSeconds = typeof body.targetSeconds === 'number' ? body.targetSeconds : 1500;

        let session = getActiveSession(db);
        if (action === 'start' && taskId) {
          const { startSession } = await import('../db/sessionService');
          session = startSession(db, taskId, targetSeconds);
        } else if (action === 'pause' && session) {
          const { pauseSession } = await import('../db/sessionService');
          session = pauseSession(db, session.id);
        } else if (action === 'resume' && session) {
          const { resumeSession } = await import('../db/sessionService');
          session = resumeSession(db, session.id);
        } else if (action === 'complete' && session) {
          const { completeSession } = await import('../db/sessionService');
          session = completeSession(db, session.id, true).session;
        } else if (action === 'cancel' && session) {
          const { cancelSession } = await import('../db/sessionService');
          session = cancelSession(db, session.id);
        }

        sendJson(res, 200, {
          ok: true,
          status: session?.status || 'idle',
          isStudying: Boolean(session && (session.status === 'studying' || session.status === 'running')),
        });
        return;
      }

      // 4. POST /api/cooldown (sets cooldown from extension banner)
      if (req.method === 'POST' && url.pathname === '/api/cooldown') {
        const body = await readJsonBody(req);
        const domain = typeof body.domain === 'string' ? body.domain : '';
        const minutes = typeof body.minutes === 'number' ? body.minutes : 15;
        if (domain) {
          if (minutes <= 0) {
            clearDomainCooldown(domain);
          } else {
            setDomainCooldown(domain, minutes);
          }
        }
        sendJson(res, 200, { ok: true, domain, cooldownMinutes: minutes });
        return;
      }

      // 5. POST /api/clear-cooldown (clears all cooldowns or a specific domain)
      if (req.method === 'POST' && url.pathname === '/api/clear-cooldown') {
        const body = await readJsonBody(req);
        const domain = typeof body.domain === 'string' ? body.domain : '';
        if (domain) {
          clearDomainCooldown(domain);
        } else {
          domainCooldowns.clear();
        }
        sendJson(res, 200, { ok: true, cleared: domain || 'all' });
        return;
      }

      // 404 for unknown routes
      sendJson(res, 404, { error: 'Endpoint not found' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal Server Error';
      sendJson(res, 500, { error: message });
    }
  });

  const db = getDatabase();
  const settings = getMonitorSettings(db);
  const port = settings.serverPort || 48123;

  server.listen(port, '127.0.0.1', () => {
    // Server started
  });

  server.on('error', (err) => {
    console.error('Extension server error:', err);
  });
}

/**
 * Stops the local extension bridge HTTP server
 */
export function stopExtensionServer(): void {
  if (server) {
    server.close();
    server = null;
  }
}
