import { EventFormat } from 'src/interface/grpc-interface';
import { LocationDto } from '../event-registration/dto/event.dto';

export interface InvitationLetterGenerateEvent {
  registrationId: string;
  tenantId: string;
  eventId: string;
  email: string;
}

export interface BadgeGenerateEvent {
  registrationId: string;
  attendeeEmail: string;
  attendeeFullName: string;
  tenantId: string;
  eventDetails?: {
    title: string;
    type: string;
    startDate: string;
    endDate: string;
    format: string;
    locations: LocationDto[];
    avenue: string;
    adresse: string;
  };
}
