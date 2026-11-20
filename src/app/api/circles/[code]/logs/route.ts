import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { MOODS, NEED_KEYS, cleanDay, cleanText, err, newId, whoAmI } from "@/lib/server";
import type { Mood, Need } from "@/lib/fire";
import { needInfo } from "@/lib/catalog";
import { notifyMembers } from "@/lib/push";

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
  const before = await c.execute({ sql: "SELECT mood FROM logs WHERE member = ? AND day = ?", args: [me.id, day] });
  await c.execute({
    sql: `INSERT INTO logs (id, circle, member, day, mood, note, answer, need, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(member, day) DO UPDATE SET mood = excluded.mood, note = excluded.note, answer = excluded.answer, need = excluded.need, created_at = excluded.created_at`,
    args: [newId(), code, me.id, day, mood, note, answer, need, Date.now()],
  });
  // A heavy day (newly logged, not an edit of one) lets friends know they could bring a blanket.
  if (mood === "heavy" && before.rows[0]?.mood !== "heavy") {
    after(() => notifyBlanket().catch((e) => console.warn("push: blanket notification failed", e)));
    const notifyBlanket = async () => {
      const others = await c.execute({ sql: "SELECT id FROM members WHERE circle = ? AND id != ?", args: [code, me.id] });
      const n = needInfo(need);
      await notifyMembers(others.rows.map((r) => String(r.id)), {
        title: `🧣 ${me.name} could use a blanket`,
        body: n ? `Having a heavy day and ${n.ask}.` : "Having a heavy day.",
        url: `/c/${code}`,
        tag: `blanket-${code}-${me.id}`,
      });
    };
  }
  return NextResponse.json({ ok: true });
}
