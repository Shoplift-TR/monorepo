FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json turbo.json tsconfig.json tsconfig.base.json ./
COPY packages/db/package.json ./packages/db/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY apps/admin/package.json ./apps/admin/package.json

RUN npm ci

COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY apps/admin ./apps/admin

RUN npm run -w @shoplift/db build \
  && npm run -w @shoplift/types build \
  && npm run -w @shoplift/admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admin ./apps/admin

EXPOSE 3002

CMD ["npm", "run", "start", "-w", "@shoplift/admin"]
