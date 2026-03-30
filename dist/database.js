"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
const sqlite3_1 = __importDefault(require("sqlite3"));
const sqlite_1 = require("sqlite");
let db = null;
function getDb() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!db) {
            db = yield (0, sqlite_1.open)({
                filename: './database.sqlite',
                driver: sqlite3_1.default.Database
            });
            yield db.exec(`
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
            yield db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        name TEXT,
        size INTEGER,
        type TEXT,
        date TEXT,
        encryption_type TEXT,
        entropy_before REAL,
        entropy_after REAL,
        FOREIGN KEY(user_email) REFERENCES users(email)
      )
    `);
            // Migration: Add missing columns if they don't exist
            const tableInfo = yield db.all("PRAGMA table_info(users)");
            const columnNames = tableInfo.map(col => col.name);
            if (!columnNames.includes('email_verified')) {
                yield db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
            }
            if (!columnNames.includes('verification_token')) {
                yield db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
            }
            if (!columnNames.includes('name')) {
                yield db.exec("ALTER TABLE users ADD COLUMN name TEXT");
            }
        }
        return db;
    });
}
