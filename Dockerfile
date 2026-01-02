FROM node:18-bullseye-slim
WORKDIR /app

# system deps needed for sharp/ffmpeg build/runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential ca-certificates git python3 libvips-dev ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
