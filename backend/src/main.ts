import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import process from 'node:process';
import { AppModule } from './app.module';

// Application bootstrap
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Enable global validation pipe for DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Enable CORS for frontend communication (e.g. React frontend)
    app.enableCors({
      origin: true,
      credentials: true,
    });

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
