"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatDateTime, formatDurationMs } from "@/lib/scheduler-bot/format";
import type { InterviewSession } from "@/lib/scheduler-bot/types";

const CURRENT_SESSION_KEY = "schedule-interview-current-session";

async function createSession() {
  const response = await fetch("/api/sessions", {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("创建访谈失败");
  }

  const data = (await response.json()) as { session: InterviewSession };
  return data.session;
}

async function getSession(sessionId: string) {
  const response = await fetch(`/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error("读取访谈失败");
  }

  const data = (await response.json()) as { session: InterviewSession };
  return data.session;
}

async function sendTeacherMessage(sessionId: string, content: string) {
  const response = await fetch(`/api/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error("发送消息失败");
  }

  const data = (await response.json()) as { session: InterviewSession };
  return data.session;
}

export function ChatWorkspace() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [booting, setBooting] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const savedSessionId =
          typeof window !== "undefined"
            ? window.localStorage.getItem(CURRENT_SESSION_KEY)
            : null;

        let nextSession: InterviewSession;

        if (savedSessionId) {
          try {
            nextSession = await getSession(savedSessionId);
          } catch {
            nextSession = await createSession();
          }
        } else {
          nextSession = await createSession();
        }

        window.localStorage.setItem(CURRENT_SESSION_KEY, nextSession.id);
        setSession(nextSession);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "加载访谈失败",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.messages.length, sending]);

  const nextQuestion = useMemo(
    () => session?.insights.nextQuestion ?? "等待老师继续补充细节。",
    [session],
  );

  async function handleNewSession() {
    try {
      setBooting(true);
      setError("");
      const nextSession = await createSession();
      window.localStorage.setItem(CURRENT_SESSION_KEY, nextSession.id);
      setInput("");
      setSession(nextSession);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "创建访谈失败",
      );
    } finally {
      setBooting(false);
    }
  }

  async function handleSubmit() {
    if (!session || sending) {
      return;
    }

    const content = input.trim();

    if (!content) {
      return;
    }

    setSending(true);
    setError("");
    setInput("");

    try {
      const nextSession = await sendTeacherMessage(session.id, content);
      setSession(nextSession);
    } catch (requestError) {
      setInput(content);
      setError(
        requestError instanceof Error ? requestError.message : "发送消息失败",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="loadingState">正在准备排课访谈工作台...</div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand__badge">排</div>
          <div>
            <div className="brand__title">排课访谈机器人</div>
            <div className="brand__meta">
              让老师把排课逻辑完整交代清楚，后台直接查看
            </div>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="chip">本地落库到 JSON，无需数据库</div>
          <div className="chip">
            {session?.insights.interviewer.source === "openrouter"
              ? `OpenRouter · ${session.insights.interviewer.model ?? "Claude Sonnet 4.6"}`
              : "规则兜底模式"}
          </div>
          <Link className="button button--ghost" href="/admin">
            进入后台查看
          </Link>
        </div>
      </div>

      <section className="hero">
        <article className="panel heroCard">
          <span className="heroCard__eyebrow">老师侧访谈入口</span>
          <h1>把学校真实排课规则，一次聊透。</h1>
          <p>
            这个机器人不会只问一句“你有什么需求”就结束，而是会围绕总目标、硬性约束、软性偏好、共享资源、例外场景、人工调整流程持续追问，让后端能直接看懂学校是怎么排课的。
          </p>
          <div className="heroCard__grid">
            <div className="heroMetric">
              <strong>9 类</strong>
              <span>关键排课主题被持续追问，不靠老师一次性想全。</span>
            </div>
            <div className="heroMetric">
              <strong>{session?.insights.completionRate ?? 0}%</strong>
              <span>当前访谈覆盖率实时更新，随聊随归档。</span>
            </div>
            <div className="heroMetric">
              <strong>{session?.messages.length ?? 0} 条</strong>
              <span>后台可查看完整来回对话，不只保留最后结论。</span>
            </div>
          </div>
        </article>

        <aside className="panel progressCard">
          <div className="progressCard__head">
            <div>
              <h2>当前访谈覆盖率</h2>
              <div className="brand__meta">
                覆盖越高，后台越容易复原排课规则
              </div>
            </div>
            <span
              className={`pill ${session?.insights.status === "review-ready" ? "pill--success" : ""}`}
            >
              {session?.insights.status === "review-ready" ? "可复核" : "采集中"}
            </span>
          </div>
          <div className="progressBar">
            <span style={{ width: `${session?.insights.completionRate ?? 0}%` }} />
          </div>
          <div className="topicList">
            {session?.insights.topicProgress.map((topic) => (
              <div
                className={`topicCard ${topic.completed ? "topicCard--done" : ""}`}
                key={topic.key}
              >
                <div className="topicCard__title">
                  <span>{topic.label}</span>
                  <span className="topicCard__state">
                    {topic.completed ? "已记录" : "待追问"}
                  </span>
                </div>
                <p>{topic.completed ? topic.evidence[0] : topic.question}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="workspace">
        <section className="panel chatPanel">
          <div className="chatPanel__head">
            <div>
              <h2>{session?.title ?? "未命名访谈"}</h2>
              <p>建议老师像和教务主任开会一样，尽量给出具体规则、例外和优先级。</p>
            </div>
            <div className="buttonRow">
              <button
                className="button button--ghost"
                disabled={booting}
                onClick={() => void handleNewSession()}
                type="button"
              >
                {booting ? "正在新建..." : "新建访谈"}
              </button>
            </div>
          </div>

          <div className="messages">
            <div className="messageList">
              {session?.messages.map((message) => (
                <article
                  className={`message ${message.role === "teacher" ? "message--teacher" : "message--assistant"}`}
                  key={message.id}
                >
                  <div className="message__avatar">
                    {message.role === "teacher" ? "师" : "访"}
                  </div>
                  <div>
                    <div className="message__bubble">{message.content}</div>
                    <div className="message__meta">
                      {message.role === "teacher" ? "老师" : "机器人"} ·{" "}
                      {formatDateTime(message.createdAt)}
                    </div>
                  </div>
                </article>
              ))}
              {sending ? (
                <article className="message message--assistant">
                  <div className="message__avatar">访</div>
                  <div>
                    <div className="message__bubble">
                      正在用 Claude Sonnet 4.6 整理你刚才补充的排课规则...
                    </div>
                  </div>
                </article>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="composer">
            <textarea
              aria-label="排课规则输入框"
              id="teacherInput"
              name="teacherInput"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="例如：我们先保证高三主科上午，数学必须连堂，机房课只能排在周二和周四下午，外聘老师只来周三半天..."
              value={input}
            />
            <div className="composer__foot">
              <div className="composer__hint">
                回车发送，Shift + 回车换行。说得越具体，后台摘要越有价值。
              </div>
              <button
                className="button button--primary"
                disabled={sending || !input.trim()}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {sending ? "发送中..." : "发送并继续追问"}
              </button>
            </div>
            {error ? <div className="errorText">{error}</div> : null}
          </div>
        </section>

        <aside className="detailSection">
          <section className="panel statusCard">
            <h3>机器人下一步会追问什么</h3>
            <div className="statusCard__list">
              <div className="statusItem">
                <strong>下一问</strong>
                <span>{nextQuestion}</span>
              </div>
              <div className="statusItem">
                <strong>当前还缺什么</strong>
                <span>
                  {session?.insights.missingTopics.length
                    ? session.insights.missingTopics.join("、")
                    : "九类核心主题已覆盖，可以开始后台复核。"}
                </span>
              </div>
              <div className="statusItem">
                <strong>本轮采访引擎</strong>
                <span>
                  {session?.insights.interviewer.source === "openrouter"
                    ? `${session.insights.interviewer.model ?? "anthropic/claude-sonnet-4.6"} · ${formatDurationMs(session.insights.interviewer.lastDurationMs)}`
                    : `规则兜底 · ${session?.insights.interviewer.warning ?? "模型暂不可用"}`}
                </span>
              </div>
            </div>
          </section>

          <section className="panel statusCard">
            <h3>后台会看到的关键规则</h3>
            {session?.insights.highlightedRules.length ? (
              <ul className="bulletList">
                {session.insights.highlightedRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : (
              <div className="emptyState">
                先让老师说出第一批排课规则，右侧会实时生成后台摘要。
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
