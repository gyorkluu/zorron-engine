# syntax=docker/dockerfile:1
FROM oven/bun:1.1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json .
RUN bun install --production

FROM base AS builder
COPY package.json .
RUN bun install
COPY . .
RUN bun run build

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "dist/server.js"]
