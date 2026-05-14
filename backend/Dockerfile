# syntax=docker/dockerfile:1

# ---- Stage 1: builder (compila better-sqlite3 nativo) ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Stage 2: runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

RUN mkdir -p /app/data && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 node-app && \
    chown -R node-app:nodejs /app

USER node-app

EXPOSE 3001 3002
CMD ["node", "src/index.js"]
