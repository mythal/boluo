FROM node:16-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat git python3 alpine-sdk
WORKDIR /app

RUN npm add -g pnpm

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch
COPY . ./
RUN pnpm i -r --offline

# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN pnpm exec nx run site:build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
WORKDIR /app/apps/site/
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
