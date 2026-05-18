FROM node:20-alpine
# next upgraded to 14.2.35 in lockfile — clears Railway CVE-2025-55246/67779 scan

# sharp + Prisma need these on musl/Alpine
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

RUN npm install -g pnpm@8.15.4

# Workspace config + shared packages
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Stub out the other workspace apps so pnpm can resolve the workspace
# without needing their full source trees
RUN mkdir -p apps/web apps/admin apps/pos
RUN echo '{"name":"@shaj/web","version":"1.0.0","private":true}' > apps/web/package.json
RUN echo '{"name":"@shaj/admin","version":"1.0.0","private":true}' > apps/admin/package.json
RUN echo '{"name":"@shaj/pos","version":"1.0.0","private":true}' > apps/pos/package.json

RUN pnpm install --no-frozen-lockfile --shamefully-hoist

RUN pnpm --filter @shaj/database run generate

RUN pnpm --filter @shaj/api run build

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
