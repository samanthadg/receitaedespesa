FROM node:20-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
COPY . .

FROM node:20-alpine
WORKDIR /app
ENV PORT=8080
ENV NODE_ENV=production
COPY --from=build /workspace /app
EXPOSE 8080
CMD ["node", "server.js"]
