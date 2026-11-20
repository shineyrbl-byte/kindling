import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err, whoAmI } from "@/lib/server";

// Leave the fire and delete everything you wrote. The last one out puts the fire out.
export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire.");
  const c = await db();
  await c.batch(
    [
      { sql: "DELETE FROM logs WHERE member = ?", args: [me.id] },
      { sql: "DELETE FROM sparks WHERE from_member = ? OR to_member = ?", args: [me.id, me.id] },
      { sql: "DELETE FROM push_subs WHERE member = ?", args: [me.id] },
      { sql: "DELETE FROM members WHERE id = ?", args: [me.id] },
      { sql: "DELETE FROM circles WHERE code = ? AND NOT EXISTS (SELECT 1 FROM members WHERE circle = ?)", args: [code, code] },
    ],
    "write",
  );
  return NextResponse.json({ ok: true });
}
