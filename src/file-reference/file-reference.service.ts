// src/file-reference/file-reference.service.ts

import { Injectable, NotFoundException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { CreateFileReferenceDto } from './dto/create-file-reference.dto';
import { UpdateFileReferenceDto } from './dto/update-file-reference.dto';
import { FilterFileReferenceDto } from './dto/filter-file-reference.dto';
import { FileReference } from './entities/file-reference.entity';
import { MinioService } from '../minio/minio.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { Multer } from 'multer';

@Injectable()
export class FileReferenceService {
  private readonly logger = new Logger(FileReferenceService.name);

  constructor(
    @InjectModel(FileReference.name) private fileReferenceModel: Model<FileReference>,
    private readonly minioService: MinioService,
        private readonly configService: ConfigService, // Add ConfigService

  ) {}

  async uploadAndCreate(
    tenantId: Types.ObjectId,
    uploadedBy: Types.ObjectId | null,
    file: Multer.File,
    createFileReferenceDto: CreateFileReferenceDto,
    session?: ClientSession,
  ): Promise<FileReference> {
    this.logger.log(`Attempting to upload and create file reference for tenantId: ${tenantId.toHexString()}`);

    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const bucket = this.configService.get<string>('MINIO_BUCKET_NAME'); // Use ConfigService
    const objectPath = `/${tenantId.toHexString()}/${uniqueFileName}`;

    try {
      await this.minioService.uploadFile(objectPath, file.buffer, file.size, file.mimetype);
      this.logger.log(`File uploaded to MinIO: ${objectPath}`);
    } catch (error) {
      this.logger.error(`MinIO upload failed for ${objectPath}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file to storage system.');
    }

    // Store only the relative path in the DB (e.g., /tenantId/uuid.ext)
    const createdFileReference = new this.fileReferenceModel({
      tenantId: tenantId,
      path: objectPath,
      label: createFileReferenceDto.label || file.originalname,
      fileType: file.mimetype,
      uploadedBy: uploadedBy,
    });

    try {
      const savedFileReference = await createdFileReference.save({ session });
      // Use ConfigService for MinIO URL as well
      const minioUrl = this.configService.get<string>('MINIO_URL', 'http://192.168.40.41:9000');
      return {
        ...savedFileReference.toObject(),
        path: `${minioUrl}/${bucket}${objectPath}`
      };
    } catch (error) {
      this.logger.error(`Failed to save file reference to DB for path ${objectPath}: ${error.message}`, error.stack);
      await this.minioService.deleteFile(objectPath);
      throw new InternalServerErrorException('Failed to save file reference after upload. File deleted from storage.');
    }
  }


  async findAll(
    tenantId: Types.ObjectId,
    filterDto: FilterFileReferenceDto,
  ): Promise<{ fileReferences: FileReference[]; total: number; page: number; limit: number; totalPages: number }> {
    this.logger.log(`Fetching all file references for tenantId: ${tenantId.toHexString()} with filters: ${JSON.stringify(filterDto)}`);
    const { label, page = 1, limit = 10 } = filterDto;

    const query: any = { tenantId: tenantId };

    if (label) {
      query.label = { $regex: label, $options: 'i' };
    }

    try {
      const total = await this.fileReferenceModel.countDocuments(query).exec();
      const fileReferences = await this.fileReferenceModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      const totalPages = Math.ceil(total / limit);

      this.logger.log(`Found ${fileReferences.length} file references (total: ${total}) for tenantId: ${tenantId.toHexString()} on page ${page}`);
      return { fileReferences, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to fetch file references for tenantId: ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(tenantId: Types.ObjectId, id: Types.ObjectId): Promise<FileReference> {
    this.logger.log(`Attempting to find file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    const fileReference = await this.fileReferenceModel.findOne({ _id: id, tenantId: tenantId }).exec();
    if (!fileReference) {
      this.logger.warn(`NotFound: File reference with ID "${id.toHexString()}" not found or does not belong to tenantId: ${tenantId.toHexString()}`);
      throw new NotFoundException(`FileReference with ID "${id}" not found or does not belong to this tenant.`);
    }
    this.logger.log(`Found file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    return fileReference;
  }

  async update(tenantId: Types.ObjectId, id: Types.ObjectId, updateFileReferenceDto: UpdateFileReferenceDto): Promise<FileReference> {
    this.logger.log(`Attempting to update file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);

    const updatedFileReference = await this.fileReferenceModel
      .findOneAndUpdate(
        { _id: id, tenantId: tenantId },
        updateFileReferenceDto,
        { new: true },
      )
      .exec();
    if (!updatedFileReference) {
      this.logger.warn(`NotFound: File reference with ID "${id.toHexString()}" not found or does not belong to tenantId: ${tenantId.toHexString()} during update.`);
      throw new NotFoundException(`FileReference with ID "${id}" not found or does not belong to this tenant.`);
    }
    this.logger.log(`Successfully updated file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    return updatedFileReference;
  }

  async remove(tenantId: Types.ObjectId, id: Types.ObjectId): Promise<{ message: string }> {
    this.logger.log(`Attempting to remove file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    const fileReference = await this.fileReferenceModel.findOne({ _id: id, tenantId: tenantId }).exec();

    if (!fileReference) {
      this.logger.warn(`NotFound: File reference with ID "${id.toHexString()}" not found or does not belong to tenantId: ${tenantId.toHexString()} during deletion.`);
      throw new NotFoundException(`FileReference with ID "${id}" not found or does not belong to this tenant.`);
    }

    try {
      await this.minioService.deleteFile(fileReference.path);
      this.logger.log(`File "${fileReference.path}" deleted from MinIO.`);
    } catch (error) {
      this.logger.error(`MinIO deletion failed for ${fileReference.path}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file from storage system.');
    }

    const result = await this.fileReferenceModel.deleteOne({ _id: id, tenantId: tenantId }).exec();
    if (result.deletedCount === 0) {
      this.logger.warn(`Failed to delete file reference from DB for ID: ${id.toHexString()} after MinIO deletion.`);
      throw new InternalServerErrorException('File deleted from storage but failed to update database record.');
    }

    this.logger.log(`Successfully removed file reference with ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    return { message: 'FileReference successfully deleted.' };
  }

  /**
   * Returns a readable stream and mimetype for a file, for preview/download.
   * Can fetch by either MongoDB ObjectId or by file path.
   * @param tenantId Tenant's ObjectId
   * @param identifier FileReference's ObjectId or file path
   * @param byPath If true, identifier is treated as path; otherwise as ObjectId
   */
  async getFileStreamPreview(
  identifier: Types.ObjectId | string,
): Promise<{ stream: Readable; mimetype: string }> {
  this.logger.log(`Attempting to get file stream for identifier: ${identifier}`);

  let fileReference: FileReference | null;

  if (typeof identifier === 'string' && identifier.startsWith('/')) {
    fileReference = await this.fileReferenceModel.findOne({ path: identifier }).exec();
  } else {
    fileReference = await this.fileReferenceModel.findById(identifier).exec();
  }

  if (!fileReference) {
    this.logger.warn(`FileReference "${identifier}" not found.`);
    throw new NotFoundException(`FileReference "${identifier}" not found.`);
  }

  try {
    const stream = await this.minioService.getFile(fileReference.path);
    return { stream, mimetype: fileReference.fileType || "application/octet-stream" };
  } catch (error) {
    this.logger.error(
      `Failed to get file stream for path ${fileReference.path}: ${error.message}`,
      error.stack
    );
    throw new InternalServerErrorException("Failed to retrieve file from storage system for download.");
  }
}


  /**
   * Returns a readable stream and mimetype for a file, for preview/download.
   * @param tenantId Tenant's ObjectId
   * @param id FileReference's ObjectId
   */
  async getFileStream(
    tenantId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<{ stream: Readable; mimetype: string }> {
    this.logger.log(`Attempting to get file stream for ID: ${id.toHexString()} for tenantId: ${tenantId.toHexString()}`);
    const fileReference = await this.fileReferenceModel.findOne({ _id: id, tenantId: tenantId }).exec();

    if (!fileReference) {
      this.logger.warn(`NotFound: File reference with ID "${id.toHexString()}" not found or does not belong to tenantId: ${tenantId.toHexString()} for download.`);
      throw new NotFoundException(`FileReference with ID "${id}" not found or does not belong to this tenant.`);
    }

    try {
      const stream = await this.minioService.getFile(fileReference.path);
      return { stream, mimetype: fileReference.fileType || 'application/octet-stream' };
    } catch (error) {
      this.logger.error(`Failed to get file stream for path ${fileReference.path}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve file from storage system for download.');
    }
  }
}
