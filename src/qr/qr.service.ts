// src/qr/qr.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as qrcode from 'qrcode';
import { EventRegistrationDocument } from '../event-registration/entities/event-registration.entity';
import * as fs from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';
import { EventDto } from 'src/event-registration/dto/event.dto';
import puppeteer, { Browser } from 'puppeteer';
import mjml2html from 'mjml';
import * as handlebars from 'handlebars';

@Injectable()
export class QrService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QrService.name);
  private readonly QR_EXPIRY = '30d';
  private browser: Browser;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('Initializing Puppeteer browser instance...');
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process',
        ],
      });
      this.logger.log('Puppeteer browser instance initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize Puppeteer browser.', error.stack);
      throw error; // Throw error to prevent the application from starting in a bad state
    }
  }

  async onModuleDestroy() {
    this.logger.log('Closing Puppeteer browser instance.');
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateRegistrationToken(registrationId: string): Promise<string> {
    this.logger.log(`Generating JWT for registrationId: ${registrationId}`);
    const qrJwtSecret = this.configService.get<string>('QR_JWT_SECRET');
    if (!qrJwtSecret) {
      this.logger.error('QR_JWT_SECRET is not defined in environment variables');
      throw new Error('Server configuration error: JWT secret is missing.');
    }
    this.logger.log('Successfully retrieved QR_JWT_SECRET.');

    return jwt.sign(
      {
        regId: registrationId,
        aud: 'badge-validation',
      },
      qrJwtSecret,
      { expiresIn: this.QR_EXPIRY },
    );
  }

  async generateBadgeWithQR(
    registration: EventRegistrationDocument, // Use existing entity
    attendeeFullName: string,
    event: EventDto,
  ): Promise<Buffer> {
    this.logger.log(`Generating badge for registration: ${registration._id}`);
    const token = await this.generateRegistrationToken((registration._id as Types.ObjectId).toHexString());

    // Construct a full URL for the QR code
    const baseUrl = this.configService.get<string>('EXPO_APP_URL');
    if (!baseUrl) {
      this.logger.error('EXPO_APP_URL is not defined in environment variables');
      throw new Error('Server configuration error: EXPO_APP_URL is missing.');
    }
    const scanUrl = `${baseUrl}/?token=${token}`;
    this.logger.log(`Generated scan URL: ${scanUrl}`);

    const qrImage = await qrcode.toBuffer(scanUrl);
    const qrCodeBase64 = qrImage.toString('base64');
    const qrCodeSrc = `data:image/png;base64,${qrCodeBase64}`;
    const pdfBuffer = await this.createBadgePDF(attendeeFullName, qrCodeSrc, event);
    return pdfBuffer;
  }

  private createBadgeHTML(
    qrCode: string,
    attendeeFullName: string,
    event: EventDto,
  ): string {
    const templatePath = join(process.cwd(), 'src', 'qr', 'templates', 'badge.mjml');
    const mjmlTemplate = fs.readFileSync(templatePath, 'utf8');

    const logoPath = join(process.cwd(), 'src', 'assets', 'Fichier 80.png');
    let logoSrc = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
      this.logger.error(`Could not read logo file at ${logoPath}`, error.stack);
    }

    const template = handlebars.compile(mjmlTemplate);
    const htmlOutput = template({
      logoSrc,
      attendeeFullName,
      eventTitle: event.title,
      qrCode,
      startDate: new Date(event.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      endDate: new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      location: event.locations.map(l => l.name).join(', ') || event.adresse,
      eventFormat: event.format.replace('_', ' '),
      eventPartners: event.partners
    });

    const { html } = mjml2html(htmlOutput);
    return html;
  }

  private async createBadgePDF(
    attendeeFullName: string,
    qrCode: string,
    event: EventDto,
  ): Promise<Buffer> {
    if (!this.browser) {
      this.logger.error('Puppeteer browser is not initialized. Cannot generate PDF.');
      throw new Error('PDF generation service is not available.');
    }

    const htmlContent = this.createBadgeHTML(qrCode, attendeeFullName, event);
    const page = await this.browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const pdfBuffer = await page.pdf({
        width: '92mm',
        height: '132mm',
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        printBackground: true,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }
}
