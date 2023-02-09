# https://turbo.build/repo/docs/handbook/deploying-with-docker
FROM node:lts AS pre-build
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=legacy --docker

# Add lockfile and package.json's of isolated subworkspace
FROM node:lts AS builder
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=pre-build /app/out/json/ .
COPY --from=pre-build /app/out/package-lock.json ./package-lock.json
RUN npm install

# Build the project
COPY --from=pre-build /app/out/full/ .
COPY turbo.json turbo.json
RUN npm run build --filter=legacy

FROM nginx AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/apps/legacy/dist/ .
