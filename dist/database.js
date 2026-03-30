"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
let db;
function getDb() {
    if (!db) {
        db = new better_sqlite3_1.default("/tmp/database.sqlite");
        db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        reset_token TEXT,
        reset_token_expiry DATETIME,
        email_verified INTEGER DEFAULT 0,
        verification_token TEXT
      )
    `);
        db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        name TEXT,
        size INTEGER,
        type TEXT,
        date TEXT,
        encryption_type TEXT,
        entropy_before REAL,
        entropy_after REAL
      )
    `);
        // Migration check
        const tableInfo = db.prepare("PRAGMA table_info(users)").all();
        const columnNames = tableInfo.map((col) => col.name);
        if (!columnNames.includes("email_verified")) {
            db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
        }
        if (!columnNames.includes("verification_token")) {
            db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
        }
        if (!columnNames.includes("name")) {
            db.exec("ALTER TABLE users ADD COLUMN name TEXT");
        }
    }
    return db;
}
