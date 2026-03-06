import { promises as fs } from "node:fs";
import path from "node:path";

import {
  buildAssistantReply,
  buildInsights,
  createInitialSession,
  createMessage,
  makeSessionTitle,
} from "@/lib/scheduler-bot/interview-engine";
import { generateInterviewTurn } from "@/lib/scheduler-bot/openrouter";
import type { InterviewSession, SessionSummary } from "@/lib/scheduler-bot/types";

const DATA_DIR = path.join(process.cwd(), "data", "sessions");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function getSessionFilePath(sessionId: string) {
  return path.join(DATA_DIR, `${sessionId}.json`);
}

export async function writeSession(session: InterviewSession) {
  await ensureDataDir();
  await fs.writeFile(
    getSessionFilePath(session.id),
    JSON.stringify(session, null, 2),
    "utf8",
  );
}

export async function readSession(sessionId: string) {
  await ensureDataDir();

  try {
    const content = await fs.readFile(getSessionFilePath(sessionId), "utf8");
    return JSON.parse(content) as InterviewSession;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export function toSessionSummary(session: InterviewSession): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    updatedAt: session.updatedAt,
    status: session.insights.status,
    completionRate: session.insights.completionRate,
    messageCount: session.messages.length,
    missingTopics: session.insights.missingTopics,
    highlightedRules: session.insights.highlightedRules,
  };
}

export async function listSessions() {
  await ensureDataDir();

  const files = await fs.readdir(DATA_DIR);
  const sessions = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        const content = await fs.readFile(path.join(DATA_DIR, file), "utf8");
        return JSON.parse(content) as InterviewSession;
      }),
  );

  return sessions.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function listSessionSummaries() {
  const sessions = await listSessions();
  return sessions.map(toSessionSummary);
}

export async function createSession() {
  const session = createInitialSession();
  await writeSession(session);
  return session;
}

function mergeTakeaways(existing: string[], incoming: string[]) {
  return Array.from(
    new Set(
      [...incoming, ...existing]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 6);
}

export async function appendTeacherMessage(sessionId: string, content: string) {
  const session = await readSession(sessionId);

  if (!session) {
    return null;
  }

  const teacherMessage = createMessage("teacher", content);
  const draftMessages = [...session.messages, teacherMessage];
  const draftSession: InterviewSession = {
    ...session,
    title: makeSessionTitle(session.title, draftMessages.filter((item) => item.role === "teacher")),
    updatedAt: teacherMessage.createdAt,
    messages: draftMessages,
    insights: buildInsights(draftMessages, {
      aiTakeaways: session.insights.aiTakeaways,
      interviewer: session.insights.interviewer,
    }),
  };

  let assistantReply = buildAssistantReply(draftSession, content);
  let mergedTakeaways = session.insights.aiTakeaways;
  let interviewer = {
    ...session.insights.interviewer,
  };

  try {
    const interviewTurn = await generateInterviewTurn(draftSession, content);
    assistantReply = interviewTurn.reply;
    mergedTakeaways = mergeTakeaways(session.insights.aiTakeaways, interviewTurn.takeaways);
    interviewer = {
      source: "openrouter",
      model: interviewTurn.model,
      lastDurationMs: interviewTurn.durationMs,
      warning: null,
    };

    if (
      session.title === "未命名访谈" &&
      draftMessages.filter((item) => item.role === "teacher").length === 1 &&
      interviewTurn.titleSuggestion
    ) {
      draftSession.title = interviewTurn.titleSuggestion;
    }
  } catch (error) {
    interviewer = {
      source: "rules",
      model: null,
      lastDurationMs: null,
      warning: error instanceof Error ? error.message : "模型采访失败，已切换规则兜底。",
    };
  }

  const assistantMessage = createMessage("assistant", assistantReply);
  const finalMessages = [...draftMessages, assistantMessage];
  const finalSession: InterviewSession = {
    ...draftSession,
    updatedAt: assistantMessage.createdAt,
    messages: finalMessages,
    insights: buildInsights(finalMessages, {
      aiTakeaways: mergedTakeaways,
      interviewer,
    }),
  };

  await writeSession(finalSession);
  return finalSession;
}
