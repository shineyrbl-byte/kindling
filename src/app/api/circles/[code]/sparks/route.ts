import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanText, err, newId, whoAmI } from "@/lib/server";
import { sparkInfo } from "@/lib/catalog";
import { DAY } from "@/lib/fire";

// Toss a spark to a friend.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire yet.");
  const body = await req.json().catch(() => ({}));
  const info = sparkInfo(String(body.kind));
  if (!info) return err(400, "Unknown spark.");
  const to = String(body.to ?? "");
  if (to === me.id) return err(400, "You can't toss a spark to yourself (nice try).");
  const extra = info.custom ? cleanText(body.extra, 140) : "";
  const text = extra ? `${info.text} ${extra}` : info.text;
  const c = await db();
  const r = await c.batch(
    [
      { sql: "SELECT 1 FROM members WHERE id = ? AND circle = ?", args: [to, code] },
      { sql: "SELECT COUNT(*) AS n FROM sparks WHERE from_member = ? AND created_at > ?", args: [me.id, Date.now() - DAY] },
    ],
    "read",
  );
  if (!r[0].rows.length) return err(404, "That friend isn't at this fire.");
  if (Number(r[1].rows[0].n) >= 40) return err(429, "That's a lot of sparks today. Let the fire breathe!");
  await c.execute({
    sql: "INSERT INTO sparks (id, circle, from_member, to_member, kind, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [newId(), code, me.id, to, info.kind, text, Date.now()],
  });
  return NextResponse.json({ ok: true });
}
