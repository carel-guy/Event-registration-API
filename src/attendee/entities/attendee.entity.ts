// src/attendee/entities/attendee.entity.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { IsString, IsEmail, IsOptional, IsObject } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export type AttendeeDocument = Attendee & Document;

@Schema({
  timestamps: true,
  collection: "attendees",
})
export class Attendee {
  @ApiProperty({ type: String, description: 'The unique identifier of the tenant this attendee belongs to.', example: '60c72b2f9b1d8f001c8e4d8b' })
  @Prop({ type: Types.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @ApiProperty({ description: 'Unique identifier for the user associated with this attendee record, typically from an authentication system.', example: 'auth0|60c72b2f9b1d8f001c8e4d8a' })
  @Prop({ type: String, required: true }) // userId is unique per tenant, not globally unique
  @IsString()
  userId: string;

  @ApiProperty({ description: 'First name of the attendee.', example: 'John' })
  @Prop({ type: String, required: true })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name of the attendee.', example: 'Doe' })
  @Prop({ type: String, required: true })
  @IsString()
  lastName: string;

  @Prop({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ description: 'Email address of the attendee, unique per tenant.', example: 'john.doe@example.com' })
  @Prop({ type: String, required: true }) // email is unique per tenant, not globally unique
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Optional phone number of the attendee.', example: '+1234567890', required: false })
  @Prop({ type: String, required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Optional object for storing custom fields related to the attendee.', example: { company: 'Acme Corp', industry: 'Tech' }, required: false })
  @Prop({ type: Object, required: false })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}

export const AttendeeSchema = SchemaFactory.createForClass(Attendee);
// Compound unique index for tenantId and userId (DISABLED FOR DEV)
// AttendeeSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
// Compound unique index for tenantId and email (DISABLED FOR DEV)
// AttendeeSchema.index({ tenantId: 1, email: 1 }, { unique: true });