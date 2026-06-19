# Zorron Engine - Agent Guide

## Project Overview

Zorron Engine 是一个通用交互叙事编辑器，目标是将旧版「人格测试编辑器」迁移为基于 React + ElysiaJS + PostgreSQL 的现代全栈应用。

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
