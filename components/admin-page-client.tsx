"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  getLocalSessionsDigest,
  subscribeToSessionStore,
} from "@/lib/scheduler-bot/browser-storage";
import { formatDateTime } from "@/lib/scheduler-bot/format";
import type { InterviewSession } from "@/lib/scheduler-bot/types";

export function AdminPageClient() {
  const digest = useSyncExternalStore(
    subscribeToSessionStore,
    getLocalSessionsDigest,
    () => "",
  );
  const sessions = useMemo<InterviewSession[]>(() => {
    if (!digest) {
      return [];
    }

    try {
      const entries = JSON.parse(digest) as Array<[string, string]>;
      return entries
        .map(([, raw]) => {
          if (!raw) {
            return null;
          }

          return JSON.parse(raw) as InterviewSession;
        })
        .filter((session): session is InterviewSession => Boolean(session))
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        );
    } catch {
      return [];
    }
  }, [digest]);

  const completedCount = useMemo(
    () => sessions.filter((session) => session.insights.status === "review-ready").length,
    [sessions],
  );
  const averageCoverage = useMemo(
    () =>
      sessions.length === 0
        ? 0
        : Math.round(
            sessions.reduce((total, session) => total + session.insights.completionRate, 0) /
              sessions.length,
          ),
    [sessions],
  );

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand__badge">管</div>
          <div>
            <div className="brand__title">排课访谈后台</div>
            <div className="brand__meta">一键查看老师会话与结构化摘要</div>
          </div>
        </div>
        <div className="topbar__actions">
          <div className="chip">当前采访模型：Claude Sonnet 4.6</div>
          <div className="chip">浏览器本地存储模式</div>
          <Link className="button button--ghost" href="/">
            返回老师聊天页
          </Link>
        </div>
      </div>

      <section className="pageHeader">
        <h1>后台不是看一堆碎聊天，而是直接看排课规则全貌。</h1>
        <p>
          当前部署还没有接入服务端持久化，所以这里展示的是你当前浏览器里保存的访谈记录；同一浏览器下，仍然可以完整查看会话和结构化摘要。
        </p>
      </section>

      <section className="statsGrid">
        <article className="panel statCard">
          <strong>{sessions.length}</strong>
          <span>当前浏览器中的访谈会话</span>
        </article>
        <article className="panel statCard">
          <strong>{completedCount}</strong>
          <span>达到“可复核”状态的会话</span>
        </article>
        <article className="panel statCard">
          <strong>{averageCoverage}%</strong>
          <span>平均主题覆盖率</span>
        </article>
      </section>

      <section className="adminGrid">
        <section className="panel tableCard">
          <h2>最近访谈</h2>
          {sessions.length ? (
            <div className="sessionList">
              {sessions.map((session) => (
                <Link className="sessionLink" href={`/admin/${session.id}`} key={session.id}>
                  <div className="sessionLink__head">
                    <div>
                      <div className="sessionLink__title">{session.title}</div>
                      <div className="sessionLink__meta">
                        最后更新时间：{formatDateTime(session.updatedAt)} · 共 {session.messages.length}{" "}
                        条消息
                      </div>
                    </div>
                    <span
                      className={`pill ${session.insights.status === "review-ready" ? "pill--success" : ""}`}
                    >
                      {session.insights.status === "review-ready"
                        ? "可复核"
                        : `${session.insights.completionRate}%`}
                    </span>
                  </div>
                  <div className="sessionLink__meta">
                    {session.insights.highlightedRules.length
                      ? session.insights.highlightedRules.slice(0, 2).join(" ｜ ")
                      : "还没有提炼出关键规则摘要"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              当前浏览器还没有访谈数据。先去老师聊天页发起一场排课访谈。
            </div>
          )}
        </section>

        <aside className="panel detailCard">
          <h2>查看建议</h2>
          <ul className="bulletList">
            <li>优先打开覆盖率高的会话，通常已经把学校排课逻辑讲得更完整。</li>
            <li>先看“关键规则”，再看“缺失主题”，能快速判断还要不要继续追问。</li>
            <li>如果要跨设备共享后台结果，下一步需要接入 Vercel KV 或数据库。</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
