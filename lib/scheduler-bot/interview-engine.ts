import { INTERVIEW_TOPICS, INITIAL_ASSISTANT_MESSAGE } from "@/lib/scheduler-bot/topic-map";
import type {
  ChatMessage,
  ChatRole,
  InterviewSession,
  SessionInsights,
  TopicProgress,
} from "@/lib/scheduler-bot/types";

function createDefaultInterviewerMeta() {
  return {
    source: "rules" as const,
    model: null,
    lastDurationMs: null,
    warning: null,
  };
}

function makeId() {
  return crypto.randomUUID();
}

function normalize(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function trimEvidence(input: string) {
  const compact = normalize(input);
  return compact.length <= 96 ? compact : `${compact.slice(0, 93)}...`;
}

function detectTopicMatches(content: string) {
  const normalized = normalize(content);
  return INTERVIEW_TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: makeId(),
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function buildInsights(
  messages: ChatMessage[],
  previous?: Pick<SessionInsights, "aiTakeaways" | "interviewer">,
): SessionInsights {
  const teacherMessages = messages.filter((message) => message.role === "teacher");

  const topicProgress: TopicProgress[] = INTERVIEW_TOPICS.map((topic) => {
    const evidenceMessages = teacherMessages
      .filter((message) =>
        topic.keywords.some((keyword) => normalize(message.content).includes(keyword)),
      )
      .slice(-3);

    return {
      key: topic.key,
      label: topic.label,
      question: topic.question,
      completed: evidenceMessages.length > 0,
      evidence: evidenceMessages.map((message) => trimEvidence(message.content)),
      lastMatchedAt:
        evidenceMessages.length > 0
          ? evidenceMessages[evidenceMessages.length - 1].createdAt
          : null,
    };
  });

  const completedCount = topicProgress.filter((topic) => topic.completed).length;
  const missing = topicProgress.filter((topic) => !topic.completed);

  const defaultRules = topicProgress
    .filter((topic) => topic.evidence.length > 0)
    .map((topic) => `${topic.label}：${topic.evidence[topic.evidence.length - 1]}`)
    .slice(0, 6);

  return {
    completionRate: Math.round((completedCount / INTERVIEW_TOPICS.length) * 100),
    status: missing.length === 0 ? "review-ready" : "collecting",
    missingTopics: missing.map((topic) => topic.label),
    highlightedRules:
      previous?.aiTakeaways && previous.aiTakeaways.length > 0
        ? previous.aiTakeaways
        : defaultRules,
    nextQuestion: missing[0]?.question ?? null,
    topicProgress,
    aiTakeaways: previous?.aiTakeaways ?? [],
    interviewer: previous?.interviewer ?? createDefaultInterviewerMeta(),
  };
}

function buildAcknowledgement(input: string) {
  const matches = detectTopicMatches(input);

  if (matches.length === 0) {
    return "我先记下你刚才的补充。";
  }

  if (matches.length === 1) {
    return `我先记下这部分，重点落在「${matches[0].label}」。`;
  }

  return `我先记下你刚才补充的 ${matches.map((item) => item.label).join("、")}。`;
}

function buildProbe(input: string) {
  const matches = detectTopicMatches(input);
  const latestTopic = matches[0];

  if (!latestTopic || normalize(input).length >= 60) {
    return null;
  }

  return `这部分我还想要更细一点：${latestTopic.detailHint}`;
}

export function buildAssistantReply(session: InterviewSession, teacherInput: string) {
  const acknowledgement = buildAcknowledgement(teacherInput);
  const probe = buildProbe(teacherInput);

  if (session.insights.status === "review-ready") {
    return `${acknowledgement}\n\n现在九类核心信息我已经基本采齐。最后请你再补三件事：\n1. 最容易出错的例外场景\n2. 最常见的人工调整动作\n3. 你希望后台最终一眼看到的判断指标`;
  }

  if (probe) {
    return `${acknowledgement}\n\n${probe}`;
  }

  if (!session.insights.nextQuestion) {
    return `${acknowledgement}\n\n如果还有隐藏规则、临时特例或人工口头约定，也请继续补充，我会继续归档。`;
  }

  return `${acknowledgement}\n\n我继续往下追问：${session.insights.nextQuestion}`;
}

export function makeSessionTitle(existingTitle: string, teacherMessages: ChatMessage[]) {
  if (existingTitle !== "未命名访谈" || teacherMessages.length === 0) {
    return existingTitle;
  }

  const first = normalize(teacherMessages[0].content).replace(/[，。！？；：,.!?;:]/g, " ");
  const short = first.slice(0, 20).trim();

  return short ? `${short}...` : "未命名访谈";
}

export function createInitialSession(): InterviewSession {
  const openingMessage = createMessage("assistant", INITIAL_ASSISTANT_MESSAGE);
  const messages = [openingMessage];

  return {
    id: makeId(),
    title: "未命名访谈",
    createdAt: openingMessage.createdAt,
    updatedAt: openingMessage.createdAt,
    messages,
    insights: buildInsights(messages),
  };
}
