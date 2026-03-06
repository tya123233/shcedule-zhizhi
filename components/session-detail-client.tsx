"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  getLocalSessionRaw,
  subscribeToSessionStore,
} from "@/lib/scheduler-bot/browser-storage";
import { formatDurationMs, formatFullDateTime } from "@/lib/scheduler-bot/format";
import type { InterviewSession } from "@/lib/scheduler-bot/types";

interface SessionDetailClientProps {
  sessionId: string;
}

export function SessionDetailClient({ sessionId }: SessionDetailClientProps) {
  const rawSession = useSyncExternalStore(
    subscribeToSessionStore,
    () => getLocalSessionRaw(sessionId),
    () => "",
  );
  const session = useMemo<InterviewSession | null>(() => {
    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as InterviewSession;
    } catch {
      return null;
    }
  }, [rawSession]);

  if (!session) {
    return (
      <main className="shell">
        <div className="topbar">
          <div className="brand">
            <div className="brand__badge">详</div>
            <div>
              <div className="brand__title">未找到访谈详情</div>
              <div className="brand__meta">当前浏览器里没有这场访谈记录。</div>
            </div>
          </div>
          <div className="topbar__actions">
            <Link className="button button--ghost" href="/admin">
              返回会话列表
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand__badge">详</div>
          <div>
            <div className="brand__title">{session.title}</div>
            <div className="brand__meta">
              创建于 {formatFullDateTime(session.createdAt)} · 最近更新于{" "}
              {formatFullDateTime(session.updatedAt)}
            </div>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="chip">浏览器本地存储模式</div>
          <Link className="button button--ghost" href="/admin">
            返回会话列表
          </Link>
        </div>
      </div>

      <section className="detailLayout">
        <aside className="detailSection">
          <section className="panel detailCard">
            <div className="inlineRow">
              <h2>结构化摘要</h2>
              <span
                className={`pill ${session.insights.status === "review-ready" ? "pill--success" : ""}`}
              >
                {session.insights.status === "review-ready" ? "可复核" : "采集中"}
              </span>
            </div>
            <div className="detailCard__meta">
              主题覆盖率 {session.insights.completionRate}% 。后台可以据此判断这场访谈是否已经足够支持后续建模。
            </div>
            <div className="detailCard__meta">
              采访引擎：
              {session.insights.interviewer.source === "openrouter"
                ? ` ${session.insights.interviewer.model ?? "anthropic/claude-sonnet-4.6"} · ${formatDurationMs(session.insights.interviewer.lastDurationMs)}`
                : ` 规则兜底 · ${session.insights.interviewer.warning ?? "模型暂不可用"}`}
            </div>
            <div className="detailCard__meta">会话存储：当前浏览器本地保存</div>
            <ul className="bulletList">
              {session.insights.highlightedRules.length ? (
                session.insights.highlightedRules.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>还没有提炼出规则摘要。</li>
              )}
            </ul>
          </section>

          <section className="panel detailCard">
            <h2>缺失主题</h2>
            {session.insights.missingTopics.length ? (
              <ul className="bulletList">
                {session.insights.missingTopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            ) : (
              <div className="emptyState">九类主题都已经覆盖，可以进入人工复核阶段。</div>
            )}
          </section>

          <section className="panel detailCard">
            <h2>主题覆盖详情</h2>
            <div className="topicList">
              {session.insights.topicProgress.map((topic) => (
                <div
                  className={`topicCard ${topic.completed ? "topicCard--done" : ""}`}
                  key={topic.key}
                >
                  <div className="topicCard__title">
                    <span>{topic.label}</span>
                    <span className="topicCard__state">
                      {topic.completed ? "已记录" : "待补充"}
                    </span>
                  </div>
                  <p>{topic.completed ? topic.evidence.join(" ｜ ") : topic.question}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="panel detailCard">
          <h2>完整访谈记录</h2>
          <div className="transcript">
            {session.messages.map((message) => (
              <article
                className={`transcriptItem ${message.role === "teacher" ? "transcriptItem--teacher" : ""}`}
                key={message.id}
              >
                <div className="transcriptItem__meta">
                  <span>{message.role === "teacher" ? "老师" : "机器人"}</span>
                  <span>{formatFullDateTime(message.createdAt)}</span>
                </div>
                <div className="transcriptItem__content">{message.content}</div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
