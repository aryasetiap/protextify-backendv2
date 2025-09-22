# Stage 1: Build the application
# Menggunakan base image Node.js versi 18-alpine yang ringan
FROM node:18-alpine AS development

# Set direktori kerja di dalam container
WORKDIR /usr/src/app

# Copy package.json dan package-lock.json terlebih dahulu
# Ini memanfaatkan Docker layer caching, jadi dependensi tidak di-install ulang setiap kali kode berubah
COPY package*.json ./

# Install dependensi
RUN npm install

# Copy seluruh source code aplikasi
COPY . .

# Build aplikasi untuk produksi
RUN npm run build

# Stage 2: Production environment
# Menggunakan base image yang sama untuk production
FROM node:18-alpine AS production

# Set argumen untuk environment produksi
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Set direktori kerja
WORKDIR /usr/src/app

# Copy file package yang diperlukan
COPY package*.json ./

# Install hanya dependensi produksi
RUN npm install --only=production

# Copy hasil build dari stage 'development'
COPY --from=development /usr/src/app/dist ./dist

# Expose port yang digunakan oleh aplikasi NestJS
EXPOSE 3000

# Perintah untuk menjalankan aplikasi saat container启动
CMD ["node", "dist/main"]
