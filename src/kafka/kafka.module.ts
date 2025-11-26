import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { BadgeConsumer } from './badge.consumer';
import { QrModule } from '../qr/qr.module';
import { MinioModule } from '../minio/minio.module';
import { EventRegistrationModule } from '../event-registration/event-registration.module';
import { EmailModule } from '../email/email.module';
import { InvitationLetterConsumer } from './invitation-letter.consumer';

@Module({
  imports: [
    ConfigModule,
    QrModule,
    MinioModule,
    forwardRef(() => EventRegistrationModule),
    EmailModule,
  ],
  providers: [KafkaService, BadgeConsumer, InvitationLetterConsumer],
  exports: [KafkaService],
})
export class KafkaModule {}
