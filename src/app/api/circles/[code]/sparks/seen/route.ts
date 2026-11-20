import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err, whoAmI } from "@/lib/server";

// You warmed your hands on the sparks that landed while you were away.
export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire yet.");
  const c = await db();
  await c.execute({ sql: "UPDATE sparks SET seen_at = ? WHERE to_member = ? AND seen_at IS NULL", args: [Date.now(), me.id] });
  return NextResponse.json({ ok: true });
}
