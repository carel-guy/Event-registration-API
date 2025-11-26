import { Metadata } from "@grpc/grpc-js";
import { Observable } from "rxjs";

export interface EventService {
  GetEventConfig(data: { tenantId: string; eventId: string }, metadata?: Metadata): Observable<EventConfig>;
  getEventById(data: { eventId: string; tenantId: string }): Observable<Event>;
  Ping(data: {}, metadata?: Metadata): Observable<{ message: string }>;
}

export interface Condition {
  field: string;
  operator: string;
  value: any; // Corresponds to google.protobuf.Value
}

export interface TariffRule {
  id: string;
  name: string;
  description: string;
  conditions: Condition[];
  currency: string;
  isActive: boolean;
  price: number;
  validFrom: string;
  validUntil: string;
  amountType: string;
  amount: number;
  tariffType: string;
  createdAt: string;
  updatedAt: string;
}

export interface Partner {
  id: string;
  name: string;
  logo: string;
  website: string;
  description: string;
}

export interface Speaker {
  id: string;
  name: string;
  bio: string;
  company: string;
  linkedinUrl: string;
  speakerType: string;
  profilePictureId: string[];
}

export interface EventSchedule {
  id: string;
  title: string;
  description: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  location: string;
  speakers: Speaker[];
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Location {
  name: string;
  address: string;
}

export enum EventFormat {
  IN_PERSON = 0,
  HYBRID = 1,
  VIRTUAL = 2,
  OTHER = 3,
}

export interface Event {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  timezone: string;
  avenue: string;
  adresse: string;
  virtualUrl: string;
  numberOfParticipants: number;
  currency: string;
  fileReferenceIds: string;
  isPublic: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  format: EventFormat;
  locations: Location[];
  tariffRules: TariffRule[];
  partners: Partner[];
  eventSchedules: EventSchedule[];
  socialLinks: SocialLink[];
  customFieldIds: string[];
  requiredDocumentIds: string[];
}

export interface RequiredDocument {
    id: string;
    key: string;
    label: string;
}

export interface EventConfig {
  requiredDocuments: RequiredDocument[];
  tariffRules: TariffRule[];
}