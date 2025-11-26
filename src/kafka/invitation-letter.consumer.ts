// src/kafka/invitation-letter.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from './kafka.service';
import { MinioService } from '../minio/minio.service';
import { EventRegistrationService } from '../event-registration/event-registration.service';
import { EmailService } from '../email/email.service';
import { InvitationLetterGenerateEvent } from './kafka.events';
import * as pdf from 'html-pdf-node';
import { EventRegistrationDocument } from 'src/event-registration/entities/event-registration.entity';
import { EventDto } from 'src/event-registration/dto/event.dto';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class InvitationLetterConsumer {
  private readonly logger = new Logger(InvitationLetterConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly minioService: MinioService,
    private readonly registrationService: EventRegistrationService,
    private readonly emailService: EmailService,
  ) {}

  async connect() {
    await this.kafkaService.subscribe(
      'invitation.letter.generate',
      this.handleInvitationLetterGeneration.bind(this),
    );
  }

  private async handleInvitationLetterGeneration(message: any) {
    const event: InvitationLetterGenerateEvent = message;
    const { registrationId, tenantId, eventId, email } = event;

    this.logger.log(`[START] Processing invitation letter for registrationId: ${registrationId}`);

    try {
      // Step 1: Fetch the full registration and event documents
      const registration = await this.registrationService.getRegistrationById(registrationId);
      if (!registration) {
        this.logger.error(`Registration with ID ${registrationId} not found. Aborting letter generation.`);
        return;
      }

      const eventDetails = await this.registrationService.getEventByIdGrpc(eventId, tenantId);
      if (!eventDetails) {
        this.logger.error(`Event with ID ${eventId} not found. Aborting letter generation.`);
        return;
      }

      // Step 2: Generate the invitation letter PDF
      const pdfBuffer = await this.generatePdf(registration, eventDetails);
      this.logger.log(`Successfully generated invitation letter PDF for registrationId: ${registrationId}`);

      // Step 3: Upload the letter to MinIO
      const objectName = `invitation-letters/${tenantId}/${registrationId}.pdf`;
      await this.minioService.uploadFile(objectName, pdfBuffer, pdfBuffer.length, 'application/pdf');
      this.logger.log(`Successfully uploaded invitation letter to MinIO with key: ${objectName}`);

      // Step 4: Get a public URL for the letter
      const letterUrl = await this.minioService.getPresignedUrl(objectName);
      if (!letterUrl) {
        throw new Error('Failed to generate a presigned URL for the invitation letter.');
      }

      // Step 5: Send the notification email
      await this.emailService.sendInvitationLetterEmail(
        email,
        `${registration.firstName} ${registration.lastName}`,
        eventDetails.title,
        letterUrl,
      );
      this.logger.log(`Successfully sent invitation letter email to: ${email}`);

      this.logger.log(`[SUCCESS] Completed invitation letter generation for registrationId: ${registrationId}`);
    } catch (error) {
      this.logger.error(
        `[FAIL] Failed to process invitation letter for registrationId: ${registrationId}. Error: ${error.message}`,
        error.stack,
      );
    }
  }

  private async generatePdf(registration: EventRegistrationDocument, event: EventDto): Promise<Buffer> {
    const htmlContent = await this.getHtmlTemplate(registration, event);
    const options = { format: 'A4', args: ['--no-sandbox', '--disable-setuid-sandbox'], printBackground: true };
    const file = { content: htmlContent };
    return pdf.generatePdf(file, options);
  }

  private async getHtmlTemplate(registration: EventRegistrationDocument, event: EventDto): Promise<string> {
    const logoPath = join(process.cwd(), 'src', 'assets', 'Fichier 80.png');
    let logoSrc = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      logoSrc = `data:image/png;base64,${logoBase64}`;
    } catch (error) {
      this.logger.error(`Could not read logo file at ${logoPath}`, error.stack);
      // Continue without a logo if it fails
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Letter</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap');
              * {
                  box-sizing: border-box;
              }
              body {
                  font-family: 'Poppins', sans-serif;
                  margin: 0;
                  padding: 20px;
                  background-color: #f9f9f9;
                  color: #333;
              }
              .container {
                  max-width: 800px;
                  margin: 0 auto; /* Remove vertical margins */
                  padding: 40px;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              }
              .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #eeeeee;
                  margin-bottom: 40px;
              }
              .logo {
                  max-width: 150px;
              }
              .company-address {
                  text-align: right;
                  font-size: 14px;
                  color: #555;
              }
              h1 {
                  font-size: 28px;
                  font-weight: 700;
                  color: #1a1a1a;
                  margin-bottom: 30px;
              }
              p {
                  font-size: 16px;
                  line-height: 1.8;
                  margin-bottom: 16px;
              }
              strong {
                  font-weight: 500;
              }
              .content-block {
                  margin-bottom: 30px;
              }
              .footer {
                  text-align: center;
                  margin-top: 50px;
                  padding-top: 20px;
                  border-top: 1px solid #eeeeee;
                  font-size: 12px;
                  color: #888;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  ${logoSrc ? `<img src="${logoSrc}" alt="Company Logo" class="logo">` : '<div></div>'}
                  <div class="company-address">
                      <strong>The Event Organization Committee</strong><br>
                      123 Event Street<br>
                      City, State, 12345
                  </div>
              </div>

              <h1>Official Letter of Invitation</h1>

              <div class="content-block">
                  <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p><strong>Reference:</strong> Invitation to ${event.title}</p>
                  <p><strong>To Whom It May Concern,</strong></p>
              </div>

              <div class="content-block">
                  <p>
                      This letter serves as a formal invitation to <strong>${registration.firstName} ${registration.lastName}</strong>, a citizen of <strong>${registration.nationality}</strong>, to attend the <strong>"${event.title}"</strong> event.
                  </p>
                  <p>
                      The event is scheduled to take place from <strong>${new Date(event.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong> to <strong>${new Date(event.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>. The main venue is located at <strong>${event.adresse}</strong>.
                  </p>
                  <p>
                      Mr./Ms. <strong>${registration.lastName}</strong> has successfully completed all registration requirements and is a confirmed participant. This letter is provided to support their visa application to enter the country for the sole purpose of attending this event.
                  </p>
                  <p>
                      We kindly request that you extend all necessary courtesies and assistance to facilitate a smooth visa application process.
                  </p>
              </div>

              <div class="content-block">
                  <p>Should you require any further information or verification, please do not hesitate to contact our organizing committee.</p>
                  <p>Sincerely,</p>
                  <br>
                  <p><strong>Event Coordination Department</strong><br>
                  The Event Organization Committee</p>
              </div>

              <div class="footer">
                  <p>This is an officially generated document from the Waangu Event Registration System.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
}
