FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ── Production stage: runtime dependencies only ──
FROM node:22-alpine

# pg_dump and psql needed for backup/restore scripts
RUN apk add --no-cache postgresql16-client

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
