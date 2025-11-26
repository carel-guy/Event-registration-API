import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// DTO for Condition
export class ConditionDto {
  @ApiProperty({ description: 'The field to check', example: 'date_inscription' })
  field: string;

  @ApiProperty({ description: 'The operator for comparison', example: 'entre' })
  operator: string;

  @ApiProperty({ description: 'The value for comparison', example: ['2025-06-01T00:00:00Z', '2025-06-30T23:59:59Z'] })
  value: any;
}

// DTO for TariffRule
export class TariffRuleDto {
  @ApiProperty({ description: 'Tariff Rule ID', example: '6865320e1e61e79c76495032' })
  id: string;

  @ApiProperty({ description: 'Tariff Rule Name', example: 'Basic' })
  name: string;

  @ApiProperty({ description: 'Tariff Rule Description', example: 'Réduction pour inscriptions précoces' })
  description: string;

  @ApiProperty({ type: [ConditionDto], description: 'List of conditions for the rule' })
  @Type(() => ConditionDto)
  conditions: ConditionDto[];

  @ApiProperty({ description: 'Currency', example: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Is the rule active?', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Price', example: 750 })
  price: number;

  @ApiProperty({ description: 'Valid from date', example: '2025-05-31T22:00:00.000Z' })
  validFrom: string;

  @ApiProperty({ description: 'Valid until date', example: '2025-06-30T21:59:00.000Z' })
  validUntil: string;

  @ApiProperty({ description: 'Amount Type', example: 'FIXED' })
  amountType: string;

  @ApiProperty({ description: 'Amount', example: 50 })
  amount: number;

  @ApiProperty({ description: 'Tariff Type', example: 'FLAT_CHARGE' })
  tariffType: string;

  @ApiProperty({ description: 'Creation date', example: '2025-07-02T13:20:14.731Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last update date', example: '2025-07-08T10:16:14.442Z' })
  updatedAt: string;
}

// DTO for Partner
export class PartnerDto {
  @ApiProperty({ description: 'Partner ID', example: '686d4539cb035253d6e9a834' })
  id: string;

  @ApiProperty({ description: 'Partner Name', example: 'Asyst' })
  name: string;

  @ApiProperty({ description: 'Partner Logo URL', example: 'http://.../logo.jpg' })
  logo: string;

  @ApiProperty({ description: 'Partner Website', example: 'https://www.techsolutions.com' })
  website: string;

  @ApiProperty({ description: 'Partner Description', example: 'Description' })
  description: string;
}

// DTO for Speaker
export class SpeakerDto {
  @ApiProperty({ description: 'Speaker ID', example: '686d2ec5b2c81c5f5122d69a' })
  id: string;

  @ApiProperty({ description: 'Speaker Name', example: 'Sogo' })
  name: string;

  @ApiProperty({ description: 'Speaker Bio', example: 'bio' })
  bio: string;

  @ApiProperty({ description: 'Speaker Company', example: 'ASYST' })
  company: string;

  @ApiProperty({ description: 'Speaker LinkedIn URL', example: 'https://www.facebook.com/' })
  linkedinUrl: string;

  @ApiProperty({ description: 'Speaker Type', example: 'MODERATOR' })
  speakerType: string;

  @ApiProperty({ type: [String], description: 'Profile Picture IDs', example: ['http://.../pic.jpg'] })
  profilePictureId: string[];
}

// DTO for EventSchedule
export class EventScheduleDto {
  @ApiProperty({ description: 'Schedule ID', example: '686d33d0b2c81c5f5122d81c' })
  id: string;

  @ApiProperty({ description: 'Session Title', example: 'Panel de discussion' })
  title: string;

  @ApiProperty({ description: 'Session Description', example: 'Expériences terrain et bonnes pratiques' })
  description: string;

  @ApiProperty({ description: 'Session Type', example: 'BREAK' })
  sessionType: string;

  @ApiProperty({ description: 'Start Time', example: '2025-07-08T15:05:00.000Z' })
  startTime: string;

  @ApiProperty({ description: 'End Time', example: '2025-07-08T19:09:00.000Z' })
  endTime: string;

  @ApiProperty({ description: 'Location', example: 'university du lac tanganyika' })
  location: string;

  @ApiProperty({ type: [SpeakerDto], description: 'List of speakers for the session' })
  @Type(() => SpeakerDto)
  speakers: SpeakerDto[];
}

// DTO for SocialLink
export class SocialLinkDto {
  @ApiProperty({ description: 'Platform Name', example: 'facebook' })
  platform: string;

  @ApiProperty({ description: 'URL', example: 'https://www.facebook.com/' })
  url: string;
}

// DTO for Location
export class LocationDto {
  @ApiProperty({ description: 'The name of the location', example: 'Main Conference Hall' })
  name: string;

  @ApiProperty({ description: 'The address of the location', example: '123 Tech Avenue' })
  address: string;
}

// Main DTO for Event
export class EventDto {
  @ApiProperty({ description: 'Event ID', example: '686d2decb2c81c5f5122d628' })
  id: string;

  @ApiProperty({ description: 'Tenant ID', example: '60d5ec49f8a3c5a6d8b4567f' })
  tenantId: string;

  @ApiProperty({ description: 'Event Title', example: 'Colloque' })
  title: string;

  @ApiProperty({ description: 'Event Description', example: 'Le Forum National...' })
  description: string;

  @ApiProperty({ description: 'Event Type', example: 'CONFERENCE' })
  type: string;

  @ApiProperty({ description: 'Event Status', example: 'PUBLISHED' })
  status: string;

  @ApiProperty({ description: 'Start Date', example: '2025-07-17T08:32:00.000Z' })
  startDate: string;

  @ApiProperty({ description: 'End Date', example: '2025-07-30T08:32:00.000Z' })
  endDate: string;

  @ApiProperty({ description: 'Timezone', example: 'Africa/Bujumbura' })
  timezone: string;

  @ApiProperty({ description: 'Avenue', example: 'Avec' })
  avenue: string;

  @ApiProperty({ description: 'Address', example: 'gasenyi' })
  adresse: string;

  @ApiProperty({ description: 'Virtual URL', example: 'https://www.facebook.com/' })
  virtualUrl: string;

  @ApiProperty({ description: 'Number of Participants', example: 300 })
  numberOfParticipants: number;

  @ApiProperty({ description: 'Currency', example: 'GBP' })
  currency: string;

  @ApiProperty({ description: 'File Reference IDs', example: 'http://.../image.jpg' })
  fileReferenceIds: string;

  @ApiProperty({ description: 'Is the event public?', example: true })
  isPublic: boolean;

  @ApiProperty({ description: 'Created By User ID', example: '60d5ec49f8a3c5a6d8b4567e' })
  createdBy: string;

  @ApiProperty({ description: 'Updated By User ID', example: '60d5ec49f8a3c5a6d8b4567e' })
  updatedBy: string;

  @ApiProperty({ description: 'Creation Date', example: '2025-07-08T14:40:44.402Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last Update Date', example: '2025-07-09T08:59:23.729Z' })
  updatedAt: string;

  @ApiProperty({ description: 'Event Format', example: 'HYBRID' })
  format: string;

  @ApiProperty({ type: [LocationDto], description: 'List of event locations' })
  @Type(() => LocationDto)
  locations: LocationDto[];

  @ApiProperty({ type: [TariffRuleDto], description: 'List of tariff rules' })
  @Type(() => TariffRuleDto)
  tariffRules: TariffRuleDto[];

  @ApiProperty({ type: [PartnerDto], description: 'List of partners' })
  @Type(() => PartnerDto)
  partners: PartnerDto[];

  @ApiProperty({ type: [EventScheduleDto], description: 'List of event schedules' })
  @Type(() => EventScheduleDto)
  eventSchedules: EventScheduleDto[];

  @ApiProperty({ type: [SocialLinkDto], description: 'List of social links' })
  @Type(() => SocialLinkDto)
  socialLinks: SocialLinkDto[];

  @ApiProperty({ type: [String], description: 'List of custom field IDs' })
  customFieldIds: string[];

  @ApiProperty({ type: [String], description: 'List of required document IDs' })
  requiredDocumentIds: string[];
}
