// src/attendee/dto/create-attendee.dto.ts
import { IsString, IsEmail, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendeeDto {
  @ApiProperty({
    description: 'Unique identifier for the user associated with this attendee record, typically from an authentication system (e.g., Auth0 sub).',
    example: 'auth0|60c72b2f9b1d8f001c8e4d8a',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'First name of the attendee.',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'The last name of the attendee.',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    description: 'URL of the attendee\'s profile image.', 
    required: false, 
    example: 'http://example.com/image.png' 
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Email address of the attendee, must be unique within a tenant.',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Optional phone number of the attendee.',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Optional object for storing custom fields related to the attendee.',
    example: { company: 'Acme Corp', industry: 'Software' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}