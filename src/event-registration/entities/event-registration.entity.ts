// src/event-registration/schemas/event-registration.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import {
  IsMongoId,
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDate,
  IsNumber,
  IsBoolean,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { BadgeStatus, PaymentStatus, RegistrationStatus, Sexe, HousingMode, DocumentType } from "src/enums"; // Import all enums
import { FileReference } from "src/file-reference/entities/file-reference.entity";

export type EventRegistrationDocument = HydratedDocument<EventRegistration>;

// DocumentInfo remains as a sub-schema because it's an array of structured objects
@Schema()
class DocumentInfo {
  @Prop({ type: String, required: true })
  @IsString()
  requiredDocumentId: string; // The ID of the required document type from EventConfig/RequiredDocument schema

  @Prop({ type: String, ref: FileReference.name, required: true })
  @IsString()
  fileReferenceId: string; // The actual uploaded file
}

@Schema({
  timestamps: true,
  collection: "eventRegistrations",
})
export class EventRegistration {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  @IsMongoId()
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: Event.name })
  @IsMongoId()
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true, ref: 'User' }) // Assumes userId links to your User model
  @IsMongoId()
  userId: Types.ObjectId;

  @Prop({ type: String, required: false })
  qrCodeId?: string;

  @Prop({ type: Boolean, default: false })
  @IsBoolean()
  badgeGenerated?: boolean;

  @Prop({ type: String, required: false })
  @IsString()
  badgeUrl?: string;

  @Prop({
    type: String,
    enum: BadgeStatus,
    default: BadgeStatus.PENDING,
    index: true,
  })
  @IsEnum(BadgeStatus)
  @IsOptional()
  badgeStatus?: BadgeStatus;

  @Prop({ type: Number, default: 0 })
  @IsNumber()
  @IsOptional()
  badgeRetryCount?: number;

  @Prop({ type: Boolean, default: false })
  @IsBoolean()
  qrValidated?: boolean;

  @Prop({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  lastValidationAt?: Date;

  @Prop({ type: String, required: false })
  @IsString()
  owner?: string

  @Prop({ type: String, enum: RegistrationStatus, default: RegistrationStatus.REGISTERED })
  @IsEnum(RegistrationStatus)
  @IsOptional()
  status?: RegistrationStatus;

  // --- Core Attendee Information ---
  @Prop({ type: String, required: true })
  @IsString()
  firstName: string;

  @Prop({ type: String, required: true })
  @IsString()
  lastName: string;

  @Prop({ type: String, required: true })
  @IsString()
  email: string;

  @Prop({ type: String, required: true })
  @IsString()
  phone: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  sexe?: string;

  @Prop({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  dateOfBirth?: Date;

  @Prop({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  yearOfBirth?: number;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  birthPlace?: string;@Prop({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  countryOfBirth?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  profession?: string;

  @Prop({ type: String, ref: FileReference.name, required: false })
  @IsOptional()
  @IsString()
  professionDocId?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  organization?: string;

  @Prop({ type: String, required: false }) // Typo fixed: 'institution'
  @IsOptional()
  @IsString()
  institution?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @Prop({ type: Boolean, required: false, default: false })
  @IsBoolean()
  terms: boolean;

  // Removed duplicate status property

  // --- Accommodation/Housing Details ---
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  housingMode?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  accommodationType?: string;

  // --- Foreigner/Visa Specific Information - Inlined ---
  @Prop({ type: Boolean, required: true, default: false })
  @IsBoolean()
  isForeigner: boolean;

  @Prop({ type: Boolean, required: false })
  @IsOptional()
  @IsBoolean()
  needsVisa?: boolean;

  // Identification Details (Inlined)
@Prop({ type: String, required: false })
@IsOptional()
typeDocument?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  placeOfIssue?: string;

  @Prop({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  dateOfIssue?: Date;

  @Prop({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  expirationDate?: Date;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  passportPhotoId?: string;

  @Prop({ type: String, ref: FileReference.name, required: false })
  @IsOptional()
  @IsString()
  passportCopyId?: string;

  // Visa Information (Inlined)
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  purposeOfTravel?: string;

  @Prop({ type: Date, required: false })
  @IsDate()
  @IsOptional()
  dateOfArrivalInBurundi?: Date;

  @Prop({ type: String, ref: FileReference.name, required: false })
  @IsOptional()
  @IsString()
  currentVisaCopyId?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  // --- Parent Information (Inlined) ---
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  fatherFirstName?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  fatherLastName?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  motherFirstName?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  motherLastName?: string;

  // --- Address in Burundi (Inlined) ---
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  commune?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  zone?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  colline?: string;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @Prop({
    type:String,
    required: false,
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @Prop({
    type:String,
    required: false,
  })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @Prop({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  referencePersonFirst?: string;

  @Prop({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  referencePersonLast?: string;

  @Prop({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumberReference?: string;

  @Prop({
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;


  @Prop({ type: Types.ObjectId, ref: FileReference.name, required: true })
  @IsMongoId()
  qrCodeFileId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now, required: false })
  @IsDate()
  @IsOptional()
  registrationDate: Date;

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @Prop({ type: [DocumentInfo], required: false })
  @IsOptional()
  @IsArray()
  // @ValidateNested({ each: true }) // Not needed here, but essential in your DTO
  @Type(() => DocumentInfo) // Essential for transformation in DTO
  documents?: DocumentInfo[];

  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  assignedTariffId?: string;

  @Prop({ type: Number, required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @Prop({ type: String, enum: PaymentStatus, required: false, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export const EventRegistrationSchema = SchemaFactory.createForClass(EventRegistration);

// Indexes remain the same
EventRegistrationSchema.index({ tenantId: 1, eventId: 1, userId: 1 }, { unique: false }); 
EventRegistrationSchema.index({ tenantId: 1, eventId: 1, status: 1 });
EventRegistrationSchema.index({ tenantId: 1, email: 1 }, { unique: true });