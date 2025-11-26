export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  CHECKED_IN = 'CHECKED_IN',
  PENDING_APPROVAL = 'PENDING_APPROVAL', // If there's a review process
  WAITLISTED = 'WAITLISTED', // If you have a waitlist feature
  ATTENDED = 'ATTENDED', // For post-event tracking (check-in)
  NO_SHOW = 'NO_SHOW', // For post-event tracking
}

export enum HousingMode {
  SELF_ARRANGED = 'SELF_ARRANGED', // Participant arranges their own accommodation
  EVENT_ACCOMMODATION = 'EVENT_ACCOMMODATION', // Accommodation provided or arranged by the event
  LOCAL_RESIDENT = 'LOCAL_RESIDENT', // Lives in the event city/area, no accommodation needed
  NO_ACCOMMODATION_NEEDED = 'NO_ACCOMMODATION_NEEDED', // Broader than local resident
}

export enum FileType {
  JPEG = "image/jpeg",
  PNG = "image/png",
  PDF = "application/pdf",
  DOC = "application/msword",
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  OTHER = "application/octet-stream",
}

export enum PaymentStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export enum BadgeStatus {
  PENDING = 'PENDING',
  GENERATED = 'GENERATED',
  FAILED = 'FAILED',
}

export enum Sexe {
  // Using English terms for broader consistency in codebase, but keeping French as option in comments
  MALE = 'MALE',       // Masculin
  FEMALE = 'FEMALE',   // Feminin
  NON_BINARY = 'NON_BINARY', // To cover identities beyond male/female
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY', // For privacy
  UNKNOWN = 'UNKNOWN', // If data might be missing or uncollected
}

// src/enums/index.ts

/**
 * Defines the type of identification document provided by a registrant.
 */
export enum DocumentType {
  PASSPORT = 'PASSPORT', // Aligned with 'passeport' in requiredDocuments
  NATIONAL_ID_CARD = 'NATIONAL_ID_CARD', // Aligned with 'carte_identite' in requiredDocuments
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  VISA = 'VISA',
  BUSINESS_CARD = 'BUSINESS_CARD', // Aligned with 'carte_de_visite' in requiredDocuments
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
  WORK_PERMIT = 'WORK_PERMIT',
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  STUDENT_ID = 'STUDENT_ID',
  MEDICAL_CERTIFICATE = 'MEDICAL_CERTIFICATE',
  TRAVEL_INSURANCE = 'TRAVEL_INSURANCE',
  VACCINATION_CARD = 'VACCINATION_CARD',
  OTHER = 'OTHER',
}

/**
 * Specifies the primary purpose of travel for a registrant, especially relevant for visa applications.
 */
export enum TravelPurpose {
  CONFERENCE = 'CONFERENCE',
  BUSINESS = 'BUSINESS',
  TOURISM = 'TOURISM',
  STUDY = 'STUDY',
  VISITING_FAMILY = 'VISITING_FAMILY',
  MEDICAL = 'MEDICAL',
  TRANSIT = 'TRANSIT',
  OTHER = 'OTHER',
}

/**
 * Describes the marital status of an individual.
 */
export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  SEPARATED = 'SEPARATED',
  DOMESTIC_PARTNERSHIP = 'DOMESTIC_PARTNERSHIP',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/**
 * Defines the professional or academic category of an event registrant.
 */
export enum RegistrationCategory {
  STUDENT = 'STUDENT',
  PROFESSIONAL = 'PROFESSIONAL',
  ACADEMIC = 'ACADEMIC',
  GOVERNMENT_OFFICIAL = 'GOVERNMENT_OFFICIAL',
  NGO_REPRESENTATIVE = 'NGO_REPRESENTATIVE',
  MEDIA = 'MEDIA',
  VOLUNTEER = 'VOLUNTEER',
  SPEAKER = 'SPEAKER',
  EXHIBITOR = 'EXHIBITOR',
  SPONSOR = 'SPONSOR',
  GENERAL_PUBLIC = 'GENERAL_PUBLIC',
  OTHER = 'OTHER',
}


export enum UserRole {
  // Realm-Level Roles (Global across all tenants)
  SUPER_ADMIN = 'SUPER_ADMIN',       // Full platform control
  SUPPORT_AGENT = 'SUPPORT_AGENT',   // Cross-tenant support staff
  USER = 'USER',                     // Base authenticated user

  // Client-Level Roles (Specific to the event-management-service)
  TENANT_OWNER = 'TENANT_OWNER',       // The primary owner of the tenant account
  TENANT_ADMIN = 'TENANT_ADMIN',       // Manages the entire tenant (organization)
  EVENT_MANAGER = 'EVENT_MANAGER',     // Manages all aspects of a specific event
  EVENT_STAFF = 'EVENT_STAFF',         // General staff for an event (e.g., check-in, support)
  CONTENT_MODERATOR = 'CONTENT_MODERATOR', // Moderates user-generated content
  SPEAKER = 'SPEAKER',                 // A presenter or speaker at an event
  EXHIBITOR = 'EXHIBITOR',               // Represents a company at a booth or expo
  EVENT_GUEST = 'EVENT_GUEST',         // A general attendee or participant
}