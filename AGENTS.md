# Zorron Engine - Agent Guide

## Project Overview

Zorron Engine 是一个**以节点为核心的 AI 驱动通用交互引擎**。凡是"用户录入信息或做选择 → 根据交互信息得出结论"的场景，都可以用它来构建：人格测试、题目测试、情景模拟、交互式视频、H5 小游戏、问卷调研等。

节点是多样的（选项、视频、小游戏、问答等），场景是多样的，创作是 AI 驱动的——AI Agent 通过声明式意图（ScenarioIntent）自动编排节点、生成文案、校验逻辑、发布场景。测试结果通过 API 持久化，可被任意外部系统拉取消费。

当前阶段：从"剑网3门派人格测试专用"向"场景无关的通用引擎"演进。详见 [产品愿景文档](docs/vision/product-vision.md)。

## Tech Stack

### Frontend (`apps/zorron-editor`)

- **Framework**: React 18+ (Functional Components + Hooks)
- **Build**: Vite 6+
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **State**: Zustand
- **Flow Editor**: @xyflow/react
- **Routing**: React Router v7
- **Testing**: Vitest + React Testing Library

### Backend (`apps/zorron-server`)

- **Framework**: ElysiaJS
- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Validation**: Zod
- **Logging**: pino (structured JSON logs with requestId)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL 16
- **Cache**: Redis 7 (ioredis)
- **Testing**: Vitest

## Project Structure

```text
zorronEngine/
├── apps/
│   ├── zorron-editor/          # React frontend
│   └── zorron-server/          # ElysiaJS backend
├── docker-compose.yml          # Local dev services (Postgres, Redis, Server)
├── .env.example                # Required environment variables
├── pnpm-workspace.yaml         # pnpm workspace config
└── AGENTS.md                   # This file
```

## Common Commands

All commands should be run from the repository root unless otherwise noted.

```bash
# Install dependencies
pnpm install

# Development
pnpm dev:editor                 # Start frontend dev server (http://localhost:5173)
pnpm dev:server                 # Start backend dev server (http://localhost:3000)

# Code quality
pnpm typecheck                  # Run TypeScript type checking across workspace
pnpm lint                       # Run linting across workspace
pnpm test                       # Run tests across workspace

# Database (operates on zorron-server)
pnpm db:generate                # Generate Drizzle migrations
pnpm db:migrate                 # Apply migrations
pnpm db:seed                    # Seed local development data
pnpm db:studio                  # Open Drizzle Studio
pnpm db:rollback                # Drop all migrations (destructive)

# Docker Compose
pnpm compose:up                 # Start Postgres + Redis + Server
pnpm compose:down               # Stop services
```

## Environment Variables

Copy `.env.example` to `apps/zorron-editor/.env` and `apps/zorron-server/.env` and fill in real values.

Key variables:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret for JWT signing
- `STORAGE_PROVIDER`: `local`, `s3`, or `r2`
- `VITE_API_BASE_URL`: Backend URL used by the editor

## Coding Standards

- Use **ESM** everywhere (`"type": "module"`).
- All external input must be validated with **Zod**.
- Backend follows strict layering: `route → controller → service → repository → database`.
- Frontend components only render; logic belongs in Hooks / Zustand stores.
- Use `pino` for logging; never use bare `console.log` in backend code.
- Every request log must include a `requestId`.
- Backend must expose `/health` (liveness) and `/ready` (readiness) endpoints.

## Git Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - new feature
- `fix:` - bug fix
- `chore:` - tooling / config
- `docs:` - documentation
- `test:` - tests only

Example: `feat(mig-001): initialize pnpm workspace and editor/server skeleton`

## CI/CD

项目使用 GitHub Actions 进行持续集成：

- `.github/workflows/ci.yml`：主 CI 流水线（lint → typecheck → test → build）
- `.github/workflows/e2e.yml`：Playwright E2E 测试
- `.github/workflows/docker.yml`：Docker 镜像构建与推送

本地验证命令：

```bash
pnpm -r run lint       # 运行所有 lint
pnpm -r run typecheck  # 运行所有类型检查
pnpm -r run test       # 运行所有测试
```
