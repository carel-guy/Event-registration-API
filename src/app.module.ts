import { Module } from '@nestjs/common';
import { EventRegistrationModule } from './event-registration/event-registration.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FileReferenceModule } from './file-reference/file-reference.module';
import { TenantInterceptor } from './Interceptor/tenant-interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AttendeeModule } from './attendee/attendee.module';
import { KafkaModule } from './kafka/kafka.module';
import { KeycloakModule } from './keycloak/keycloak.module';
import { QrModule } from './qr/qr.module';
import { EmailModule } from './email/email.module';
import { BadgeModule } from './badge/badge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'EVENT_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'event',
            protoPath: join(process.cwd(), 'src/proto/event.proto'),
            url: configService.get<string>('EVENT_SERVICE_URL'),
          },
        }),
      },
    ]),
    EventRegistrationModule,
    FileReferenceModule,
    AttendeeModule,
    KafkaModule,
    KeycloakModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
