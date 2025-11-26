import { PartialType, ApiProperty } from '@nestjs/swagger';
import {
  
  CreateEventRegistrationDto, // Make sure to import the base DTO
} from './create-event-registration.dto'; // Adjust this path if create-event-registration.dto is elsewhere


export class UpdateEventRegistrationDto extends PartialType(CreateEventRegistrationDto) {
  
}