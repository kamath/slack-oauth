FROM node:22-slim

ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM
 
ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

# Set working directory
WORKDIR /app

# Copy root package.json and lockfile if they exist
COPY package*.json ./

# Copy turbo.json for build configuration
COPY turbo.json ./

# Copy shared packages (adjust paths as needed)
COPY packages/ ./packages/

# Copy the specific app
COPY mcps/slack/ ./mcps/slack/

# Install dependencies from monorepo root (includes all workspace dependencies)
RUN npm ci

# Build using Turborepo (this will build dependencies in correct order)
RUN npx turbo build --filter=@smithery/mcp-slack

# Expose the port your app runs on (you may need to adjust this)
EXPOSE 8080

# Start the application from root directory to maintain module resolution
CMD ["node", "mcps/slack/dist/index.cjs"]