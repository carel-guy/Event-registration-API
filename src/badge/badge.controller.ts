// src/badge/badge.controller.ts
import { Controller, Get, Param, Res, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Response } from 'express';
import { EventRegistrationService } from 'src/event-registration/event-registration.service';

@Controller('badges')
export class BadgeController {
  private readonly logger = new Logger(BadgeController.name);

  constructor(
    // Inject EventRegistrationService to find the registration details
    @Inject(forwardRef(() => EventRegistrationService))
    private readonly registrationService: EventRegistrationService,
  ) {}

  @Get(':registrationId')
  async downloadBadge(
    @Param('registrationId') registrationId: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Badge download requested for registrationId: ${registrationId}`);

    // As per your request, this endpoint is public for the development phase.
    // NOTE FOR PRODUCTION: This endpoint should be secured. An unauthorized user could
    // potentially guess registration IDs to download badges. Secure this with an appropriate
    // authentication strategy (e.g., requiring the user to be logged in).

        // NOTE FOR PRODUCTION: This is insecure. In a production environment, you would get the
    // tenantId from the authenticated user's context (e.g., req.user.tenantId) and pass
    // it to the service to ensure a user from one tenant cannot access another's badge.
    // const registration = await this.registrationService.getRegistrationById(registrationId, req.user.tenantId);

    // For now, we fetch without tenantId, which is a potential security risk.
    const registration = await this.registrationService.getRegistrationById(registrationId);

    if (!registration || !registration.badgeUrl) {
      this.logger.warn(`Badge not found or not yet generated for registrationId: ${registrationId}`);
      throw new NotFoundException('Badge not found or is not yet generated. Please check back later or contact support if the issue persists.');
    }

    this.logger.log(`Redirecting to badge URL for registrationId: ${registrationId}`);
    res.redirect(registration.badgeUrl);
  }
}
