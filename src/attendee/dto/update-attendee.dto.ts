// src/attendee/dto/update-attendee.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAttendeeDto } from './create-attendee.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';

export class UpdateAttendeeDto extends PartialType(CreateAttendeeDto) {
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'URL of the attendee\'s profile image.', required: false, example: 'http://example.com/image.png' })
  imageUrl?: string;
}