import { PaymentStatus, RegistrationStatus } from "src/enums";
// Removed Sexe, HousingMode, DocumentType from import as they are now strings in schema.

export interface RegistrationEvent {
  registrationId: string;
  eventId: string;
  userId: string;
  tenantId: string;
  timestamp: string;
}

export interface RegistrationCreatedEvent extends RegistrationEvent {
  owner?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sexe?: string; // Changed from Sexe enum to string
  dateOfBirth?: string; // Consider using Date type if you handle ISO strings correctly
  yearOfBirth?: string;
  birthPlace?: string;
  countryOfBirth?: string;
  nationality?: string;
  profession?: string;
  professionDocId?: string;
  organization?: string;
  institution?: string;
  specialRequirements?: string;
  terms: boolean;
  housingMode?: string; // Changed from HousingMode enum to string
  accommodationType?: string;
  isForeigner: boolean;
  needsVisa?: boolean;
  typeDocument?: string; // Changed from DocumentType enum to string
  documentNumber?: string;
  placeOfIssue?: string;
  dateOfIssue?: string; // Consider using Date type
  expirationDate?: string; // Consider using Date type
  passportPhotoId?: string;
  passportCopyId?: string;
  purposeOfTravel?: string;
  dateOfArrivalInBurundi?: string; // Consider using Date type
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
  qrCodeFileId: string;
  registrationDate: string; // Consider using Date type
  language?: string;
  documents?: { requiredDocumentId: string; fileReferenceId: string }[];
  assignedTariffId?: string;
  price?: number;
  paymentStatus?: PaymentStatus;
  status?: RegistrationStatus;
}

export interface RegistrationUpdatedEvent extends RegistrationEvent {
  updatedFields: Partial<{
    owner?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    sexe?: string; // Changed from Sexe enum to string
    dateOfBirth?: string; // Consider using Date type
    yearOfBirth?: number;
    birthPlace?: string;
    countryOfBirth?: string;
    nationality?: string;
    profession?: string;
    professionDocId?: string;
    organization?: string;
    institution?: string;
    specialRequirements?: string;
    terms?: boolean;
    housingMode?: string; // Changed from HousingMode enum to string
    accommodationType?: string;
    isForeigner?: boolean;
    needsVisa?: boolean;
    typeDocument?: string; // Changed from DocumentType enum to string
    documentNumber?: string;
    placeOfIssue?: string;
    dateOfIssue?: string; // Consider using Date type
    expirationDate?: string; // Consider using Date type
    passportPhotoId?: string;
    passportCopyId?: string;
    purposeOfTravel?: string;
    dateOfArrivalInBurundi?: string; // Consider using Date type
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
    customFields?: Record<string, any>;
    qrCodeFileId?: string;
    registrationDate?: string; // Consider using Date type
    language?: string;
    documents?: { requiredDocumentId: string; fileReferenceId: string }[];
    assignedTariffId?: string | null;
    price?: number;
    paymentStatus?: PaymentStatus;
    status?: RegistrationStatus;
  }>;
}

export interface RegistrationDeletedEvent extends RegistrationEvent {}