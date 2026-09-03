# check=skip=SecretsUsedInArgOrEnv
FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json yarn.lock ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN corepack enable && yarn install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=mysql://build:build@localhost:3306/build \
    BETTER_AUTH_SECRET=build-only-secret-at-least-32-characters \
    BETTER_AUTH_URL=http://localhost:3000 \
    AUTHY_ISSUER=http://localhost:3001 \
    AUTHY_CLIENT_ID=build \
    AUTHY_CLIENT_SECRET=build-only-secret
ARG NEXT_PUBLIC_STREAM_API_KEY
ENV NEXT_PUBLIC_STREAM_API_KEY=$NEXT_PUBLIC_STREAM_API_KEY
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache openssl && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs && mkdir -p /app/data/avatars && chown -R nextjs:nodejs /app/data
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
