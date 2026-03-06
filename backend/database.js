import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

// Initialize with verbose to ensure we get the correct object structure in ESM
const sql = sqlite3.verbose();
const db = new sql.Database('./blake.db');

export const initDatabase = async () => {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password_hash TEXT,
      pin_hash TEXT,
      role TEXT,
      balance REAL,
      reputation INTEGER,
      created_at TEXT,
      last_login TEXT,
      vip_until TEXT,
      cosmetics TEXT DEFAULT '{}',
      is_banned INTEGER DEFAULT 0
    )`);

    // Transactions Table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      sender_id TEXT,
      receiver_id TEXT,
      sender_name TEXT,
      receiver_name TEXT,
      amount REAL,
      type TEXT,
      timestamp TEXT
    )`);

    // Listings Table (Marketplace)
    db.run(`CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_name TEXT,
      title TEXT,
      description TEXT,
      price REAL,
      created_at TEXT,
      boost_until TEXT
    )`);

    // Purchases Table (Marketplace)
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      listing_id TEXT,
      timestamp TEXT,
      UNIQUE(user_id, listing_id)
    )`);

    // Q&A - Questions Table
    db.run(`CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      title TEXT,
      description TEXT,
      created_at TEXT,
      is_solved INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0
    )`);

    // Q&A - Answers Table
    db.run(`CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      question_id TEXT,
      author_id TEXT,
      content TEXT,
      created_at TEXT,
      is_accepted INTEGER DEFAULT 0,
      FOREIGN KEY(question_id) REFERENCES questions(id)
    )`);

    // Q&A - Votes Table
    db.run(`CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      target_id TEXT,
      type TEXT, -- 'up' or 'down'
      UNIQUE(user_id, target_id)
    )`);

    // Reports Table
    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT,
      content_id TEXT,
      reason TEXT,
      timestamp TEXT
    )`);

    // Migrations for existing databases
    const runMigration = (query) => {
      db.run(query, (err) => {
        // Ignore "duplicate column name" errors
        if (err && !err.message.includes('duplicate column')) {
          console.error("Migration warning:", err.message);
        }
      });
    };

    runMigration("ALTER TABLE users ADD COLUMN vip_until TEXT");
    runMigration("ALTER TABLE users ADD COLUMN cosmetics TEXT DEFAULT '{}'");
    runMigration("ALTER TABLE listings ADD COLUMN boost_until TEXT");
    runMigration("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0");

    // Seed Admin if not exists
    db.get("SELECT * FROM users WHERE username = ?", ['blake'], async (err, row) => {
      if (err) {
        console.error("Database error checking for admin:", err);
        return;
      }
      if (!row) {
        const hashedPassword = await bcrypt.hash('Kikolikoioane1', 10);
        const hashedPin = await bcrypt.hash('0000', 10);
        
        const stmt = db.prepare(`INSERT INTO users (id, username, password_hash, pin_hash, role, balance, reputation, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(
          'usr_admin_001',
          'blake', // Username as requested
          hashedPassword,
          hashedPin,
          'admin',
          1000.0,
          100,
          new Date().toISOString(),
          new Date().toISOString()
        );
        stmt.finalize();
        console.log("Admin account 'blake' created successfully.");
      }
    });
  });
};

export default db;