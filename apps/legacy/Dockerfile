# Add lockfile and package.json's of isolated subworkspace
FROM node:lts AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm add -g pnpm

FROM base AS builder
# First install the dependencies (as they change less often)
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm fetch
COPY package.json pnpm-workspace.yaml nx.json .eslintrc.js .
COPY ./apps/ ./apps/
COPY ./packages/ ./packages/
RUN pnpm install -r

# Build the project
RUN pnpm exec nx run legacy:build

FROM nginx AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/apps/legacy/dist/ .
COPY ./apps/legacy/nginx.conf /etc/nginx/conf.d/default.conf
