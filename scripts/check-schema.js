const Database = require("better-sqlite3");
const db = new Database(process.argv[2] || "data-runtime/tomoverso.db", { readonly: true });

// Schema
console.log("=== user_access_controls ===");
const s = db.prepare("SELECT sql FROM sqlite_master WHERE name='user_access_controls'").get();
console.log(s?.sql || "NOT FOUND");

console.log("\n=== Anon authors ===");
const anon = db.prepare("SELECT id, username, email FROM users WHERE username LIKE 'author-%' AND email LIKE '%@external.author'").all();
console.log(JSON.stringify(anon, null, 2));

// Check if there are access controls already
console.log("\n=== Existing access controls ===");
const controls = db.prepare("SELECT * FROM user_access_controls LIMIT 5").all();
console.log(JSON.stringify(controls, null, 2));

db.close();
