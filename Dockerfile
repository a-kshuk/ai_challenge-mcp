# ai-mcp/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# Production stage
FROM node:20-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN yarn install --production

EXPOSE 3000

CMD ["node", "dist/index.js"]
