import { NextResponse } from "next/server";

import { getStorageMode } from "@/lib/scheduler-bot/storage-mode";
import { createSession, listSessionSummaries } from "@/lib/scheduler-bot/storage";

export const runtime = "nodejs";

export async function GET() {
  const sessions = await listSessionSummaries();
  return NextResponse.json({ sessions, storageMode: getStorageMode() });
}

export async function POST() {
  const session = await createSession();
  return NextResponse.json({ session, storageMode: getStorageMode() }, { status: 201 });
}
