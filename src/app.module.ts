import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as Joi from 'joi';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RootController } from './root.controller'; // 🔧 Import RootController
import { ApiController } from './api.controller'; // 🔧 Import ApiController
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PaymentsModule } from './payments/payments.module';
import { PlagiarismModule } from './plagiarism/plagiarism.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        // Winston AI
        WINSTON_AI_API_URL: Joi.string().required(),
        WINSTON_AI_TOKEN: Joi.string().required(),
        // Base URL
        BASE_URL: Joi.string().default('http://localhost:3000'),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'uploads'),
      serveRoot: '/static/',
      exclude: ['/api/(.*)'], // Exclude API routes from static serving
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 10,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    EmailModule,
    UsersModule,
    ClassesModule,
    AssignmentsModule,
    SubmissionsModule,
    RealtimeModule,
    PaymentsModule,
    PlagiarismModule,
    StorageModule,
  ],
  controllers: [
    AppController,
    RootController, // 🔧 Register RootController for root paths
    ApiController, // 🔧 Register ApiController for /api root paths
  ],
  providers: [AppService],
})
export class AppModule {}
