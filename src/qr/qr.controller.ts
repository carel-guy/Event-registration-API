// src/qr/qr.controller.ts
import { Controller, Post, Body, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { EventRegistrationService } from 'src/event-registration/event-registration.service';

@Controller('qr')
export class QrController {
  private readonly logger = new Logger(QrController.name);
  constructor(
    // Use forwardRef to handle circular dependency with EventRegistrationModule
    @Inject(forwardRef(() => EventRegistrationService))
    private readonly registrationService: EventRegistrationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('validate')
  async validateQr(@Body() { token }: { token: string }) {
    this.logger.log('Attempting to validate QR token');
    try {
            const qrJwtSecret = this.configService.get<string>('QR_JWT_SECRET');
      if (!qrJwtSecret) {
        throw new Error('QR_JWT_SECRET is not defined in environment variables');
      }
      const payload = jwt.verify(token, qrJwtSecret) as { regId: string };

      const registration = await this.registrationService.getRegistrationById(payload.regId);

      if (!registration) {
        throw new UnauthorizedException('Registration not found.');
      }

      // Production-ready check: Has this QR code already been validated?
      if (registration.qrValidated) {
        this.logger.warn(`Attempt to re-validate an already used QR code for registrationId: ${payload.regId}`);
        // We return a success response but indicate it was already validated.
        // This prevents showing an error to the check-in staff but flags the re-use attempt.
        return {
          valid: false,
          message: 'This badge has already been validated.',
          validatedAt: registration.lastValidationAt,
        };
      }

      // Mark the QR code as validated in the database.
      // This method will need to be created in the EventRegistrationService.
      const updatedRegistration = await this.registrationService.markQrAsValidated(payload.regId);

      this.logger.log(`Successfully validated and marked QR for registrationId: ${payload.regId}`);
      return {
        valid: true,
        message: 'Validation successful.',
        registrationDetails: {
          fullName: `${updatedRegistration.firstName} ${updatedRegistration.lastName}`,
          email: updatedRegistration.email,
          validatedAt: updatedRegistration.lastValidationAt,
        },
      };
    } catch (e) {
      this.logger.error(`Invalid QR token: ${e.message}`);
      throw new UnauthorizedException('Invalid or expired QR token');
    }
  }
}
