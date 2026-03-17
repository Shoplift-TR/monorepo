# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./

# Copy package manifests
COPY packages/types/package.json ./packages/types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install all dependencies
RUN npm install --legacy-peer-deps

# Stage 2: dev
FROM node:20-alpine AS dev
WORKDIR /app

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source files
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/api ./apps/api
COPY turbo.json .
COPY package.json .

EXPOSE 3001

CMD ["npm", "run", "dev", "--workspace=apps/api"]