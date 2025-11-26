// src/qr/qr.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { EventRegistrationModule } from 'src/event-registration/event-registration.module';

@Module({
  imports: [
    // forwardRef is used to resolve circular dependencies.
    // QrModule needs EventRegistrationModule, and EventRegistrationModule will need QrModule.
    forwardRef(() => EventRegistrationModule),
  ],
  providers: [QrService],
  controllers: [QrController],
  exports: [QrService], // Export QrService so other modules can use it
})
export class QrModule {}
