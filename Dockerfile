FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Skip postinstall (prisma generate) — schema not yet available at this stage
RUN npm ci --legacy-peer-deps --ignore-scripts

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Placeholder values — real values injected at runtime via Railway env vars
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV JWT_PRIVATE_KEY="placeholder"
ENV JWT_PUBLIC_KEY="placeholder"

# NEXT_PUBLIC_* vars must be present at BUILD time so Next.js can inline them
# into the client bundle. Railway passes matching service variables as Docker
# --build-arg values when declared as ARG here. The Clerk publishable key is a
# PUBLIC value (pk_live, already shipped to browsers), so it is safe in the
# build layer. Without this, <ClerkProvider> throws "Missing publishableKey"
# while prerendering static pages and the build fails.
# OS-3318: removed deprecated NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL /
# AFTER_SIGN_UP_URL ARGs. These injected empty-string env vars that got
# baked into the RSC payload even when empty, causing Clerk SDK
# deprecation warnings in the browser console on every page load.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL

# Generate Prisma client then build Next.js
# output: 'standalone' is set in next.config.js for optimal image size
# OS-3318: run patch-package before build to apply the @clerk/nextjs patch
# that strips deprecated afterSignInUrl/afterSignUpUrl props.
RUN npx patch-package && npx prisma generate --schema=./prisma/schema.prisma && npx next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install postgresql-client for migration support
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy the standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy Prisma runtime files needed at startup
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

COPY --chown=nextjs:nodejs scripts/railway-start.sh ./railway-start.sh
RUN chmod +x ./railway-start.sh

USER nextjs
EXPOSE 3000

CMD ["./railway-start.sh"]
