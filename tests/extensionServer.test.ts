import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as dbModule from '../electron/db/database';
import * as sessionService from '../electron/db/sessionService';
import * as taskService from '../electron/db/taskService';
import {
  startExtensionServer,
  stopExtensionServer,
  getMonitorStatus,
  setDomainCooldown,
} from '../electron/services/extensionServer';

describe('Extension Server HTTP Bridge (Port 48123)', () => {
  const testDbPath = path.join(__dirname, 'test_extension_server.db');
  let db: DatabaseSync;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new DatabaseSync(testDbPath);
    initializeDatabase(db);
    db.prepare('INSERT OR REPLACE INTO monitor_settings (key, value) VALUES (?, ?)').run('server_port', '48199');

    // Mock getDatabase to return our test db
    vi.spyOn(dbModule, 'getDatabase').mockReturnValue(db);

    startExtensionServer(() => null);
  });

  afterEach(() => {
    stopExtensionServer();
    vi.restoreAllMocks();
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('rejects unauthorized requests without proper X-FocusQuest-Token', async () => {
    const res = await fetch('http://127.0.0.1:48199/api/status');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('handles GET /api/status and POST /api/heartbeat with valid token', async () => {
    const { secretToken } = (await import('../electron/db/distractionService')).getMonitorSettings(db);

    const res = await fetch('http://127.0.0.1:48199/api/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': secretToken,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.monitorEnabled).toBe(true);
    expect(body.isStudying).toBe(false);

    // Monitor status should now be active (heartbeat received)
    expect(getMonitorStatus()).toBe('active');
  });

  it('evaluates domain check accurately via POST /api/check-domain', async () => {
    const { secretToken } = (await import('../electron/db/distractionService')).getMonitorSettings(db);

    // 1. Not studying yet
    const resNotStudying = await fetch('http://127.0.0.1:48199/api/check-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': secretToken,
      },
      body: JSON.stringify({ domain: 'https://m.youtube.com/watch?v=123' }),
    });

    const bodyNotStudying = await resNotStudying.json();
    expect(bodyNotStudying.isDistraction).toBe(false);
    expect(bodyNotStudying.reason).toBe('not_studying');

    // 2. Start session
    const task = taskService.createTask(db, {
      title: 'Math Study',
      mode: 'calculation',
      target_duration_minutes: 20,
    });
    sessionService.startSession(db, task.id, 1200);

    // 3. Now studying: checking blocked site triggers distraction
    const resStudying = await fetch('http://127.0.0.1:48199/api/check-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': secretToken,
      },
      body: JSON.stringify({ domain: 'youtube.com' }),
    });

    const bodyStudying = await resStudying.json();
    expect(bodyStudying.isDistraction).toBe(true);

    // 4. Allowed site does NOT trigger distraction
    const resAllowed = await fetch('http://127.0.0.1:48199/api/check-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': secretToken,
      },
      body: JSON.stringify({ domain: 'github.com' }),
    });

    const bodyAllowed = await resAllowed.json();
    expect(bodyAllowed.isDistraction).toBe(false);
    expect(bodyAllowed.isAllowed).toBe(true);

    // 5. Cooldown suppression
    setDomainCooldown('tiktok.com', 15);
    const resCooldown = await fetch('http://127.0.0.1:48199/api/check-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FocusQuest-Token': secretToken,
      },
      body: JSON.stringify({ domain: 'tiktok.com' }),
    });

    const bodyCooldown = await resCooldown.json();
    expect(bodyCooldown.suppressed).toBe(true);
    expect(bodyCooldown.reason).toBe('in_cooldown');
  });
});
