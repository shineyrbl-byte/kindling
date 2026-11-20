import { NextResponse } from "next/server";
import { circleState, cleanDay, err, whoAmI } from "@/lib/server";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = (await ctx.params).code.toUpperCase();
  const me = await whoAmI(req, code);
  if (!me) return err(401, "You don't have a seat at this fire yet.");
  const day = cleanDay(new URL(req.url).searchParams.get("day"));
  if (!day) return err(400, "Missing day.");
  const state = await circleState(code, me.id, day);
  if (!state) return err(404, "This fire has gone out.");
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
