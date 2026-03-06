# 排课访谈机器人

这是一个独立的新项目，用来做两件事：

1. 让老师像聊天一样，把学校真实的排课规则、限制条件、例外场景和人工调整逻辑逐步交代清楚。
2. 让管理者在后台一键查看每次访谈的完整会话和结构化摘要。

## 本地运行

```bash
npm install
npm run dev
```

## 模型配置

复制 `.env.example` 为 `.env.local`，并配置：

```bash
OPENROUTER_API_KEY=...
OPENROUTER_MODEL_INTERVIEW=anthropic/claude-sonnet-4.6
OPENROUTER_HTTP_REFERER=http://localhost:3000
```

打开 `http://localhost:3000` 进入老师聊天页。  
打开 `http://localhost:3000/admin` 进入后台查看页。

## 结构说明

- `app/`：页面与 API Route
- `components/`：聊天工作区组件
- `lib/scheduler-bot/`：访谈主题、规则提炼、本地存储
- `data/sessions/`：会话 JSON 文件

## 当前实现

- 老师端聊天访谈界面
- 本地文件持久化会话
- 结构化主题覆盖率统计
- 后台会话列表与详情页
- 无数据库即可跑通
