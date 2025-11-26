// src/badge/badge.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BadgeController } from './badge.controller';
import { EventRegistrationModule } from 'src/event-registration/event-registration.module';

@Module({
  imports: [
    // We need EventRegistrationModule to access the EventRegistrationService
    forwardRef(() => EventRegistrationModule),
  ],
  controllers: [BadgeController],
})
export class BadgeModule {}
