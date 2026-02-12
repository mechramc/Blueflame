# ── Stage 1: Install + Build ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy ALL workspace package.json files (npm ci needs them for workspaces)
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/cosmos/package.json packages/cosmos/
COPY packages/foundry/package.json packages/foundry/
COPY packages/github-app/package.json packages/github-app/

# Install all dependencies (workspaces)
RUN npm ci --ignore-scripts

# Copy source code only for packages the API depends on
COPY packages/shared/ packages/shared/
COPY packages/cosmos/ packages/cosmos/
COPY packages/foundry/ packages/foundry/
COPY apps/api/ apps/api/

# Build all packages (turbo handles dependency order)
RUN npx turbo build --filter=@blueflame/api

# ── Stage 2: Production image ────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy ALL workspace package.json files (npm ci needs them for workspaces)
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/web/package.json apps/web/
COPY --from=builder /app/packages/shared/package.json packages/shared/
COPY --from=builder /app/packages/cosmos/package.json packages/cosmos/
COPY --from=builder /app/packages/foundry/package.json packages/foundry/
COPY --from=builder /app/packages/github-app/package.json packages/github-app/

# Install production deps only
RUN npm ci --omit=dev --ignore-scripts

# Copy built output (only API and its dependencies)
COPY --from=builder /app/apps/api/dist/ apps/api/dist/
COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/cosmos/dist/ packages/cosmos/dist/
COPY --from=builder /app/packages/foundry/dist/ packages/foundry/dist/

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
