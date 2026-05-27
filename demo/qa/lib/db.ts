// SQLite reader using node:sqlite (built-in since Node 22.5).
// Read-only — QA never mutates the DB outside its own test users.

import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

const DEFAULT_PATH = process.env.QA_DB_PATH ?? resolve(import.meta.dirname, "../../demo.db");

let db: DatabaseSync | null = null;

export function openDb(path: string = DEFAULT_PATH): DatabaseSync {
  if (db) return db;
  db = new DatabaseSync(path, { readOnly: false });
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | null {
  const stmt = openDb().prepare(sql);
  return (stmt.get(...(params as never[])) as T | undefined) ?? null;
}

export function queryAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T[] {
  const stmt = openDb().prepare(sql);
  return stmt.all(...(params as never[])) as T[];
}

export function execSql(sql: string, params: unknown[] = []) {
  const stmt = openDb().prepare(sql);
  stmt.run(...(params as never[]));
}

/** Delete users created during a QA run. Identified by email containing the run tag. */
export function cleanupTestUsers(tag: string) {
  const d = openDb();
  d.prepare(`DELETE FROM User WHERE email LIKE ?`).run(`%${tag}%`);
}
