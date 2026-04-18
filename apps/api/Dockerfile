FROM node:20-alpine AS builder
WORKDIR /app

# Workspace metadata
COPY package.json package-lock.json turbo.json tsconfig.json tsconfig.base.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/utils/package.json ./packages/utils/package.json
COPY apps/api/package.json ./apps/api/package.json

# Install dependencies
RUN npm ci

# Copy sources
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY apps/api ./apps/api

# Build required workspaces
RUN npm run -w @shoplift/db build \
	&& npm run -w @shoplift/types build \
	&& npm run -w @shoplift/utils build \
	&& npm run -w @shoplift/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Runtime dependencies + built artifacts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

EXPOSE 3001

CMD ["npm", "run", "start", "-w", "@shoplift/api"]