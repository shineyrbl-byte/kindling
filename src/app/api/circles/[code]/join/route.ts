import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanColor, cleanName, err, newId, newToken } from "@/lib/server";

const MAX_SEATS = 12; // a fire, not a stadium: small circles are where people actually notice each other

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.name);
  if (!name) return err(400, "Tell us your name first.");
  const c = await db();
  const r = await c.execute({ sql: "SELECT (SELECT COUNT(*) FROM circles WHERE code = ?) AS ok, COUNT(*) AS n FROM members WHERE circle = ?", args: [code, code] });
  if (!Number(r.rows[0].ok)) return err(404, "No fire with that code. Check the link?");
  if (Number(r.rows[0].n) >= MAX_SEATS) return err(409, `This fire is full (${MAX_SEATS} seats).`);
  const id = newId();
  const token = newToken();
  await c.execute({ sql: "INSERT INTO members (id, circle, name, color, token, joined_at) VALUES (?, ?, ?, ?, ?, ?)", args: [id, code, name, cleanColor(body.color), token, Date.now()] });
  return NextResponse.json({ code, memberId: id, token });
}
