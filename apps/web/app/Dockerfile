FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY turbo.json ./

COPY apps/web/package*.json ./apps/web/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

RUN npm install

COPY apps/web ./apps/web
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils

RUN npm run build --workspace=apps/web

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "start", "--workspace=apps/web"]
