import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsOptional,
  IsArray,
  ArrayUnique,
  IsString,
  IsEmail,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsDate,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Types } from 'mongoose';
import {
  PaymentStatus,
  RegistrationStatus,
  // Removed Sexe, HousingMode, DocumentType from enum imports as they are now strings in the schema
} from 'src/enums';

// DocumentUploadDto remains the same as its structure in schema is unchanged
export class DocumentUploadDto {
  @ApiProperty({
    description: 'ID du type de document requis (issu de la configuration de l\'événement).',
    example: '686256a01557fa23a04ad1fe',
  })
  @IsString()
  @IsNotEmpty()
  requiredDocumentId: string;

  @ApiProperty({
    description: 'ID de la référence de fichier du document téléchargé.',
    example: 'https://minio.example.com/thumbnails/actuality-ai-conf.jpg',
  })
  @IsString()
  @IsNotEmpty()
  fileReferenceId: string;
}

export class CreateEventRegistrationDto {

  @ApiProperty({
    description: 'ID de l\'événement pour lequel l\'inscription est effectuée.',
    example: '60d5ec49f8a3c5a6d8b4567f',
  })
  @IsMongoId()
  eventId: Types.ObjectId;

  

  @ApiProperty({
    description: 'Owner of the registration, typically the userId or an admin ID.',
    example: '60d5ec49f8a3c5a6d8b4567c',
    required: false,
  })
  @IsOptional()
  @IsString() // Type as string, assuming it's a string representation of an ID or name
  owner?: string;

  @ApiProperty({
    description: 'Statut de l\'inscription.',
    enum: RegistrationStatus,
    example: RegistrationStatus.REGISTERED,
    required: false,
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiProperty({
    description: 'Prénom du participant.',
    example: 'Jean',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'Nom de famille du participant.',
    example: 'Dupont',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Adresse e-mail du participant.',
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Numéro de téléphone du participant.',
    example: '+25779123456',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'Sexe du participant.',
    example: 'Male', // Example updated to string
    required: false,
  })
  @IsOptional()
  @IsString() // Changed from @IsEnum(Sexe) to @IsString()
  sexe?: string; // Type changed from enum to string

  @ApiPropertyOptional({ example: '2025-10-28T17:00:00Z', description: 'The end date and time of the event (ISO 8601 format).', required: false })
  @IsOptional()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ example: '1990', description: 'Année de naissance du participant (format AAAA).', required: false })
  @IsOptional()
  @IsNumber()
  yearOfBirth?: number;

  @ApiProperty({
    description: 'Lieu de naissance du participant.',
    example: 'Bujumbura',
    required: false,
  })
  @IsOptional()
  @IsString()
  birthPlace?: string;

  @ApiProperty({
    description: 'Pays de naissance du participant.',
    example: 'Burundi',
    required: false,
  })
  @IsOptional()
  @IsString()
  countryOfBirth?: string;

  @ApiProperty({
    description: 'Nationalité du participant.',
    example: 'Burundaise',
    required: false,
  })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({
    description: 'Profession du participant.',
    example: 'Ingénieur Logiciel',
    required: false,
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({
    description: 'ID de la référence de fichier pour le document de profession.',
    example: 'https://minio.example.com/thumbnails/profession_doc.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  professionDocId?: string;

  @ApiProperty({
    description: 'Organisation ou entreprise du participant.',
    example: 'Tech Solutions Inc.',
    required: false,
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty({
    description: 'Nom de l\'institution académique ou autre institution.',
    example: 'Université du Burundi',
    required: false,
  })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiProperty({
    description: 'Exigences particulières ou besoins spéciaux du participant.',
    example: 'Régime végétarien, accès en fauteuil roulant.',
    required: false,
  })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiProperty({
    description: 'Indique si le participant a accepté les termes et conditions.',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  terms?: boolean;

  @ApiProperty({
    description: 'Mode d\'hébergement du participant.',
    example: 'Self-Arranged', // Example updated to string
    required: false,
  })
  @IsOptional()
  @IsString() // Changed from @IsEnum(HousingMode) to @IsString()
  housingMode?: string; // Type changed from enum to string

  @ApiProperty({
    description: 'Type d\'hébergement spécifique.',
    example: 'Hôtel Hilton',
    required: false,
  })
  @IsOptional()
  @IsString()
  accommodationType?: string;

  @ApiProperty({
    description: 'Indique si le participant est un ressortissant étranger.',
    example: true,
    default: false,
  })
  @IsBoolean()
  isForeigner: boolean;

  @ApiProperty({
    description: 'Indique si le participant a besoin d\'un visa.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  needsVisa?: boolean;

  @ApiProperty({
    description: 'Type de document d\'identité.',
    example: 'Passport', // Example updated to string
    required: false,
  })
  @IsOptional()
  @IsString() // Changed from @IsEnum(DocumentType) to @IsString()
  typeDocument?: string; // Type changed from enum to string

  @ApiProperty({
    description: 'Numéro du document d\'identité.',
    example: 'AB1234567',
    required: false,
  })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiProperty({
    description: 'Lieu de délivrance du document d\'identité.',
    example: 'Bujumbura',
    required: false,
  })
  @IsOptional()
  @IsString()
  placeOfIssue?: string;

  @ApiPropertyOptional({ example: '2025-10-28T17:00:00Z', description: 'The end date and time of the event (ISO 8601 format).', required: false })
  @IsOptional()
  dateOfIssue?: Date;

  @ApiPropertyOptional({ example: '2025-10-28T17:00:00Z', description: 'The end date and time of the event (ISO 8601 format).', required: false })
  @IsOptional()
  expirationDate?: Date;

  @ApiProperty({
    description: 'ID de la référence de fichier pour la photo d\'identité.',
    example: 'https://example.com/thumbnails/passport_photo.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  passportPhotoId?: string;

  @ApiProperty({
    description: 'ID de la référence de fichier pour la copie du passeport/document.',
    example: 'https://minio.example.com/thumbnails/passport_copy.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  passportCopyId?: string;

  @ApiProperty({
    description: 'Motif du voyage pour la demande de visa.',
    example: 'Conference Participation',
    required: false,
  })
  @IsOptional()
  @IsString()
  purposeOfTravel?: string;

  @ApiPropertyOptional({ example: '2025-10-28T17:00:00Z', description: 'The end date and time of the event (ISO 8601 format).', required: false })
  @IsOptional()
  dateOfArrivalInBurundi?: Date;

  @ApiProperty({
    description: 'ID de la référence de fichier pour la copie du visa actuel.',
    example: 'https://minio.example.com/thumbnails/current_visa_copy.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentVisaCopyId?: string;

  @ApiProperty({
    description: 'Statut marital du participant.',
    example: 'Single',
    required: false,
  })
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiProperty({
    description: 'Prénom du père du participant.',
    example: 'Pierre',
    required: false,
  })
  @IsOptional()
  @IsString()
  fatherFirstName?: string;

  @ApiProperty({
    description: 'Nom de famille du père du participant.',
    example: 'Martin',
    required: false,
  })
  @IsOptional()
  @IsString()
  fatherLastName?: string;

  @ApiProperty({
    description: 'Prénom de la mère du participant.',
    example: 'Marie',
    required: false,
  })
  @IsOptional()
  @IsString()
  motherFirstName?: string;

  @ApiProperty({
    description: 'Nom de famille de la mère du participant.',
    example: 'Lefebvre',
    required: false,
  })
  @IsOptional()
  @IsString()
  motherLastName?: string;

  @ApiProperty({
    description: 'Province de résidence au Burundi.',
    example: 'Bujumbura Mairie',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    description: 'Commune de résidence au Burundi.',
    example: 'Ngagara',
    required: false,
  })
  @IsOptional()
  @IsString()
  commune?: string;

  @ApiProperty({
    description: 'Zone de résidence au Burundi.',
    example: 'Gihosha',
    required: false,
  })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiProperty({
    description: 'Colline de résidence au Burundi.',
    example: 'Kanyosha',
    required: false,
  })
  @IsOptional()
  @IsString()
  colline?: string;

  @ApiProperty({
    description: 'Adresse complète du participant au Burundi.',
    example: '123, Avenue de la Paix, Quartier Rohero',
    required: false,
  })
  @IsOptional()
  @IsString()
  fullAddress?: string;

  @ApiProperty({
    description: 'Nom complet de la personne à contacter en cas d\'urgence.',
    example: 'Jane Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({
    description: 'Numéro de téléphone de la personne à contacter.',
    example: '+1234567891',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiProperty({
    description: 'Prénom de la personne de référence locale.',
    example: 'Jean',
    required: false,
  })
  @IsOptional()
  @IsString()
  referencePersonFirst?: string;

  @ApiProperty({
    description: 'Nom de famille de la personne de référence locale.',
    example: 'Dupont',
    required: false,
  })
  @IsOptional()
  @IsString()
  referencePersonLast?: string;

  @ApiProperty({
    description: 'Numéro de téléphone de la personne de référence locale.',
    example: '+25779123456',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumberReference?: string;

  @ApiProperty({
    description: 'Catégorie d\'inscription du participant.',
    example: 'Student',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  

  @ApiProperty({ example: '2025-10-28T17:00:00Z', description: 'The end date and time of the event (ISO 8601 format).', required: false })
  @Transform(({ value }) => value ? new Date(value) : value)
  @IsDate()
  @IsOptional()
  registrationDate: Date;

  @ApiProperty({
    description: 'Langue préférée du participant.',
    example: 'fr',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    type: [DocumentUploadDto],
    description: 'Liste des documents téléchargés.',
    example: [
      {
        requiredDocumentId: '686256a01557fa23a04ad1fe',
        fileReferenceId: 'https://minio.example.com/thumbnails/document1.jpg',
      },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((doc: DocumentUploadDto) => doc.requiredDocumentId)
  @ValidateNested({ each: true })
  @Type(() => DocumentUploadDto)
  documents?: DocumentUploadDto[];

  @ApiProperty({
    description: 'ID du tarif attribué au participant.',
    example: '60d5ec49f8a3c5a6d8b45680',
    required: false,
  })
  @IsOptional()
  @IsString()
  assignedTariffId?: string;

  @ApiProperty({
    description: 'Prix de l\'inscription.',
    example: 50.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @ApiProperty({
    description: 'Statut du paiement de l\'inscription.',
    enum: PaymentStatus,
    example: PaymentStatus.PENDING,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}