import Link from "next/link";

import { formatDateTime } from "@/lib/scheduler-bot/format";
import { listSessionSummaries } from "@/lib/scheduler-bot/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessions = await listSessionSummaries();
  const completedCount = sessions.filter((session) => session.status === "review-ready").length;
  const averageCoverage =
    sessions.length === 0
      ? 0
      : Math.round(
          sessions.reduce((total, session) => total + session.completionRate, 0) /
            sessions.length,
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
          <Link className="button button--ghost" href="/">
            返回老师聊天页
          </Link>
        </div>
      </div>

      <section className="pageHeader">
        <h1>后台不是看一堆碎聊天，而是直接看排课规则全貌。</h1>
        <p>
          这里会按会话汇总排课目标、硬性约束、软性偏好、特殊场景和人工调整流程。你可以先看列表，再进入任意一场访谈详情。
        </p>
      </section>

      <section className="statsGrid">
        <article className="panel statCard">
          <strong>{sessions.length}</strong>
          <span>累计访谈会话</span>
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
                        最后更新时间：{formatDateTime(session.updatedAt)} · 共 {session.messageCount} 条消息
                      </div>
                    </div>
                    <span
                      className={`pill ${session.status === "review-ready" ? "pill--success" : ""}`}
                    >
                      {session.status === "review-ready" ? "可复核" : `${session.completionRate}%`}
                    </span>
                  </div>
                  <div className="sessionLink__meta">
                    {session.highlightedRules.length
                      ? session.highlightedRules.slice(0, 2).join(" ｜ ")
                      : "还没有提炼出关键规则摘要"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              还没有访谈数据。先去老师聊天页发起一场排课访谈。
            </div>
          )}
        </section>

        <aside className="panel detailCard">
          <h2>查看建议</h2>
          <ul className="bulletList">
            <li>优先打开覆盖率高的会话，通常已经把学校排课逻辑讲得更完整。</li>
            <li>先看“关键规则”，再看“缺失主题”，能快速判断还要不要继续追问。</li>
            <li>如果某场访谈一直缺“例外场景”或“人工流程”，说明系统还无法真正落地。</li>
          </ul>
        </aside>
      </section>
    </main>
  );
}
