import { Module } from '@nestjs/common';
import { FileReferenceService } from './file-reference.service';
import { FileReferenceController } from './file-reference.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { File } from 'buffer';
import { FileReference, FileReferenceSchema } from './entities/file-reference.entity';
import { MinioModule } from 'src/minio/minio.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileReference.name, schema: FileReferenceSchema }
    ]),
    MinioModule
  ],
  controllers: [FileReferenceController],
  providers: [FileReferenceService, ConfigService],
  exports: [FileReferenceService]
})
export class FileReferenceModule {}
