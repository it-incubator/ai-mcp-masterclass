import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { Customer } from './infrastructure/persistence/entities';
import { seedDatabase } from './infrastructure/seed/seed';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule); // retries the DB connection (see app.module.ts)
  app.setGlobalPrefix('api', { exclude: ['mcp'] }); // MCP lives at /mcp, REST at /api/*
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ledger Admin API')
    .setDescription('Step 03: use cases (CQRS) + MCP at /mcp. No auth (local demo only).')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const dataSource = app.get(DataSource);
  if ((await dataSource.getRepository(Customer).count()) === 0) {
    logger.log('Empty database, seeding demo data...');
    await dataSource.transaction((manager) => seedDatabase(manager));
    logger.log('Seed done');
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}/api (docs: /api/docs)`);
}

bootstrap();
