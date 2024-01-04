# Next.js Dockerfile Example
# https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile

FROM node:lts AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED 1

FROM base AS builder
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
COPY package.json nx.json version.json .eslintrc.js ./
COPY ./apps/site ./apps/site
COPY ./apps/server/bindings ./apps/server/bindings
COPY ./packages/ ./packages/
RUN npm ci

# https://github.com/vercel/next.js/issues/45383
ARG MEDIA_URL=https://media.boluo.chat
ENV PUBLIC_MEDIA_URL $MEDIA_URL

RUN npm run build:site

# Production image, copy all the files and run next
FROM base AS runner

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/standalone ./
WORKDIR /app/apps/site/
COPY --from=builder --chown=nextjs:nodejs /app/apps/site/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
