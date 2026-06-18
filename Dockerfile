# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files to leverage docker layer caching
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci

# Copy source code
COPY . .

# Build backend (TypeScript compilation) and frontend (Angular SSR)
RUN npm --prefix backend run build
RUN npm --prefix frontend run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy root and workspace package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled files and start script from builder stage
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/test-data.json ./backend/test-data.json
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/start.js ./start.js

EXPOSE 8080

CMD ["node", "start.js"]
