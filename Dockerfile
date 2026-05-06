FROM node:24-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g npm@11.6.2 --registry=https://registry.npmmirror.com
RUN npm install --registry=https://registry.npmmirror.com

RUN npm install -g @nestjs/cli --registry=https://registry.npmmirror.com

COPY . .

ENV PRISMA_CLI_CDN_PROXY="https://prisma-cdn.cloud"
RUN npx prisma generate

RUN npm run build

RUN mkdir -p dist/email/templates && cp -r src/email/templates/* dist/email/templates/
RUN mkdir -p dist/src/email/templates && cp -r src/email/templates/* dist/src/email/templates/

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
