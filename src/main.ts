import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { winstonLogger } from './logger';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// 🆕 Import Bull Dashboard (optional)
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.use((req, res, next) => {
    console.log(
      `[HTTP] ${req.method} ${req.url} at ${new Date().toISOString()}`,
    );
    next();
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Protextify API')
    .setDescription('API documentation for Protextify backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 🆕 Optional: Bull Dashboard setup
  // const serverAdapter = new ExpressAdapter();
  // serverAdapter.setBasePath('/admin/queues');

  // const { addQueue } = createBullBoard({
  //   serverAdapter,
  //   queues: [
  //     new BullAdapter(plagiarismQueue), // You need to get queue instance
  //   ],
  // });

  // app.use('/admin/queues', serverAdapter.getRouter());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
