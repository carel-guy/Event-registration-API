import { Module } from '@nestjs/common';
import { AttendeeService } from './attendee.service';
import { AttendeeController } from './attendee.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Attendee, AttendeeSchema } from './entities/attendee.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EventRegistration, EventRegistrationSchema } from 'src/event-registration/entities/event-registration.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendee.name, schema: AttendeeSchema },
      {name: EventRegistration.name, schema: EventRegistrationSchema}
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
                url: configService.get<string>('EVENT_SERVICE_URL', '192.168.40.41:50051'),
              },
            }),
          },
        ]),
  ],
  controllers: [AttendeeController],
  providers: [AttendeeService],
  exports: [AttendeeService],
})
export class AttendeeModule {}
