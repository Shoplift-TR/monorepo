# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app

# Copy the root package files
COPY package.json package-lock.json turbo.json ./

# Copy local package dependencies
COPY packages/types/package.json ./packages/types/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install dependencies including workspace deps
RUN npm install --legacy-peer-deps

# Stage 2: dev
FROM node:20-alpine AS dev
WORKDIR /app

# Copy everything from deps stage
COPY --from=deps /app /app

# Copy all source files
COPY . .

# Expose port 3001
EXPOSE 3001

# Set CMD
CMD ["npm", "run", "dev"]