import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";
import { DAY, type Log, type Member, type Mood, type Need, type Spark } from "./fire";
import { COLORS } from "./catalog";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function newCode(len = 6): string {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
export const newId = () => randomBytes(8).toString("base64url");
export const newToken = () => randomUUID();

export function err(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function cleanText(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}
export function cleanName(v: unknown): string {
  return cleanText(v, 24);
}
export function cleanColor(v: unknown): string {
  return typeof v === "string" && COLORS.includes(v) ? v : COLORS[Math.floor(Math.random() * COLORS.length)];
}
export function cleanDay(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}
export const MOODS: Mood[] = ["bright", "okay", "heavy"];
export const NEED_KEYS: Need[] = ["company", "distract", "talk", "fyi"];

/** The member making this request, from their seat token. */
export async function whoAmI(req: Request, code: string) {
  const token = req.headers.get("x-kindling-token");
  if (!token) return null;
  const c = await db();
  const r = await c.execute({ sql: "SELECT id, name FROM members WHERE token = ? AND circle = ?", args: [token, code] });
  if (!r.rows.length) return null;
  return { id: String(r.rows[0].id), name: String(r.rows[0].name) };
}

/** Everything the fire screen needs, as seen by one member. */
export async function circleState(code: string, meId: string, today: string) {
  const c = await db();
  const since = Date.now() - 30 * DAY;
  const [circleR, membersR, logsR, sparksR] = await c.batch(
    [
      { sql: "SELECT code, name, demo FROM circles WHERE code = ?", args: [code] },
      { sql: "SELECT id, name, color, joined_at FROM members WHERE circle = ? ORDER BY joined_at", args: [code] },
      { sql: "SELECT id, member, day, mood, note, answer, need, created_at FROM logs WHERE circle = ? AND created_at > ? ORDER BY created_at", args: [code, since] },
      { sql: "SELECT id, from_member, to_member, kind, text, created_at, seen_at FROM sparks WHERE circle = ? AND created_at > ? ORDER BY created_at", args: [code, since] },
    ],
    "read",
  );
  if (!circleR.rows.length) return null;
  const row = circleR.rows[0];
  const members: Member[] = membersR.rows.map((r) => ({ id: String(r.id), name: String(r.name), color: String(r.color), joinedAt: Number(r.joined_at) }));
  const iLoggedToday = logsR.rows.some((r) => r.member === meId && r.day === today);
  const logs: Log[] = logsR.rows.map((r) => {
    // Tonight's answers stay hidden until you've added yours: everyone shares first, then everyone sees.
    const hidden = r.day === today && r.member !== meId && !iLoggedToday;
    return {
      id: String(r.id),
      memberId: String(r.member),
      day: String(r.day),
      mood: String(r.mood) as Mood,
      note: String(r.note),
      answer: hidden ? null : String(r.answer),
      need: (r.need ? String(r.need) : null) as Need | null,
      createdAt: Number(r.created_at),
    };
  });
  // Sparks between other people stay private: you only see that they happened.
  const sparks: Spark[] = sparksR.rows.map((r) => {
    const mine = r.from_member === meId || r.to_member === meId;
    return {
      id: String(r.id),
      from: String(r.from_member),
      to: String(r.to_member),
      kind: mine ? String(r.kind) : "",
      text: mine ? String(r.text) : "",
      createdAt: Number(r.created_at),
      seenAt: r.seen_at == null ? null : Number(r.seen_at),
    };
  });
  return { circle: { code: String(row.code), name: String(row.name), demo: Number(row.demo) === 1 }, me: meId, members, logs, sparks, now: Date.now() };
}

export type CircleState = NonNullable<Awaited<ReturnType<typeof circleState>>>;
