import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { winstonLogger } from './logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger,
  });

  // 🔧 Apply global API prefix only to specific routes
  // Exclude root routes from global prefix
  app.setGlobalPrefix('api', {
    exclude: ['/', '/health', '/favicon.ico'], // Exclude root paths
  });

  // 🔧 Add global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 🔧 Updated Security middleware - More permissive for development
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // 🔧 Updated CORS configuration - Support frontend development
  app.enableCors({
    origin: [
      'http://localhost:5173', // Vite dev server (primary)
      'http://localhost:3000', // Backend same-origin
      'http://localhost:3001', // Alternative frontend port
      'http://localhost:4173', // Vite preview
      'http://localhost:5174', // Vite dev server backup
      'http://127.0.0.1:5173', // IP variant
      'http://127.0.0.1:3000', // IP variant
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: [
      'Content-Type',
      'Authorization',
      'Access-Control-Allow-Origin',
    ],
    optionsSuccessStatus: 200, // Support legacy browsers
    preflightContinue: false,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Protextify Backend API')
    .setDescription('Backend API untuk platform Protextify')
    .setVersion('2.0.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Bull Dashboard (optional)
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      // Add your BullMQ queues here if needed
    ],
    serverAdapter: serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`🏠 Root endpoint: http://localhost:${port}/`);
  console.log(`🔗 API endpoints: http://localhost:${port}/api`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  console.log(`📊 Queue Dashboard: http://localhost:${port}/admin/queues`);
  console.log(
    `📁 File Downloads: http://localhost:${port}/api/storage/download/`,
  );
  console.log(`💚 Health Check: http://localhost:${port}/health`);
  console.log(
    '✅ CORS enabled for frontend development on ports: 5173, 3000, 4173',
  );
}
void bootstrap();
