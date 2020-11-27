FROM node:14.15-alpine AS build

COPY . .

RUN npm install
RUN npm install -g typescript
RUN tsc
RUN npm prune --production

FROM node:14.15-alpine

WORKDIR /app

COPY --from=build dist/ ./dist
COPY --from=build node_modules/ ./node_modules

ENTRYPOINT ["node", "dist/main.js"]