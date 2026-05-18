FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf.template

ENV BACKEND_URL=http://localhost:5001

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD envsubst '${BACKEND_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
