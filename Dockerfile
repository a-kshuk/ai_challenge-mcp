# ai-mcp/Dockerfile
FROM node:24-slim AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Production stage
FROM node:24-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN yarn install --production

EXPOSE 3000

CMD ["node", "dist/index.js"]

FROM ubuntu:24.04

# Whisper
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --break-system-packages openai-whisper

WORKDIR /app

CMD ["whisper"]
