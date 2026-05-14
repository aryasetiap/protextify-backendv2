FROM node:24-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g npm@11.6.2 --registry=https://registry.npmmirror.com
RUN npm install --registry=https://registry.npmmirror.com

RUN npm install -g @nestjs/cli --registry=https://registry.npmmirror.com

COPY . .

ENV PRISMA_CLI_CDN_PROXY="https://prisma-cdn.cloud"
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npx prisma generate

RUN npm run build

RUN mkdir -p dist/email/templates && cp -r src/email/templates/* dist/email/templates/
RUN mkdir -p dist/src/email/templates && cp -r src/email/templates/* dist/src/email/templates/

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
