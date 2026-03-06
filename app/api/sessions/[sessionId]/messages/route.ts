import { NextResponse } from "next/server";

import { appendTeacherMessage } from "@/lib/scheduler-bot/storage";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
  }

  const session = await appendTeacherMessage(sessionId, content);

  if (!session) {
    return NextResponse.json({ error: "未找到会话" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
