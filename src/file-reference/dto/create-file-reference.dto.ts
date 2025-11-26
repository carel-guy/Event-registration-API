// src/file-reference/dto/create-file-reference.dto.ts

import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FileType } from 'src/enums'; // Ensure correct path to enums

export class CreateFileReferenceDto {
  @ApiProperty({
    example: 'Application form for new tenant',
    description: 'A human-readable label for the file.',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: FileType.PDF,
    description: 'The MIME type of the file. Must be one of the supported FileType enum values.',
    enum: FileType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;
}
