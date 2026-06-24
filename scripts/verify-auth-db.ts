import Database = require("better-sqlite3");

const db = new Database("data/tomoverso.db");
const user = db.prepare("SELECT id,email,username,display_name,role FROM users WHERE email=?").get("testauth0624@example.com");
const sessions = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE user_id=(SELECT id FROM users WHERE email=?)").get("testauth0624@example.com");
console.log(JSON.stringify({ user, sessions }));
