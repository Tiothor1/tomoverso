const Database = require("better-sqlite3");
const db = new Database(process.argv[2] || "data-runtime/tomoverso.db");

// Suspend anonymous author accounts
const result = db
  .prepare(
    `INSERT OR IGNORE INTO user_access_controls (user_id, is_suspended, suspension_reason, updated_at)
     SELECT id, 1, 'Conta de autor importado - atribuição removida', datetime('now')
     FROM users WHERE username LIKE 'author-%' AND email LIKE '%@external.author'`
  )
  .run();

console.log("Suspended:", result.changes);

const stats = db
  .prepare(
    `SELECT
      (SELECT COUNT(*) FROM users) as total,
      (SELECT COUNT(*) FROM users WHERE email NOT LIKE '%@external.author') as real_users,
      (SELECT COUNT(*) FROM user_access_controls WHERE is_suspended = 1) as suspended`
  )
  .get();

console.log("Total:", stats.total, "| Real:", stats.real_users, "| Suspended:", stats.suspended);
db.close();
