import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cleanColor, cleanName, err, newCode, newId, newToken } from "@/lib/server";

// Start a new fire: creates the circle and the first seat.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = cleanName(body.circleName) || "Our fire";
  const memberName = cleanName(body.name);
  if (!memberName) return err(400, "Tell us your name first.");
  const c = await db();
  const code = newCode();
  const id = newId();
  const token = newToken();
  const now = Date.now();
  await c.batch(
    [
      { sql: "INSERT INTO circles (code, name, created_at) VALUES (?, ?, ?)", args: [code, name, now] },
      { sql: "INSERT INTO members (id, circle, name, color, token, joined_at) VALUES (?, ?, ?, ?, ?, ?)", args: [id, code, memberName, cleanColor(body.color), token, now] },
    ],
    "write",
  );
  return NextResponse.json({ code, memberId: id, token });
}
