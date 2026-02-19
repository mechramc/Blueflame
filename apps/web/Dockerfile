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

# Copy source code for web and its dependencies
COPY packages/shared/ packages/shared/
COPY apps/api/src/ apps/api/src/
COPY apps/api/tsconfig.json apps/api/
COPY apps/web/ apps/web/

# Accept NEXT_PUBLIC_* vars at build time (baked into the Next.js bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build (turbo handles dependency order: shared → web)
RUN npx turbo build --filter=@blueflame/web

# ── Stage 2: Production image ────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone output (includes all needed node_modules)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
