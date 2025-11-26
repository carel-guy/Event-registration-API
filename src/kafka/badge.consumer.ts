// src/kafka/badge.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { KafkaService } from './kafka.service';
import { QrService } from '../qr/qr.service';
import { MinioService } from '../minio/minio.service';
import { EventRegistrationService } from 'src/event-registration/event-registration.service';
import { EventFormat } from 'src/interface/grpc-interface';
import { LocationDto } from '../event-registration/dto/event.dto';
import { EmailService } from '../email/email.service';
import { BadgeGenerateEvent } from './kafka.events';

// Define the structure of the message payload from the 'badge.generate' topic

@Injectable()
export class BadgeConsumer {
  private readonly logger = new Logger(BadgeConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly qrService: QrService,
    private readonly minioService: MinioService,
    private readonly registrationService: EventRegistrationService,
    private readonly emailService: EmailService,
  ) {}

  async connect() {
    await this.kafkaService.subscribe(
      'badge.generate',
      this.handleBadgeGeneration.bind(this),
    );
  }

  private async handleBadgeGeneration(message: any) {
    const eventPayload: BadgeGenerateEvent = message;
    const { registrationId, attendeeEmail, attendeeFullName, eventDetails } = eventPayload;

    this.logger.log(`[START] Processing badge generation for registrationId: ${registrationId}`);

    try {
      // Step 1: Fetch the full registration document
      const registration = await this.registrationService.getRegistrationById(registrationId);
      if (!registration) {
        this.logger.error(`Registration with ID ${registrationId} not found. Aborting badge generation.`);
        return;
      }

      // Step 2: Fetch the full event details via gRPC
      const event = await this.registrationService.getEventByIdGrpc(new Types.ObjectId(registration.eventId).toHexString(), registration.tenantId.toString());
      if (!event) {
        this.logger.error(`Event with ID ${registration.eventId} not found. Aborting badge generation.`);
        return;
      }

      // Step 3: Generate the badge PDF with the embedded QR code
      const pdfBuffer = await this.qrService.generateBadgeWithQR(registration, attendeeFullName, event);
      this.logger.log(`Successfully generated badge PDF for registrationId: ${registrationId}`);

      // Step 3: Upload the badge to MinIO
      const objectName = `${registration.tenantId}/badges/${registrationId}.pdf`;
      await this.minioService.uploadFile(objectName, pdfBuffer, pdfBuffer.length, 'application/pdf');
      this.logger.log(`Successfully uploaded badge to MinIO with key: ${objectName}`);

      // Step 4: Get a presigned URL for the badge
      const badgeUrl = await this.minioService.getPresignedUrl(objectName);
      if (!badgeUrl) {
        throw new Error('Failed to generate a presigned URL for the badge.');
      }

      // Step 5: Update the registration record with the badge URL
      await this.registrationService.updateBadgeStatus(registrationId, badgeUrl);
      this.logger.log(`Updated registration with badge URL for registrationId: ${registrationId}`);

      // Step 6: Send the notification email
      await this.emailService.sendBadgeEmail(attendeeEmail, attendeeFullName, event.title, badgeUrl);
      this.logger.log(`Successfully sent badge notification email to: ${attendeeEmail}`);

      this.logger.log(`[SUCCESS] Completed badge generation for registrationId: ${registrationId}`);
    } catch (error) {
      this.logger.error(
        `[FAIL] Failed to process badge generation for registrationId: ${registrationId}. Error: ${error.message}`,
        error.stack,
      );
      // In a production system, you might want to move this message to a dead-letter queue (DLQ)
      // for manual inspection and reprocessing.
    }
  }
}
