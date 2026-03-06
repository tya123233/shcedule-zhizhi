import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "排课访谈机器人",
  description: "帮助老师把学校排课规则完整说清楚，并在后台一键查看会话与结构化摘要。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
