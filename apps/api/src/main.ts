import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadConfig } from './infrastructure/config/env.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    allowedHeaders: [
      'Content-Type',
      'X-Tenant-Id',
      'X-User-Id',
      'X-User-Role',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = loadConfig();
  await app.listen(config.port);

  console.log(`Servidor iniciado en http://localhost:${config.port}`);
  console.log(`Adaptador de persistencia: ${config.persistenceAdapter}`);
}

bootstrap();
