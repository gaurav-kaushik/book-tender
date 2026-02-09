import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'book-tender.db')
  db = new Database(dbPath)

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      classification TEXT DEFAULT 'other',
      hash TEXT,
      scanned_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      isbn TEXT,
      cover_url TEXT,
      year INTEGER,
      page_count INTEGER,
      description TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT,
      confidence TEXT DEFAULT 'low',
      verified INTEGER DEFAULT 0,
      source_photo_path TEXT,
      position TEXT,
      spine_text TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS claude_cache (
      photo_hash TEXT PRIMARY KEY,
      response TEXT NOT NULL,
      cached_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS google_books_cache (
      isbn TEXT PRIMARY KEY,
      response TEXT NOT NULL,
      cached_at TEXT DEFAULT (datetime('now'))
    );
  `)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}
