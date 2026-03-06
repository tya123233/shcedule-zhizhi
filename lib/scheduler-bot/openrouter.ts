import type { InterviewSession, SessionInsights } from "@/lib/scheduler-bot/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_INTERVIEW_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_TIMEOUT_MS = 30_000;

interface InterviewTurnResult {
  reply: string;
  takeaways: string[];
  titleSuggestion: string | null;
  model: string;
  durationMs: number;
}

function stripFence(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
}

function parseJsonLenient<T>(text: string) {
  const cleaned = stripFence(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }

    throw new Error(`OpenRouter 返回 JSON 解析失败: ${cleaned.slice(0, 200)}`);
  }
}

function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY 未配置");
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL_INTERVIEW?.trim() || DEFAULT_INTERVIEW_MODEL,
    referer: process.env.OPENROUTER_HTTP_REFERER?.trim() || "http://localhost:3000",
    title: process.env.OPENROUTER_X_TITLE?.trim() || "schedule-interview-bot",
    timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_SECONDS || "") > 0
      ? Number(process.env.OPENROUTER_TIMEOUT_SECONDS) * 1000
      : DEFAULT_TIMEOUT_MS,
  };
}

function summarizeTopics(insights: SessionInsights) {
  return insights.topicProgress
    .map((topic) => {
      const state = topic.completed ? `已覆盖：${topic.evidence.join(" | ")}` : `待补充：${topic.question}`;
      return `- ${topic.label}: ${state}`;
    })
    .join("\n");
}

function buildRecentTranscript(session: InterviewSession) {
  const recentMessages = session.messages.slice(-6);

  return recentMessages
    .map((message) => `${message.role === "teacher" ? "老师" : "机器人"}：${message.content}`)
    .join("\n");
}

function buildInterviewPrompt(session: InterviewSession, teacherInput: string) {
  const missingTopics = session.insights.missingTopics.length
    ? session.insights.missingTopics.join("、")
    : "九类主题都已覆盖，请继续深挖例外和人工流程。";

  return [
    "你正在扮演一位非常懂学校教务工作的排课访谈官。",
    "目标不是安慰老师，而是把排课系统真实依赖的规则、例外、优先级、人工流程问完整，方便后台建模和复核。",
    "请始终用简体中文回应。",
    "请遵守这些采访规则：",
    "1. 先基于老师刚说的内容做一句到两句精准确认，不能空泛。",
    "2. 每次只追问最关键的 1 到 2 个缺口，不要一次列太多问题。",
    "3. 优先围绕还没覆盖的主题追问，但如果老师刚提到的内容太粗，也可以顺着深挖。",
    "4. 用学校场景里的词说话，例如年级、班级、走班、连堂、调课、教务处、年级主任、实验室。",
    "5. 不要总结成方案，不要替老师下结论，核心是继续采访。",
    "6. takeaways 只提炼老师刚刚这一轮回答里已经明确说出的规则，不要脑补。",
    "",
    `当前覆盖率：${session.insights.completionRate}%`,
    `当前缺失主题：${missingTopics}`,
    "当前主题覆盖情况：",
    summarizeTopics(session.insights),
    "",
    "最近对话：",
    buildRecentTranscript(session),
    "",
    `老师刚刚最新输入：${teacherInput}`,
    "",
    "请只输出 JSON，格式如下：",
    JSON.stringify(
      {
        reply: "给老师的下一条采访回复，80 到 220 字，先确认后追问。",
        takeaways: ["老师刚刚明确说出的规则 1", "老师刚刚明确说出的规则 2"],
        titleSuggestion: "可选，会话标题；没有更好建议时返回 null",
      },
      null,
      2,
    ),
  ].join("\n");
}

function normalizeTakeaways(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

export async function generateInterviewTurn(
  session: InterviewSession,
  teacherInput: string,
): Promise<InterviewTurnResult> {
  const config = getOpenRouterConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": config.referer,
        "X-Title": config.title,
      },
      body: JSON.stringify({
        model: config.model,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "你是学校排课访谈机器人，负责把老师脑中的排课规则采访清楚。你必须输出 JSON，不要输出任何额外文本。",
          },
          {
            role: "user",
            content: buildInterviewPrompt(session, teacherInput),
          },
        ],
        max_tokens: 700,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter 请求失败: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      model?: string;
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenRouter 返回内容为空");
    }

    const parsed = parseJsonLenient<{
      reply?: string;
      takeaways?: unknown;
      titleSuggestion?: string | null;
    }>(content);
    const reply = parsed.reply?.trim();

    if (!reply) {
      throw new Error("OpenRouter 返回缺少 reply");
    }

    return {
      reply,
      takeaways: normalizeTakeaways(parsed.takeaways),
      titleSuggestion: parsed.titleSuggestion?.trim() || null,
      model: data.model || config.model,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function getInterviewModelName() {
  return process.env.OPENROUTER_MODEL_INTERVIEW?.trim() || DEFAULT_INTERVIEW_MODEL;
}
