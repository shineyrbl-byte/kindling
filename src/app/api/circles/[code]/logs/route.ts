import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MOODS, NEED_KEYS, cleanDay, cleanText, err, newId, whoAmI } from "@/lib/server";
import type { Mood, Need } from "@/lib/fire";

// Add (or update) tonight's log. One per person per day.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire yet.");
  const body = await req.json().catch(() => ({}));
  const day = cleanDay(body.day);
  if (!day) return err(400, "Missing day.");
  const mood = body.mood as Mood;
  if (!MOODS.includes(mood)) return err(400, "Pick how today felt.");
  const need = mood === "heavy" && NEED_KEYS.includes(body.need) ? (body.need as Need) : null;
  const note = cleanText(body.note, 160);
  const answer = cleanText(body.answer, 200);
  const c = await db();
  await c.execute({
    sql: `INSERT INTO logs (id, circle, member, day, mood, note, answer, need, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(member, day) DO UPDATE SET mood = excluded.mood, note = excluded.note, answer = excluded.answer, need = excluded.need, created_at = excluded.created_at`,
    args: [newId(), code, me.id, day, mood, note, answer, need, Date.now()],
  });
  return NextResponse.json({ ok: true });
}
