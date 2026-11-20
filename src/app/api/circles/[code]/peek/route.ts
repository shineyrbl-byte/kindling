import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { err } from "@/lib/server";

// What someone with an invite link sees before joining: the fire's name and who's around it.
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const c = await db();
  const [circle, members] = await c.batch(
    [
      { sql: "SELECT name FROM circles WHERE code = ?", args: [code.toUpperCase()] },
      { sql: "SELECT name, color FROM members WHERE circle = ? ORDER BY joined_at", args: [code.toUpperCase()] },
    ],
    "read",
  );
  if (!circle.rows.length) return err(404, "No fire with that code. Check the link?");
  return NextResponse.json({
    name: String(circle.rows[0].name),
    members: members.rows.map((r) => ({ name: String(r.name), color: String(r.color) })),
  });
}
