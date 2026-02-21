import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, "../data");
const dbPath = path.join(dataDir, "waitlist.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NULL,
    phone TEXT NULL,
    created_at TEXT NOT NULL,
    ip TEXT NULL,
    user_agent TEXT NULL,
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
  );
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_unique
    ON waitlist (email)
    WHERE email IS NOT NULL;
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_phone_unique
    ON waitlist (phone)
    WHERE phone IS NOT NULL;
`);

export { db };
