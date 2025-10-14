FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# RUN npm install -g npm@11.4.2
RUN npm install -g @nestjs/cli --registry=https://registry.npmmirror.com

COPY . .

# Jalankan prisma generate jika pakai Prisma
# ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"
# ENV PRISMA_CLI_CDN_PROXY="https://prisma-cdn.cloud"
RUN npx prisma generate

# Build project
RUN npm run build

# Copy email templates ke dist/email/templates
RUN mkdir -p dist/email/templates && cp -r src/email/templates/* dist/email/templates/

# Copy email templates ke dist/src/email/templates (jika ada kode yang akses path ini)
RUN mkdir -p dist/src/email/templates && cp -r src/email/templates/* dist/src/email/templates/

EXPOSE 3000

CMD ["node", "dist/src/main.js"]