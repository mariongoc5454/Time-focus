import { DatabaseSync } from 'node:sqlite';
import crypto from 'crypto';
import { DistractionRule } from '../../src/types';
import { normalizeDomain, validateDomain } from '../services/domainMatcher';

interface DbDistractionRow {
  id: string;
  domain: string;
  enabled: number;
  is_allowed: number;
  created_at: string;
  updated_at: string;
}

function mapRowToRule(row: DbDistractionRow): DistractionRule {
  return {
    id: row.id,
    domain: row.domain,
    enabled: Boolean(row.enabled),
    is_allowed: Boolean(row.is_allowed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getDistractionRules(db: DatabaseSync): DistractionRule[] {
  const rows = db
    .prepare('SELECT * FROM distraction_rules ORDER BY is_allowed ASC, domain ASC')
    .all() as unknown as DbDistractionRow[];

  return rows.map(mapRowToRule);
}

export function getDistractionRuleById(db: DatabaseSync, id: string): DistractionRule | null {
  const row = db.prepare('SELECT * FROM distraction_rules WHERE id = ?').get(id) as unknown as
    | DbDistractionRow
    | undefined;

  return row ? mapRowToRule(row) : null;
}

export function addDistractionRule(
  db: DatabaseSync,
  rawDomain: string,
  isAllowed: boolean = false
): DistractionRule {
  const validation = validateDomain(rawDomain);
  if (!validation.valid) {
    throw new Error(validation.error || 'Tên miền không hợp lệ.');
  }

  const domain = normalizeDomain(rawDomain);

  // Check if domain already exists
  const existing = db.prepare('SELECT id FROM distraction_rules WHERE domain = ?').get(domain);
  if (existing) {
    throw new Error(`Website "${domain}" đã có trong danh sách.`);
  }

  const id = 'rule_' + crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO distraction_rules (id, domain, enabled, is_allowed, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?, ?)
  `).run(id, domain, isAllowed ? 1 : 0, now, now);

  return getDistractionRuleById(db, id)!;
}

export function updateDistractionRule(
  db: DatabaseSync,
  id: string,
  updates: Partial<Pick<DistractionRule, 'domain' | 'enabled' | 'is_allowed'>>
): DistractionRule {
  const existing = getDistractionRuleById(db, id);
  if (!existing) {
    throw new Error(`Rule ${id} not found.`);
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];
  const now = new Date().toISOString();

  if (updates.domain !== undefined) {
    const validation = validateDomain(updates.domain);
    if (!validation.valid) {
      throw new Error(validation.error || 'Tên miền không hợp lệ.');
    }
    const normalized = normalizeDomain(updates.domain);
    fields.push('domain = ?');
    values.push(normalized);
  }

  if (updates.enabled !== undefined) {
    fields.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (updates.is_allowed !== undefined) {
    fields.push('is_allowed = ?');
    values.push(updates.is_allowed ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(id);

  db.prepare(`UPDATE distraction_rules SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  return getDistractionRuleById(db, id)!;
}

export function deleteDistractionRule(db: DatabaseSync, id: string): boolean {
  const result = db.prepare('DELETE FROM distraction_rules WHERE id = ?').run(id);
  return result.changes > 0;
}

export function toggleDistractionRule(db: DatabaseSync, id: string, enabled: boolean): DistractionRule {
  const now = new Date().toISOString();
  db.prepare('UPDATE distraction_rules SET enabled = ?, updated_at = ? WHERE id = ?').run(
    enabled ? 1 : 0,
    now,
    id
  );
  return getDistractionRuleById(db, id)!;
}

export function getMonitorSettings(db: DatabaseSync): {
  enabled: boolean;
  secretToken: string;
  serverPort: number;
  cooldownMinutes: number;
} {
  const rows = db.prepare('SELECT key, value FROM monitor_settings').all() as unknown as Array<{
    key: string;
    value: string;
  }>;

  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.key, r.value);
  }

  return {
    enabled: map.get('enabled') === '1',
    secretToken: map.get('secret_token') || 'focusquest_default_token',
    serverPort: Number(map.get('server_port') || 48123),
    cooldownMinutes: Number(map.get('cooldown_minutes') || 15),
  };
}

export function setMonitorEnabled(db: DatabaseSync, enabled: boolean): boolean {
  db.prepare('INSERT OR REPLACE INTO monitor_settings (key, value) VALUES (?, ?)').run(
    'enabled',
    enabled ? '1' : '0'
  );
  return enabled;
}
