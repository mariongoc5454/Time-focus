import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as distractionService from '../electron/db/distractionService';
import * as sessionService from '../electron/db/sessionService';
import * as taskService from '../electron/db/taskService';
import { checkDomainAgainstRules } from '../electron/services/domainMatcher';

describe('Distraction Monitor Integration & Session Rules', () => {
  const testDbPath = path.join(__dirname, 'test_distraction_integration.db');
  let db: DatabaseSync;

  beforeEach(() => {
    vi.useFakeTimers();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new DatabaseSync(testDbPath);
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    vi.useRealTimers();
  });

  it('triggers distraction match only when website is in blocked list and not allowlisted', () => {
    const rules = distractionService.getDistractionRules(db);

    // Blocked: youtube.com and subdomains
    const resYoutube = checkDomainAgainstRules('youtube.com', rules);
    expect(resYoutube.isDistracting).toBe(true);
    expect(resYoutube.isAllowed).toBe(false);

    const resMobileYoutube = checkDomainAgainstRules('m.youtube.com', rules);
    expect(resMobileYoutube.isDistracting).toBe(true);

    // Whitelisted: github.com and subdomains
    const resGithub = checkDomainAgainstRules('github.com', rules);
    expect(resGithub.isDistracting).toBe(false);
    expect(resGithub.isAllowed).toBe(true);

    const resGist = checkDomainAgainstRules('gist.github.com', rules);
    expect(resGist.isDistracting).toBe(false);
    expect(resGist.isAllowed).toBe(true);

    // Unlisted normal educational sites do not trigger
    const resDocs = checkDomainAgainstRules('developer.mozilla.org', rules);
    expect(resDocs.isDistracting).toBe(false);
    expect(resDocs.isAllowed).toBe(false);
  });

  it('evaluates alerts strictly based on session state: only alerts when studying, never when paused', () => {
    const task = taskService.createTask(db, {
      title: 'Calculus Exercises',
      mode: 'calculation',
      target_duration_minutes: 25,
    });

    const rules = distractionService.getDistractionRules(db);

    // Helper simulating extension bridge check logic
    const checkCanAlert = (domain: string): { shouldAlert: boolean; reason?: string } => {
      const settings = distractionService.getMonitorSettings(db);
      if (!settings.enabled) return { shouldAlert: false, reason: 'monitor_disabled' };

      const activeSession = sessionService.getActiveSession(db);
      const isStudying = Boolean(activeSession && (activeSession.status === 'studying' || activeSession.status === 'running'));
      if (!isStudying) return { shouldAlert: false, reason: 'not_studying' };

      const check = checkDomainAgainstRules(domain, rules);
      if (!check.isDistracting) return { shouldAlert: false, reason: 'not_distracting' };

      return { shouldAlert: true };
    };

    // 1. Before session starts: no active session -> NO alert
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(false);
    expect(checkCanAlert('youtube.com').reason).toBe('not_studying');

    // 2. Start session: status = 'studying' -> SHOULD alert
    const session = sessionService.startSession(db, task.id, 1500);
    expect(session.status).toBe('studying');
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(true);

    // Whitelisted site during study session does NOT alert
    expect(checkCanAlert('github.com').shouldAlert).toBe(false);

    // 3. User pauses session -> MUST NOT alert
    sessionService.pauseSession(db, session.id);
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(false);
    expect(checkCanAlert('youtube.com').reason).toBe('not_studying');

    // 4. User resumes session -> SHOULD alert again
    sessionService.resumeSession(db, session.id);
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(true);

    // 5. If master monitor toggle is turned OFF -> MUST NOT alert
    distractionService.setMonitorEnabled(db, false);
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(false);
    expect(checkCanAlert('youtube.com').reason).toBe('monitor_disabled');

    // 6. Turn monitor back ON, end session -> NO alert
    distractionService.setMonitorEnabled(db, true);
    sessionService.cancelSession(db, session.id);
    expect(checkCanAlert('youtube.com').shouldAlert).toBe(false);
    expect(checkCanAlert('youtube.com').reason).toBe('not_studying');
  });

  it('respects cooldown intervals to avoid alert spam', () => {
    const cooldownMap = new Map<string, number>();

    const setCooldown = (domain: string, minutes: number) => {
      cooldownMap.set(domain, Date.now() + minutes * 60 * 1000);
    };

    const isSuppressed = (domain: string): boolean => {
      const expiry = cooldownMap.get(domain) || 0;
      return Date.now() < expiry;
    };

    // Initially not suppressed
    expect(isSuppressed('youtube.com')).toBe(false);

    // User clicks "Bỏ qua lần này" (15m cooldown)
    setCooldown('youtube.com', 15);
    expect(isSuppressed('youtube.com')).toBe(true);

    // 10 minutes pass: still in cooldown
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(isSuppressed('youtube.com')).toBe(true);

    // 6 more minutes pass (total 16m): cooldown has expired
    vi.advanceTimersByTime(6 * 60 * 1000);
    expect(isSuppressed('youtube.com')).toBe(false);
  });
});
