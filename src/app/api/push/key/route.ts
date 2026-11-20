import { NextResponse } from "next/server";
import { pushKey } from "@/lib/push";

export function GET() {
  return NextResponse.json({ key: pushKey() });
}
