import { forwardRef, Module } from '@nestjs/common';
import { EventRegistrationService } from './event-registration.service';
import { EventRegistrationController } from './event-registration.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EventRegistration, EventRegistrationSchema } from './entities/event-registration.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileReference, FileReferenceSchema } from 'src/file-reference/entities/file-reference.entity';
import { EventConfigController } from './event-grpc.controller';
import { Attendee, AttendeeSchema } from 'src/attendee/entities/attendee.entity';
import { FileReferenceModule } from 'src/file-reference/file-reference.module';
import { AttendeeModule } from 'src/attendee/attendee.module';
import { KafkaModule } from 'src/kafka/kafka.module';
import { RegistrationGrpcController } from './registration.grpc.controller';

@Module({
  imports: [
    FileReferenceModule,
    AttendeeModule,
    forwardRef(() => KafkaModule),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forFeature([
      { name: EventRegistration.name, schema: EventRegistrationSchema },
      { name: FileReference.name, schema: FileReferenceSchema },
      { name: Attendee.name, schema: AttendeeSchema },
    ]),
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
            url: configService.get<string>('EVENT_SERVICE_URL', ''),
          },
        }),
      },
    ]),
  ],
  controllers: [EventRegistrationController, EventConfigController, RegistrationGrpcController],
  providers: [EventRegistrationService, ConfigService],
  exports: [EventRegistrationService]
})
export class EventRegistrationModule {}
