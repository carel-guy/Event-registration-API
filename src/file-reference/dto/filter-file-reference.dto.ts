// src/file-reference/dto/filter-file-reference.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FileType } from 'src/enums'; // Ensure correct path to enums

export class FilterFileReferenceDto {
  @ApiProperty({
    description: 'Optional: Filter by file label (case-insensitive partial match).',
    example: 'application',
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({
    description: 'Optional: Filter by file type (MIME type).',
    example: FileType.PDF,
    enum: FileType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @ApiProperty({
    description: 'Optional: Filter by the ID of the user who uploaded the file.',
    example: '60d5ec49f8a3c5a6d8b4567e',
    required: false,
  })
  @IsOptional()
  @IsString() // Use IsString for ObjectId in query params
  uploadedBy?: string;

  @ApiProperty({
    description: 'Page number for pagination.',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number) // Ensure transformation from string query param to number
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page.',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100) // Set a reasonable max limit
  @Type(() => Number) // Ensure transformation from string query param to number
  limit?: number = 10;
}
