import { DatabaseSync } from 'node:sqlite';

export function initializeDatabase(db: DatabaseSync): void {
  // WAL mode for high performance and durability
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Migration tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    );
  `);

  applyMigration(db, '001_initial_schema', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        target_duration_minutes INTEGER NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'todo',
        actual_duration_seconds INTEGER NOT NULL DEFAULT 0,
        reward_xp INTEGER NOT NULL DEFAULT 50,
        reward_food INTEGER NOT NULL DEFAULT 2,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS study_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        chain_id TEXT,
        status TEXT NOT NULL DEFAULT 'idle',
        start_timestamp INTEGER NOT NULL DEFAULT 0,
        accumulated_seconds INTEGER NOT NULL DEFAULT 0,
        target_seconds INTEGER NOT NULL,
        is_break INTEGER NOT NULL DEFAULT 0,
        break_duration_seconds INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        species TEXT NOT NULL,
        name TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        current_xp INTEGER NOT NULL DEFAULT 0,
        xp_to_next_level INTEGER NOT NULL DEFAULT 100,
        hunger INTEGER NOT NULL DEFAULT 50,
        happiness INTEGER NOT NULL DEFAULT 80,
        is_active INTEGER NOT NULL DEFAULT 0,
        unlocked_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pet_inventory (
        id TEXT PRIMARY KEY,
        item_type TEXT NOT NULL DEFAULT 'food',
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        xp_value INTEGER NOT NULL DEFAULT 15,
        happiness_value INTEGER NOT NULL DEFAULT 20
      );

      CREATE TABLE IF NOT EXISTS reward_ledger (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        food_amount INTEGER NOT NULL,
        claimed_at TEXT NOT NULL,
        CONSTRAINT uq_reward UNIQUE (source_type, source_id)
      );

      CREATE TABLE IF NOT EXISTS daily_settings (
        date TEXT PRIMARY KEY,
        selected_mode TEXT NOT NULL DEFAULT 'mixed',
        daily_goal_target_tasks INTEGER NOT NULL DEFAULT 3,
        daily_goal_bonus_claimed INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT ''
      );
    `);

    seedDefaultData(db);
  });

  applyMigration(db, '002_distraction_rules', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS distraction_rules (
        id TEXT PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        is_allowed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS monitor_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    seedDistractionRules(db);
  });
}

function applyMigration(db: DatabaseSync, name: string, migrationFn: () => void): void {
  const checkStmt = db.prepare('SELECT id FROM _migrations WHERE name = ?');
  const existing = checkStmt.get(name);
  if (!existing) {
    db.exec('BEGIN TRANSACTION;');
    try {
      migrationFn();
      const insertStmt = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');
      insertStmt.run(name, new Date().toISOString());
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
}

function seedDefaultData(db: DatabaseSync): void {
  const now = new Date().toISOString();

  // Check if default pet exists
  const petCount = db.prepare('SELECT COUNT(*) as c FROM pets').get() as { c: number };
  if (petCount.c === 0) {
    const insertPet = db.prepare(`
      INSERT INTO pets (id, species, name, level, current_xp, xp_to_next_level, hunger, happiness, is_active, unlocked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPet.run('pet_fox', 'fox', 'Lumi the Star Fox', 1, 0, 100, 60, 90, 1, now);
    insertPet.run('pet_shiba', 'shiba', 'Pochi the Shiba', 1, 0, 100, 50, 80, 0, now);
    insertPet.run('pet_cat', 'cat', 'Nyx the Moon Cat', 1, 0, 100, 50, 80, 0, now);
    insertPet.run('pet_dragon', 'dragon', 'Ignis the Star Dragon', 1, 0, 100, 50, 80, 0, now);
    insertPet.run('pet_owl', 'owl', 'Athena the Wisdom Owl', 1, 0, 100, 50, 80, 0, now);
  }

  // Check inventory
  const invCount = db.prepare('SELECT COUNT(*) as c FROM pet_inventory').get() as { c: number };
  if (invCount.c === 0) {
    const insertInv = db.prepare(`
      INSERT INTO pet_inventory (id, item_type, item_name, quantity, xp_value, happiness_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertInv.run('food_berry', 'food', 'Star Berry', 5, 20, 25);
    insertInv.run('food_fish', 'food', 'Celestial Fish', 2, 40, 45);
    insertInv.run('food_bento', 'food', 'Focus Bento', 1, 80, 70);
  }
}

function seedDistractionRules(db: DatabaseSync): void {
  const now = new Date().toISOString();

  // Distraction defaults
  const distCount = db.prepare('SELECT COUNT(*) as c FROM distraction_rules').get() as { c: number };
  if (distCount.c === 0) {
    const insertRule = db.prepare(`
      INSERT INTO distraction_rules (id, domain, enabled, is_allowed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Common distracting sites (blocked)
    insertRule.run('rule_youtube', 'youtube.com', 1, 0, now, now);
    insertRule.run('rule_facebook', 'facebook.com', 1, 0, now, now);
    insertRule.run('rule_fb', 'fb.com', 1, 0, now, now);
    insertRule.run('rule_tiktok', 'tiktok.com', 1, 0, now, now);
    insertRule.run('rule_reddit', 'reddit.com', 1, 0, now, now);
    insertRule.run('rule_x', 'x.com', 1, 0, now, now);
    insertRule.run('rule_instagram', 'instagram.com', 1, 0, now, now);

    // Common study allowlist sites (never blocked)
    insertRule.run('rule_github', 'github.com', 1, 1, now, now);
    insertRule.run('rule_stackoverflow', 'stackoverflow.com', 1, 1, now, now);
  }

  // Monitor settings default
  const insertSetting = db.prepare('INSERT OR IGNORE INTO monitor_settings (key, value) VALUES (?, ?)');
  insertSetting.run('enabled', '1');
  insertSetting.run('secret_token', 'focusquest_sec_' + Math.random().toString(36).substring(2, 12));
  insertSetting.run('server_port', '48123');
  insertSetting.run('cooldown_minutes', '15');
}

