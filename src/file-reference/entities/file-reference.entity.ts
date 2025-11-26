import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { IsMongoId, IsString, IsEnum } from "class-validator";
import { FileType } from "src/enums";

export type FileReferenceDocument = FileReference & Document;

@Schema({ timestamps: true, collection: "fileReferences" })
export class FileReference {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  @IsMongoId()
  tenantId: Types.ObjectId;

  @Prop({ type: String, required: true })
  @IsString()
  path: string; 

  @Prop({ type: String, enum: FileType, required: false })
  @IsEnum(FileType)
  fileType?: FileType;

  @Prop({ type: Types.ObjectId, required: false })
  @IsMongoId()
  uploadedBy?: Types.ObjectId;

  @Prop({ type: String, required: false })
  @IsString()
  label?: string;
}

export const FileReferenceSchema = SchemaFactory.createForClass(FileReference);