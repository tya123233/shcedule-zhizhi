import { NextResponse } from "next/server";

import { getStorageMode } from "@/lib/scheduler-bot/storage-mode";
import { readSession } from "@/lib/scheduler-bot/storage";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function GET(_: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const storageMode = getStorageMode();

  if (storageMode === "browser") {
    return NextResponse.json(
      { error: "当前部署使用浏览器本地存储，请在当前浏览器中查看会话。", storageMode },
      { status: 400 },
    );
  }

  const session = await readSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "未找到会话" }, { status: 404 });
  }

  return NextResponse.json({ session, storageMode });
}
