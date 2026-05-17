FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.4

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @shaj/database run generate

# Build API
RUN pnpm --filter @shaj/api run build

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
