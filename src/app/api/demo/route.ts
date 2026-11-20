import { NextResponse } from "next/server";
import type { InStatement } from "@libsql/client";
import { db } from "@/lib/db";
import { cleanName, newCode, newId, newToken } from "@/lib/server";
import { DAY, HOUR, dayKey } from "@/lib/fire";
import { promptFor } from "@/lib/catalog";

// A ready-made fire with three weeks of history, so anyone can feel how Kindling works
// without first convincing five friends to join. Each visitor gets their own private copy.

// Tonight's answers from the demo friends, for a few prompts. The demo picks a circle code
// whose prompt tonight is one of these, so the answers always make sense.
const ANSWERS: Record<string, [string, string, string]> = {
  "What snack would you bring to this fire?": ["Marshmallows obviously, and the spicy chips nobody else likes", "Mum's chocolate cake. I'll sneak a slice out", "Honestly just here for the company tonight"],
  "If today were a song, what would it be?": ["Walking on Sunshine. I PASSED MY DRIVING TEST", "Something lo-fi. Long study day", "Something slow."],
  "What's one small thing that made you smile today?": ["A dog in a tiny raincoat at the bus stop", "The cafeteria had curly fries again", "This group, kind of."],
  "Describe your day in three emojis.": ["🚗✅🎉", "📚☕😴", "📉🌧️🫠"],
  "What's a memory with this group you think about a lot?": ["Leo trying to eat 12 dumplings in one lunch period", "Arguing about pineapple pizza for an ENTIRE free period", "When you all waited for me after my bus broke down"],
  "What's something you're looking forward to this week?": ["Friday movie night!!", "Handing in this history project and never looking at it again", "Not much, honestly. Maybe the weekend."],
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const tz = Number.isFinite(body.tz) ? Math.max(-840, Math.min(840, Number(body.tz))) : 0;
  const myName = cleanName(body.name) || "You";
  const now = Date.now();
  const today = dayKey(now, tz);

  let code = newCode();
  for (let i = 0; i < 200 && !ANSWERS[promptFor(code, today)]; i++) code = newCode();
  const answers = ANSWERS[promptFor(code, today)] ?? ["", "", ""];

  // Local midnight today, so "earlier today" never slips into yesterday.
  const [y, mo, d] = today.split("-").map(Number);
  const midnight = Date.UTC(y, mo - 1, d) + tz * 60_000;
  const earlierToday = (hoursAgo: number) => Math.max(midnight + 60_000, now - hoursAgo * HOUR);
  const eveningOf = (daysAgo: number) => Math.min(now - HOUR, midnight - daysAgo * DAY + 19 * HOUR);

  const people = [
    { key: "you", name: myName, color: "#ff8a5b" },
    { key: "sofia", name: "Sofia", color: "#ffc857" },
    { key: "priya", name: "Priya", color: "#b28dff" },
    { key: "arjun", name: "Arjun", color: "#5bc0eb" },
    { key: "maya", name: "Maya", color: "#7bd389" },
    { key: "leo", name: "Leo", color: "#ff6f91" },
  ].map((p) => ({ ...p, id: newId(), token: newToken() }));
  const id = (key: string) => people.find((p) => p.key === key)!.id;

  const stmts: InStatement[] = [
    { sql: "INSERT INTO circles (code, name, demo, created_at) VALUES (?, ?, 1, ?)", args: [code, "The Lunch Table", now - 40 * DAY] },
    ...people.map((p) => ({
      sql: "INSERT INTO members (id, circle, name, color, token, joined_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [p.id, code, p.name, p.color, p.token, now - 40 * DAY],
    })),
  ];
  const log = (key: string, at: number, mood: string, note = "", answer = "", need: string | null = null) =>
    stmts.push({
      sql: "INSERT OR IGNORE INTO logs (id, circle, member, day, mood, note, answer, need, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [newId(), code, id(key), dayKey(at, tz), mood, note, answer, need, at],
    });

  // Three weeks of history. Who shows up, and when they stopped.
  const moods = ["bright", "okay", "okay", "bright", "okay", "heavy", "bright"];
  for (let ago = 21; ago >= 1; ago--) {
    const m = (k: number) => moods[(ago + k) % moods.length];
    if (ago % 6 !== 0) log("you", eveningOf(ago), m(0));
    log("sofia", eveningOf(ago) - HOUR, m(1));
    if (ago % 4 !== 1) log("priya", eveningOf(ago) + 30 * 60_000, m(2));
    if ((ago >= 11 && ago % 5 !== 0) || ago <= 5) log("arjun", eveningOf(ago) - 2 * HOUR, ago < 3 ? "okay" : m(3), ago === 5 ? "sorry I vanished. thank you for the sparks 🥲" : "");
    if (ago >= 4 && ago % 3 !== 0) log("maya", eveningOf(ago) - 3 * HOUR, ago < 7 ? "heavy" : m(4), ago === 4 ? "so tired lately" : "");
    if (ago >= 8 && ago % 2 === 0) log("leo", eveningOf(ago), m(5), ago === 8 ? "first week at the new school. weird." : "");
  }
  // Tonight
  log("sofia", earlierToday(3), "bright", "passed my driving test!!! 🚗", answers[0]);
  log("priya", earlierToday(2), "okay", "history project is eating my life", answers[1]);
  log("arjun", earlierToday(1), "heavy", "exam results weren't what I hoped.", answers[2], "company");

  // Sparks that landed for you while you were away, and some others already tossed.
  const spark = (from: string, to: string, kind: string, text: string, at: number, seen: boolean) =>
    stmts.push({
      sql: "INSERT INTO sparks (id, circle, from_member, to_member, kind, text, created_at, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [newId(), code, id(from), id(to), kind, text, at, seen ? at + HOUR : null],
    });
  spark("sofia", "you", "seat", "Saved your seat by the fire. It's here whenever you are.", now - 5 * HOUR, false);
  spark("priya", "you", "saw", "Saw this and thought of you: the cat that sits on the library steps had KITTENS 😭", now - 2 * HOUR, false);
  spark("sofia", "maya", "thinking", "Thinking of you. No reply needed.", now - 20 * HOUR, false);
  spark("sofia", "arjun", "seat", "Saved your seat by the fire. It's here whenever you are.", eveningOf(8), true);
  spark("you", "arjun", "thinking", "Thinking of you. No reply needed.", eveningOf(7), true);
  spark("priya", "leo", "miss", "The fire's not the same without you.", now - 3 * DAY, true);
  spark("you", "leo", "call", "Free for a call this week? Zero pressure.", now - 5 * DAY, true);

  const c = await db();
  // Tidy away demo fires older than two days (their created_at is backdated 40 days).
  const old = now - 2 * DAY;
  await c.batch(
    [
      { sql: "DELETE FROM logs WHERE circle IN (SELECT code FROM circles WHERE demo = 1 AND created_at < ? - 38 * 86400000)", args: [old] },
      { sql: "DELETE FROM sparks WHERE circle IN (SELECT code FROM circles WHERE demo = 1 AND created_at < ? - 38 * 86400000)", args: [old] },
      { sql: "DELETE FROM push_subs WHERE circle IN (SELECT code FROM circles WHERE demo = 1 AND created_at < ? - 38 * 86400000)", args: [old] },
      { sql: "DELETE FROM members WHERE circle IN (SELECT code FROM circles WHERE demo = 1 AND created_at < ? - 38 * 86400000)", args: [old] },
      { sql: "DELETE FROM circles WHERE demo = 1 AND created_at < ? - 38 * 86400000", args: [old] },
    ],
    "write",
  );
  await c.batch(stmts, "write");

  return NextResponse.json({
    code,
    memberId: id("you"),
    token: people[0].token,
    seats: people.map((p) => ({ memberId: p.id, name: p.name, token: p.token })),
  });
}
