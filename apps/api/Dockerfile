FROM node:20-alpine

WORKDIR /app

# Copy root workspace files
COPY package*.json ./
COPY turbo.json ./

# Copy the api package
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

# Install dependencies
RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

# Build
RUN npm run build --workspace=apps/api

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["node", "dist/index.js"]