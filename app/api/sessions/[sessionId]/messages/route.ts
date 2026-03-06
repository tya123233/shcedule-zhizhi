import { NextResponse } from "next/server";

import { getStorageMode } from "@/lib/scheduler-bot/storage-mode";
import { appendTeacherMessage } from "@/lib/scheduler-bot/storage";
import type { InterviewSession } from "@/lib/scheduler-bot/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const storageMode = getStorageMode();
  const body = (await request.json()) as { content?: string; session?: InterviewSession };
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
  }

  if (storageMode === "browser" && !body.session) {
    return NextResponse.json(
      { error: "当前部署使用浏览器本地存储，发送消息时必须携带当前会话。", storageMode },
      { status: 400 },
    );
  }

  const session = await appendTeacherMessage(sessionId, content, body.session ?? null);

  if (!session) {
    return NextResponse.json({ error: "未找到会话" }, { status: 404 });
  }

  return NextResponse.json({ session, storageMode });
}
