// src/file-reference/dto/update-file-reference.dto.ts

import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateFileReferenceDto } from './create-file-reference.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { FileType } from 'src/enums'; // Ensure correct path to enums

export class UpdateFileReferenceDto extends PartialType(CreateFileReferenceDto) {
  @ApiProperty({
    example: 'Updated document label',
    description: 'An updated human-readable label for the file.',
    required: false,
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({
    example: FileType.JPEG,
    description: 'An updated MIME type of the file.',
    enum: FileType,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;
}
