import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EventRegistrationService } from '../src/event-registration/event-registration.service';
import { CreateEventRegistrationDto } from '../src/event-registration/dto/create-event-registration.dto';
import { Types } from 'mongoose';
import { KafkaService } from '../src/kafka/kafka.service';
import { BadgeGenerateEvent } from '../src/kafka/kafka.events';
import { INestApplicationContext } from '@nestjs/common';

async function triggerBadgeGeneration() {
  let app: INestApplicationContext | null = null;
  try {
    app = await NestFactory.createApplicationContext(AppModule);
    const registrationService = app.get(EventRegistrationService);
    const kafkaService = app.get(KafkaService);

    console.log('Searching for a registration to test badge generation...');

    // We need a tenantId to search for registrations. 
    // For this test script, we'll have to assume a tenantId that has data.
    // In a real scenario, this would be known.
    const tenantId = '60d5ec49f8a3c5a6d8b4567f'; // From the event document you provided

        // Create a new registration to ensure we have one to test
        const createDto: CreateEventRegistrationDto = {
      eventId: new Types.ObjectId('68692eb8d5dfd3788c648469'), // From the event registration document you provided
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      phone: '1234567890',
      isForeigner: false,
      registrationDate: new Date(),
    };

        const userContext = { tenantId, userId: 'script-user' };
    const { registration } = await registrationService.createRegistration(createDto, userContext as any);
    const registrationId = registration._id.toString();

    // The BadgeGenerateEvent payload requires attendee details.
    // In the actual application, this is passed when the registration is created.
    // For our test, we'll use the details from the fetched registration.
    const payload: BadgeGenerateEvent = {
      registrationId,
      attendeeEmail: createDto.email, 
      attendeeFullName: `${createDto.firstName} ${createDto.lastName}`,
      tenantId: registration.tenantId.toString(),
    };

    console.log(`Found registrationId: ${registrationId}. Triggering badge generation...`);

    await kafkaService.produce('badge.generate', payload);

    console.log('Successfully sent message to kafka topic "badge.generate".');
    console.log('Check the application logs to see the badge generation process.');

  } catch (error) {
    console.error('An error occurred while triggering badge generation:', error);
  } finally {
    if (app) {
      await app.close();
    }
  }
}

triggerBadgeGeneration();
