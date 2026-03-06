import { NextResponse } from "next/server";

import { createSession, listSessionSummaries } from "@/lib/scheduler-bot/storage";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await listSessionSummaries();
  return NextResponse.json({ sessions });
}

export async function POST() {
  const session = await createSession();
  return NextResponse.json({ session }, { status: 201 });
}
