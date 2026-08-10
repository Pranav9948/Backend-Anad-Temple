FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/generated ./src/generated

# Replace the base image ENTRYPOINT (docker-entrypoint.sh).
# That script prepends `node` when argv[0] is not a binary — so an ECS
# Command override like: CMD ["node", "dist/server.js"]
# becomes: node 'CMD ["node"' ... → MODULE_NOT_FOUND '/app/CMD ["node"'
#
# Exec-form ENTRYPOINT runs the app directly. Extra ECS command args become
# process.argv only and do not break startup.
ENTRYPOINT ["node", "dist/server.js"]
EXPOSE 8080
