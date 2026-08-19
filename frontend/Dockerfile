# ── Stage 1: Install dependencies ──
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ── Stage 2: Build the Next.js app ──
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Backend origin for the /api/v1/* proxy rewrite. next.config.ts evaluates
# rewrites() at build time, so this is a build arg. Override via docker-compose
# or --build-arg (compose sets http://backend:8000; a hosted deploy sets its
# public backend URL).
ARG BACKEND_ORIGIN=http://localhost:8000
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN

# Enable Next.js standalone output for minimal Docker image
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: Production runner ──
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the build output
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
