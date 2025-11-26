import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsBoolean, IsDate, IsMongoId } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  RegistrationStatus,
  PaymentStatus,
  Sexe,
  HousingMode,
  DocumentType,
  // Removed TravelPurpose, MaritalStatus as they are now strings in the schema
  // Removed RegistrationCategory as it's now a string in the schema
} from 'src/enums'; // Ensure you import only necessary enums
import { Types } from 'mongoose';

export class FilterEventRegistrationDto {
  @ApiProperty({
    description: 'Optionnel : Filtrer par ID de l\'événement.',
    required: false,
  })
  @IsOptional()
   @IsString()
  eventId?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par ID de l\'utilisateur.',
    required: false,
  })
  @IsOptional()
   @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par statut de l\'inscription.',
    enum: RegistrationStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(RegistrationStatus)
  status?: RegistrationStatus;

  @ApiProperty({
    description: 'Optionnel : Filtrer par statut de paiement.',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    description: 'Optionnel : Filtrer par prénom du participant (recherche partielle, insensible à la casse).',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par nom de famille du participant (recherche partielle, insensible à la casse).',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par adresse e-mail du participant (recherche partielle, insensible à la casse).',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par sexe du participant.',
    enum: Sexe,
    required: false,
  })
  @IsOptional()
  @IsEnum(Sexe)
  sexe?: Sexe;

  @ApiProperty({
    description: 'Optionnel : Filtrer par nationalité du participant (recherche partielle, insensible à la casse).',
    required: false,
  })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par organisation du participant (recherche partielle, insensible à la casse).',
    required: false,
  })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiProperty({
    description: 'Optionnel : Filtrer par mode d\'hébergement.',
    enum: HousingMode,
    required: false,
  })
  @IsOptional()
  @IsEnum(HousingMode)
  housingMode?: HousingMode;

  @ApiProperty({
    description: 'Optionnel : Filtrer par catégorie d\'inscription.',
    required: false,
  })
  @IsOptional()
  @IsString() // Changed from IsEnum(RegistrationCategory) to IsString()
  category?: string; // Type changed from enum to string

  @ApiProperty({
    description: 'Optionnel : Filtrer les inscriptions d\'étrangers (true/false).',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isForeigner?: boolean;

  @ApiProperty({
    description: 'Optionnel : Filtrer les inscriptions nécessitant un visa (true/false).',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  needsVisa?: boolean;

  @ApiProperty({
    description: 'Optionnel : Filtrer les inscriptions créées à partir de cette date (format ISO 8601).',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => value ? new Date(value) : value)
  registrationDateFrom?: Date;

  @ApiProperty({
    description: 'Optionnel : Filtrer les inscriptions créées jusqu\'à cette date (format ISO 8601).',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => value ? new Date(value) : value)
  registrationDateTo?: Date;

  @ApiProperty({
    description: 'Effectuer une recherche textuelle générale sur plusieurs champs (prénom, nom, email, organisation, profession, adresse, personne de contact, personne de référence, etc.).',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Numéro de la page pour la pagination.',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Nombre d\'éléments par page.',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;


}