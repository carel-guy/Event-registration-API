// src/email/email.service.ts
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mjml2html from 'mjml';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const emailUser = this.configService.get<string>('GMAIL_USER');
    const emailPass = this.configService.get<string>('GMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.error('Email credentials (GMAIL_USER, GMAIL_PASS) are not configured. Email service is disabled.');
      return; // Do not initialize transporter if config is missing
    }

    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    this.transporter.verify().then(() => {
      this.logger.log('Email transporter is ready');
    }).catch(error => {
      this.logger.error('Error configuring email transporter. Emails will not be sent.', error);
    });
  }

  async sendBadgeEmail(
    attendeeEmail: string,
    attendeeFullName: string,
    eventName: string,
    badgeUrl: string,
  ) {
    if (!this.transporter) {
      this.logger.error('Email service is not configured. Cannot send email.');
      throw new InternalServerErrorException('Email service is not configured, cannot send email.');
    }

    this.logger.log(`Preparing badge email for ${attendeeEmail} for event ${eventName}`);

    try {
      // Step 1: Read and prepare the email template
      this.logger.log('Reading and preparing email template...');
      const templatePath = join(process.cwd(), 'src', 'templates', 'badge-notification.mjml');
      let mjmlTemplate = await fs.readFile(templatePath, 'utf-8');
      this.logger.log('Successfully read MJML template.');

      // Step 2: Replace placeholders
      mjmlTemplate = mjmlTemplate
        .replace('{{fullName}}', attendeeFullName)
        .replace(/{{eventName}}/g, eventName)
        .replace(/{{badgeUrl}}/g, badgeUrl)
        .replace('../assets/Fichier 80.png', 'cid:logo');
      this.logger.log('Placeholders replaced in template.');

      // Step 3: Compile MJML to HTML
      this.logger.log('Compiling MJML to HTML...');
      const { html } = mjml2html(mjmlTemplate);
      this.logger.log('Successfully compiled MJML to HTML.');

      // Step 4: Send the email
      this.logger.log(`Sending badge email to ${attendeeEmail}...`);
      const logoPath = join(process.cwd(), 'src', 'assets', 'Fichier 80.png');
      await this.transporter.sendMail({
        to: attendeeEmail,
        subject: `Your Badge for ${eventName}`,
        html: html,
        text: `Hello ${attendeeFullName}, download your badge for ${eventName} here: ${badgeUrl}`,
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo', // This ID is referenced in the MJML template
          },
        ],
      });

      this.logger.log(`Badge email successfully sent to ${attendeeEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send badge email to ${attendeeEmail}: ${error.message}`, error.stack);
      // We throw the error so the calling service (e.g., Kafka consumer) can handle it, maybe by retrying.
      throw error;
    }
  }

  async sendInvitationLetterEmail(
    attendeeEmail: string,
    attendeeFullName: string,
    eventName: string,
    letterUrl: string,
  ) {
    if (!this.transporter) {
      this.logger.error('Email service is not configured. Cannot send email.');
      throw new InternalServerErrorException('Email service is not configured, cannot send email.');
    }

    this.logger.log(`Preparing invitation letter email for ${attendeeEmail} for event ${eventName}`);

    try {
      // Step 1: Read and prepare the email template
      const templatePath = join(process.cwd(), 'src', 'templates', 'invitation-letter-notification.mjml');
      let mjmlTemplate = await fs.readFile(templatePath, 'utf-8');

      // Step 2: Replace placeholders
      mjmlTemplate = mjmlTemplate
        .replace('{{fullName}}', attendeeFullName)
        .replace(/{{eventName}}/g, eventName)
        .replace(/{{letterUrl}}/g, letterUrl);

      // Step 3: Compile MJML to HTML
      const { html } = mjml2html(mjmlTemplate, { filePath: join(process.cwd(), 'src', 'templates') });

      // Step 4: Send the email
      const logoPath = join(process.cwd(), 'src', 'assets', 'Fichier 80.png');
      await this.transporter.sendMail({
        to: attendeeEmail,
        subject: `Your Invitation Letter for ${eventName}`,
        html: html,
        text: `Hello ${attendeeFullName}, your invitation letter for ${eventName} is ready. Download it here: ${letterUrl}`,
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: 'logo',
          },
        ],
      });

      this.logger.log(`Invitation letter email successfully sent to ${attendeeEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation letter email to ${attendeeEmail}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
