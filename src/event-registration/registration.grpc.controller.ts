import { Controller, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { GrpcMethod } from '@nestjs/microservices';
import { EventRegistrationService } from './event-registration.service';

// Interfaces aligned with the updated registration.proto
interface ValidateRegistrationRequest {
  registrationId: string;
  eventId: string;
  tenantId: string;
}

interface ValidateRegistrationResponse {
  isValid: boolean;
  message: string;
  status: string;
}

interface GetRegistrationDetailsRequest {
  registrationId: string;
  tenantId: string;
}

interface PingRequest {}

interface PingResponse {
  message: string;
  timestamp: Timestamp;
}

interface DocumentInfo {
  required_document_id: string;
  file_reference_id: string;
}

interface Timestamp {
  seconds: number;
  nanos: number;
}

interface GetRegistrationDetailsResponse {
  registrationId: string;
  tenantId: string;
  eventId: string;
  userId: string;
  qrCodeId?: string;
  badgeGenerated: boolean;
  badgeUrl?: string;
  qrValidated: boolean;
  lastValidationAt?: Timestamp;
  owner?: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  sexe?: string;
  dateOfBirth?: Timestamp;
  yearOfBirth?: number;
  birthPlace?: string;
  imageUrl?: string;
  countryOfBirth?: string;
  nationality?: string;
  profession?: string;
  professionDocId?: string;
  organization?: string;
  institution?: string;
  specialRequirements?: string;
  terms: boolean;
  housingMode?: string;
  accommodationType?: string;
  isForeigner: boolean;
  needsVisa: boolean;
  typeDocument?: string;
  documentNumber?: string;
  placeOfIssue?: string;
  dateOfIssue?: Timestamp;
  expirationDate?: Timestamp;
  passportPhotoId?: string;
  passportCopyId?: string;
  purposeOfTravel?: string;
  dateOfArrivalInBurundi?: Timestamp;
  currentVisaCopyId?: string;
  maritalStatus?: string;
  fatherFirstName?: string;
  fatherLastName?: string;
  motherFirstName?: string;
  motherLastName?: string;
  province?: string;
  commune?: string;
  zone?: string;
  colline?: string;
  fullAddress?: string;
  contactPerson?: string;
  contactNumber?: string;
  referencePersonFirst?: string;
  referencePersonLast?: string;
  phoneNumberReference?: string;
  category?: string;
  qrCodeFileId?: string;
  registrationDate?: Timestamp;
  language?: string;
  documents: DocumentInfo[];
  assignedTariffId?: string;
  price?: number;
  paymentStatus?: string;
}


@Controller()
export class RegistrationGrpcController {
  private readonly logger = new Logger(RegistrationGrpcController.name);

  constructor(private readonly registrationService: EventRegistrationService) {}

  @GrpcMethod('RegistrationService', 'ValidateRegistration')
  async validateRegistration(
    request: ValidateRegistrationRequest,
  ): Promise<ValidateRegistrationResponse> {
    const { registrationId, eventId, tenantId } = request;

    this.logger.log(
      `[gRPC] Received validation request for registration: ${registrationId} for event: ${eventId} in tenant: ${tenantId}`,
    );

    return this.registrationService.validateRegistration(
      registrationId,
      eventId,
      tenantId,
    );
  }

  @GrpcMethod('RegistrationService', 'Ping')
  ping(): PingResponse {
    this.logger.log('[gRPC] Received Ping request');
    const now = new Date();
    return {
      message: 'pong',
      timestamp: {
        seconds: Math.floor(now.getTime() / 1000),
        nanos: (now.getTime() % 1000) * 1e6,
      },
    };
  }

  @GrpcMethod('RegistrationService', 'GetRegistrationDetails')
  async getRegistrationDetails(
    data: GetRegistrationDetailsRequest,
  ): Promise<GetRegistrationDetailsResponse> {
    const { registrationId, tenantId } = data;

    this.logger.log(
      `[gRPC] Received GetRegistrationDetails request for registration: ${registrationId} in tenant: ${tenantId}`,
    );

    if (!registrationId || !tenantId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Registration ID and Tenant ID are required.',
      });
    }

    const registration = await this.registrationService.findRegistrationDetailsById(
      registrationId,
      tenantId,
    );

    if (!registration) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Registration with ID ${registrationId} not found.`,
      });
    }

    const toTimestamp = (date: Date | undefined): Timestamp | undefined => {
      if (!date) return undefined;
      return { seconds: Math.floor(date.getTime() / 1000), nanos: 0 };
    };

    return {
      registrationId: registration._id.toString(),
      tenantId: registration.tenantId.toString(),
      eventId: registration.eventId.toString(),
      userId: registration.userId.toString(),
      status: registration.status || '',
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      phone: registration.phone,
      sexe: registration.sexe || '',
      dateOfBirth: registration.dateOfBirth
        ? {
            seconds: Math.floor(registration.dateOfBirth.getTime() / 1000),
            nanos: (registration.dateOfBirth.getTime() % 1000) * 1e6,
          }
        : undefined,
      yearOfBirth: registration.yearOfBirth || 0,
      birthPlace: registration.birthPlace || '',
      countryOfBirth: registration.countryOfBirth || '',
      nationality: registration.nationality || '',
      profession: registration.profession || '',
      organization: registration.organization || '',
      institution: registration.institution || '',
      specialRequirements: registration.specialRequirements || '',
      terms: registration.terms ?? false,
      isForeigner: registration.isForeigner ?? false,
      needsVisa: registration.needsVisa ?? false,
      housingMode: registration.housingMode || '',
      typeDocument: registration.typeDocument || '',
      documentNumber: registration.documentNumber || '',
      placeOfIssue: registration.placeOfIssue || '',
      dateOfIssue: registration.dateOfIssue
        ? {
            seconds: Math.floor(registration.dateOfIssue.getTime() / 1000),
            nanos: (registration.dateOfIssue.getTime() % 1000) * 1e6,
          }
        : undefined,
      expirationDate: registration.expirationDate
        ? {
            seconds: Math.floor(registration.expirationDate.getTime() / 1000),
            nanos: (registration.expirationDate.getTime() % 1000) * 1e6,
          }
        : undefined,
      purposeOfTravel: registration.purposeOfTravel || '',
      dateOfArrivalInBurundi: registration.dateOfArrivalInBurundi
        ? {
            seconds: Math.floor(
              registration.dateOfArrivalInBurundi.getTime() / 1000,
            ),
            nanos:
              (registration.dateOfArrivalInBurundi.getTime() % 1000) * 1e6,
          }
        : undefined,
      maritalStatus: registration.maritalStatus || '',
      fatherFirstName: registration.fatherFirstName || '',
      fatherLastName: registration.fatherLastName || '',
      motherFirstName: registration.motherFirstName || '',
      motherLastName: registration.motherLastName || '',
      province: registration.province || '',
      commune: registration.commune || '',
      zone: registration.zone || '',
      colline: registration.colline || '',
      fullAddress: registration.fullAddress || '',
      contactPerson: registration.contactPerson || '',
      contactNumber: registration.contactNumber || '',
      referencePersonFirst: registration.referencePersonFirst || '',
      referencePersonLast: registration.referencePersonLast || '',
      phoneNumberReference: registration.phoneNumberReference || '',
      category: registration.category || '',
      registrationDate: registration.registrationDate
        ? {
            seconds: Math.floor(registration.registrationDate.getTime() / 1000),
            nanos: (registration.registrationDate.getTime() % 1000) * 1e6,
          }
        : undefined,
      language: registration.language || '',
      documents: (registration.documents || []).map((doc) => ({
        required_document_id: doc.requiredDocumentId,
        file_reference_id: doc.fileReferenceId,
      })),
      assignedTariffId: registration.assignedTariffId || '',
      price: registration.price || 0,
      paymentStatus: registration.paymentStatus || 'PENDING',
      qrCodeId: registration.qrCodeId || '',
      badgeGenerated: registration.badgeGenerated || false,
      badgeUrl: registration.badgeUrl || '',
      qrValidated: registration.qrValidated || false,
      lastValidationAt: registration.lastValidationAt
        ? {
            seconds: Math.floor(registration.lastValidationAt.getTime() / 1000),
            nanos: (registration.lastValidationAt.getTime() % 1000) * 1e6,
          }
        : undefined,
    };
  }
}
