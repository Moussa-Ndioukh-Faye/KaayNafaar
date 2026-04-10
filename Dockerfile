FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install --production

COPY . .

WORKDIR /app

EXPOSE 5000

CMD ["node", "backend/server.js"]