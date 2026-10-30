import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { initializeDatabase } from '../electron/db/schema';
import * as distractionService from '../electron/db/distractionService';

describe('Distraction Rules & Website Manager CRUD', () => {
  const testDbPath = path.join(__dirname, 'test_distraction_rules.db');
  let db: DatabaseSync;

  beforeEach(() => {
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
  });

  it('initializes with default seed rules including blocked and allowed websites', () => {
    const rules = distractionService.getDistractionRules(db);
    expect(rules.length).toBeGreaterThanOrEqual(8);

    const youtube = rules.find((r) => r.domain === 'youtube.com');
    expect(youtube).toBeDefined();
    expect(youtube?.is_allowed).toBe(false);
    expect(youtube?.enabled).toBe(true);

    const github = rules.find((r) => r.domain === 'github.com');
    expect(github).toBeDefined();
    expect(github?.is_allowed).toBe(true);
  });

  it('adds a website with automatic normalization from URL', () => {
    const rule = distractionService.addDistractionRule(
      db,
      'https://www.bilibili.com/video/BV123?param=test#hash',
      false
    );

    expect(rule.domain).toBe('bilibili.com');
    expect(rule.enabled).toBe(true);
    expect(rule.is_allowed).toBe(false);

    // Verify it is queryable in DB
    const fetched = distractionService.getDistractionRuleById(db, rule.id);
    expect(fetched?.domain).toBe('bilibili.com');
  });

  it('rejects invalid or empty domain inputs with clear errors', () => {
    expect(() => distractionService.addDistractionRule(db, '', false)).toThrow(
      'Tên miền không được để trống.'
    );
    expect(() => distractionService.addDistractionRule(db, 'invalid-domain-no-extension', false)).toThrow(
      'Định dạng tên miền không hợp lệ'
    );
  });

  it('prevents adding duplicate domains', () => {
    distractionService.addDistractionRule(db, 'twitter.com', false);
    expect(() => distractionService.addDistractionRule(db, 'https://www.twitter.com', false)).toThrow(
      'đã có trong danh sách'
    );
  });

  it('toggles rule enabled state', () => {
    const rule = distractionService.addDistractionRule(db, 'pinterest.com', false);
    expect(rule.enabled).toBe(true);

    const disabled = distractionService.toggleDistractionRule(db, rule.id, false);
    expect(disabled.enabled).toBe(false);

    const reEnabled = distractionService.toggleDistractionRule(db, rule.id, true);
    expect(reEnabled.enabled).toBe(true);
  });

  it('updates rule domain and handles allowlist changes', () => {
    const rule = distractionService.addDistractionRule(db, 'discord.com', false);
    const updated = distractionService.updateDistractionRule(db, rule.id, {
      domain: 'https://discord.gg',
      is_allowed: true,
    });

    expect(updated.domain).toBe('discord.gg');
    expect(updated.is_allowed).toBe(true);
  });

  it('deletes a rule cleanly', () => {
    const rule = distractionService.addDistractionRule(db, 'netflix.com', false);
    expect(distractionService.getDistractionRuleById(db, rule.id)).not.toBeNull();

    const success = distractionService.deleteDistractionRule(db, rule.id);
    expect(success).toBe(true);
    expect(distractionService.getDistractionRuleById(db, rule.id)).toBeNull();
  });

  it('manages master monitor enable/disable settings', () => {
    const initialSettings = distractionService.getMonitorSettings(db);
    expect(initialSettings.enabled).toBe(true);

    distractionService.setMonitorEnabled(db, false);
    const updated = distractionService.getMonitorSettings(db);
    expect(updated.enabled).toBe(false);

    distractionService.setMonitorEnabled(db, true);
    expect(distractionService.getMonitorSettings(db).enabled).toBe(true);
  });
});
