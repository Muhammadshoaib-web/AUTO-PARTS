import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  const frontendUrl = config.get<string>('frontendUrl') ?? 'http://localhost:3000';
  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
    }),
  );

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global prefix & versioning ──────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global validation pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger docs (non-production only) ─────────────────────────────────────
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AutoParts IMS API')
      .setDescription('Complete API for Auto Parts Inventory & POS Management System')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addTag('Health', 'Health check endpoint')
      .addTag('Auth', 'Authentication & authorization')
      .addTag('Users', 'User management')
      .addTag('Categories', 'Parts categories')
      .addTag('Parts', 'Parts inventory management')
      .addTag('Stock', 'Stock management & movements')
      .addTag('Locations', 'Warehouse locations')
      .addTag('Suppliers', 'Supplier management')
      .addTag('Customers', 'Customer management')
      .addTag('Purchases', 'Purchase orders & receiving')
      .addTag('Sales', 'POS & sales management')
      .addTag('Expenses', 'Expense tracking')
      .addTag('Reports', 'Business intelligence reports')
      .addTag('Audit', 'Audit log trail')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`\n🚀  AutoParts API running on: http://localhost:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    console.log(`📚  Swagger docs:             http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
