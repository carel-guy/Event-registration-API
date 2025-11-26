// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { BadgeConsumer } from './kafka/badge.consumer';
import { InvitationLetterConsumer } from './kafka/invitation-letter.consumer';
import { KafkaService } from './kafka/kafka.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the main HTTP application
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Connect the gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'registration',
      protoPath: 'src/proto/registration.proto',
      url: configService.get<string>('EVENT_REGISTRATION_SERVICE_URL', '192.168.40.32:50052'),
    },
  });

  // Enable CORS
  app.enableCors();

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Waangu Event Registration API')
    .setDescription('API for managing event registrations and handling gRPC validation.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  // Start all microservices and the main application
  await app.startAllMicroservices();

  // Start Kafka consumers explicitly
  logger.log('Registering Kafka consumers...');
  const badgeConsumer = app.get(BadgeConsumer);
  await badgeConsumer.connect();

  const invitationLetterConsumer = app.get(InvitationLetterConsumer);
  await invitationLetterConsumer.connect();

  logger.log('All consumers registered. Starting Kafka consumer service...');
  const kafkaService = app.get(KafkaService);
  await kafkaService.run(); // Starts the single consumer with all subscriptions

  logger.log('Kafka consumer service started successfully.');

  const appPort = configService.get<number>('APP_PORT', 3001);
  const appHost = configService.get<string>('APP_HOST', '0.0.0.0');

  await app.listen(appPort, appHost);

  logger.log(`🚀 HTTP server running on http://${appHost}:${appPort}`);
  logger.log(`📚 Swagger documentation available at http://${appHost}:${appPort}/api`);
  logger.log(`📡 gRPC server listening on ${configService.get<string>('EVENT_REGISTRATION_SERVICE_URL', '0.0.0.0:50052')}`);
}

bootstrap();