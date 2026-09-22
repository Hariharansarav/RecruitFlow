import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

// Application bootstrap
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: false,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Body parser with generous limits (removes size boundary issues for base64 resume uploads)
    app.use(json({ limit: '250mb' }));
    app.use(urlencoded({ limit: '250mb', extended: true }));

    // Enable global validation pipe for DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Enable CORS for frontend communication (Next.js on http://localhost:3000)
    app.enableCors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', true],
      methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      credentials: true,
    });

    // Support backward-compatible routing so both /jobs and /api/jobs work
    app.use((req: any, res: any, next: any) => {
      if (
        !req.url.startsWith('/api') &&
        req.url !== '/' &&
        !req.url.startsWith('/health')
      ) {
        req.url = '/api' + req.url;
      }
      next();
    });

    // Set global prefix for REST API endpoints
    app.setGlobalPrefix('api');

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 5000);

    await app.listen(port);
    logger.log(`Server is running on: http://localhost:${port}`);
  } catch (error) {
    logger.error('Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
