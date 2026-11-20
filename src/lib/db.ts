import "server-only";
import { createClient, type Client } from "@libsql/client";

// Turso in production, a local SQLite file in development.
let client: Client | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS circles (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    demo INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    circle TEXT NOT NULL REFERENCES circles(code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    joined_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS members_circle ON members(circle)`,
  `CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    circle TEXT NOT NULL,
    member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    mood TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL DEFAULT '',
    need TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(member, day)
  )`,
  `CREATE INDEX IF NOT EXISTS logs_circle ON logs(circle, created_at)`,
  `CREATE TABLE IF NOT EXISTS sparks (
    id TEXT PRIMARY KEY,
    circle TEXT NOT NULL,
    from_member TEXT NOT NULL,
    to_member TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    seen_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS sparks_circle ON sparks(circle, created_at)`,
  `CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY,
    member TEXT NOT NULL,
    circle TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS push_member ON push_subs(member)`,
];

export async function db(): Promise<Client> {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || "file:kindling.db",
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  if (!ready) {
    const c = client;
    ready = c.batch(SCHEMA, "write").then(() => undefined);
    ready.catch(() => (ready = null));
  }
  await ready;
  return client;
}
