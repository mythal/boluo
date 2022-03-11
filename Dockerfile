FROM node:14 as builder

COPY package.json yarn.lock /app/
RUN cd /app \
    && yarn install --pure-lockfile
COPY . /app
WORKDIR /app
RUN yarn run build

FROM nginx as server
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
