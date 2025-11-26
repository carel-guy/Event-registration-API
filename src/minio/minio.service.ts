// src/minio/minio.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { File } from 'multer';

@Injectable()
export class MinioService {
  public readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') ?? '';
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') ?? '',
      port: parseInt(this.configService.get<string>('MINIO_PORT') ?? '9000', 10),
      useSSL: this.configService.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY') ?? '',
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY') ?? '',
    });

    this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`MinIO bucket "${this.bucketName}" created successfully.`);
      } else {
        this.logger.log(`MinIO bucket "${this.bucketName}" already exists.`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure MinIO bucket "${this.bucketName}" exists: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Could not connect to MinIO or create bucket.`);
    }
  }

 public async uploadFile(
  objectName: string,
  fileBuffer: Buffer,
  fileSize: number,
  mimetype: string,
): Promise<{ etag: string }> {
  try {
    const metaData = { 'Content-Type': mimetype };
    const stream = new Readable();
    stream.push(fileBuffer);
    stream.push(null);

    const etag = await this.minioClient.putObject(
      this.bucketName,
      objectName,
      stream,
      fileSize,
      metaData,
    );

    this.logger.log(`File "${objectName}" uploaded to MinIO. ETag: ${etag.etag}`);
    return etag;
  } catch (error) {
    this.logger.error(`Failed to upload file "${objectName}" to MinIO: ${error.message}`, error.stack);
    throw new InternalServerErrorException(`Failed to upload file to storage.`);
  }
}


  async getFile(objectName: string): Promise<Readable> {
    try {
      const stream = await this.minioClient.getObject(this.bucketName, objectName);
      this.logger.log(`File "${objectName}" retrieved from MinIO.`);
      return stream;
    } catch (error) {
      this.logger.error(`Failed to retrieve file "${objectName}" from MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to retrieve file from storage.`);
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      this.logger.log(`File "${objectName}" deleted from MinIO.`);
    } catch (error) {
      this.logger.error(`Failed to delete file "${objectName}" from MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete file from storage.`);
    }
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      this.logger.error(`Failed to check existence of file "${objectName}" in MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to check file existence in storage.`);
    }
  }
  async uploadProfilePicture(
    tenantId: string,
    file: File,
    speakerId: string,
    speakerModel: any 
  ): Promise<void> {
    const objectKey = `${tenantId}/speakers/${speakerId}-${file.originalname}`;
    try {
      await this.minioClient.putObject(
        this.bucketName,
        objectKey,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype }
      );

      await speakerModel.updateOne(
        { _id: speakerId },
        { profilePictureKey: objectKey }
      );
      this.logger.log(`Profile picture uploaded for speaker "${speakerId}" with key "${objectKey}".`);
    } catch (error) {
      this.logger.error(`Failed to upload profile picture for speaker "${speakerId}": ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload profile picture.');
    }
  }


  public async getPresignedUrl(objectName: string, expiryInSeconds: number = 3600): Promise<string | null> {
    if (!objectName) {
      return null; // No objectName means no URL can be generated
    }
    try {

      const url = await this.minioClient.presignedGetObject(this.bucketName, objectName, expiryInSeconds);
      this.logger.log(`Generated presigned URL for "${objectName}".`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for "${objectName}": ${error.message}`, error.stack);
      // Return null or throw a specific error depending on desired behavior
      return null;
    }
  }
}
