export type ChatRole = "assistant" | "teacher";

export type InterviewStatus = "collecting" | "review-ready";
export type InterviewSource = "openrouter" | "rules";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface TopicProgress {
  key: string;
  label: string;
  question: string;
  completed: boolean;
  evidence: string[];
  lastMatchedAt: string | null;
}

export interface SessionInsights {
  completionRate: number;
  status: InterviewStatus;
  missingTopics: string[];
  highlightedRules: string[];
  nextQuestion: string | null;
  topicProgress: TopicProgress[];
  aiTakeaways: string[];
  interviewer: {
    source: InterviewSource;
    model: string | null;
    lastDurationMs: number | null;
    warning: string | null;
  };
}

export interface InterviewSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  insights: SessionInsights;
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: string;
  status: InterviewStatus;
  completionRate: number;
  messageCount: number;
  missingTopics: string[];
  highlightedRules: string[];
}
