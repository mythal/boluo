# Add lockfile and package.json's of isolated subworkspace
FROM node:lts AS builder
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY ./apps/legacy/package.json ./package.json
COPY ./apps/legacy/package-lock.json ./package-lock.json
RUN npm install

# Build the project
COPY ./apps/legacy/ .
RUN npm run build

FROM nginx AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist/ .
COPY ./apps/legacy/nginx.conf /etc/nginx/conf.d/default.conf
