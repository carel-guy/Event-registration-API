// src/attendee/dto/get-attendee-events.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GetAttendeeEventsDto {
    @ApiProperty({
    description: 'The ID of the tenant to which the attendee belongs',
    example: '60c72b2f9b1e8d001c8f8e1',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}