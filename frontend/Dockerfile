# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY angular.json ./
COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist/frontend ./dist/frontend

EXPOSE 8080

CMD ["node", "dist/frontend/server/server.mjs"]
