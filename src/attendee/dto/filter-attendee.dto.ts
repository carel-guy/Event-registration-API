// src/attendee/dto/filter-attendee.dto.ts
import { IsOptional, IsString, IsInt, Min, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterAttendeeDto {
  @ApiProperty({
    description: 'Filter attendees by partial first name match (case-insensitive).',
    example: 'ale',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Filter attendees by partial last name match (case-insensitive).',
    example: 'son',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Filter attendees by partial email match (case-insensitive).',
    example: 'test@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Filter attendees by exact user ID.',
    example: 'auth0|60c72b2f9b1d8f001c8e4d8a',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Page number for pagination (starts from 1).',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page.',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}