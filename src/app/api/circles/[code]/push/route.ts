import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err, whoAmI } from "@/lib/server";

// Turn notifications on or off for your seat at this fire, on this device.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire yet.");
  const body = await req.json().catch(() => ({}));
  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || typeof sub?.keys?.p256dh !== "string" || typeof sub?.keys?.auth !== "string") {
    return err(400, "That notification subscription doesn't look right.");
  }
  const c = await db();
  await c.execute({
    sql: `INSERT INTO push_subs (endpoint, member, circle, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET member = excluded.member, circle = excluded.circle, p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, me.id, code, sub.keys.p256dh.slice(0, 200), sub.keys.auth.slice(0, 100), Date.now()],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire.");
  const body = await req.json().catch(() => ({}));
  const c = await db();
  await c.execute({ sql: "DELETE FROM push_subs WHERE member = ? AND endpoint = ?", args: [me.id, String(body.endpoint ?? "")] });
  return NextResponse.json({ ok: true });
}
