# Build stage using Bun
FROM oven/bun:1 AS build
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile || bun install

# Copy source files
COPY . .

# Build the SvelteKit app
RUN bun run build

# Production stage using Node.js (SvelteKit adapter-node output)
FROM node:20-slim AS release
WORKDIR /app

# Copy the built application
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "build"]
