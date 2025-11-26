import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Inject,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import { EventRegistration, EventRegistrationDocument } from './entities/event-registration.entity';

interface QrTokenPayload {
  regId: string;
}

interface QrTokenPayload {
  regId: string;
  // Add other properties from the token payload if they exist
}
import { CreateEventRegistrationDto } from './dto/create-event-registration.dto';
import { UpdateEventRegistrationDto } from './dto/update-event-registration.dto';
import { FilterEventRegistrationDto } from './dto/filter-event-registration.dto';
import { FileReference } from '../file-reference/entities/file-reference.entity';
import { FileType, MaritalStatus, PaymentStatus, RegistrationStatus, TravelPurpose } from 'src/enums';
import * as QRCode from 'qrcode';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import * as Multer from 'multer';
import { EventConfig, EventFormat, EventService } from 'src/interface/grpc-interface';
import { UserContext } from 'src/Interceptor/custom-request.interface';
import { FileReferenceService } from 'src/file-reference/file-reference.service';
import { CreateFileReferenceDto } from 'src/file-reference/dto/create-file-reference.dto';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from 'src/kafka/kafka.service';
import {
  RegistrationCreatedEvent,
  RegistrationUpdatedEvent,
  RegistrationDeletedEvent,
} from 'src/kafka/registration.events';
import { BadgeGenerateEvent, InvitationLetterGenerateEvent } from '../kafka/kafka.events';
import { CreateAttendeeDto } from 'src/attendee/dto/create-attendee.dto';
import { AttendeeService } from 'src/attendee/attendee.service';
import { EventDto } from './dto/event.dto';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class EventRegistrationService {
  // Fetch event by ID from Event microservice via gRPC
  async getEventByIdGrpc(id: string, tenantId: string): Promise<EventDto> {
    if (!this.eventService) {
      throw new InternalServerErrorException('gRPC EventService not initialized');
    }
    this.logger.log(`Making gRPC call to EventService.getEventById with eventId: ${id}, tenantId: ${tenantId}`);
    try {
      const grpcEvent = await firstValueFrom(
        this.eventService.getEventById({ eventId: id, tenantId }),
      );

      // Safely map the gRPC Event object to our EventDto
      const { format, locations, tariffRules, partners, eventSchedules, socialLinks, ...restOfEvent } = grpcEvent;

      const eventDto: EventDto = {
        ...restOfEvent,
        format: format !== undefined ? EventFormat[format] : '',
        locations: locations?.map(loc => ({ ...loc })) ?? [],
        tariffRules: tariffRules?.map(rule => ({ ...rule, conditions: rule.conditions?.map(cond => ({ ...cond })) ?? [] })) ?? [],
        partners: partners?.map(partner => ({ ...partner })) ?? [],
        eventSchedules: eventSchedules?.map(schedule => ({ ...schedule, speakers: schedule.speakers?.map(speaker => ({ ...speaker })) ?? [] })) ?? [],
        socialLinks: socialLinks?.map(link => ({ ...link })) ?? [],
        customFieldIds: grpcEvent.customFieldIds ?? [],
        requiredDocumentIds: grpcEvent.requiredDocumentIds ?? [],
      };

      return eventDto;
    } catch (error) {
      this.logger.error(`Failed to fetch event by ID from gRPC: ${error.message}`, error.stack);
      if (error.code === status.NOT_FOUND) {
        throw new NotFoundException('Event not found');
      }
      throw new InternalServerErrorException('Failed to fetch event from gRPC');
    }
  }
  async validateRegistration(
    registrationId: string,
    eventId: string,
    tenantId: string,
  ): Promise<{ isValid: boolean; message: string; status: string }> {
    this.logger.log(
      `Validating registration ${registrationId} for event ${eventId} in tenant ${tenantId}`,
    );

    if (!Types.ObjectId.isValid(registrationId) || !Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid registrationId or eventId format');
    }

    const registration = await this.eventRegistrationModel.findById(registrationId).exec();

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.tenantId.toString() !== tenantId) {
      throw new BadRequestException('Registration does not belong to this tenant');
    }

    if (registration.eventId.toString() !== eventId) {
      throw new BadRequestException('Registration is not for this event');
    }

    if (!registration.status) {
      throw new NotFoundException('Registration status is missing');
    }

    // The response must match the ValidateRegistrationResponse message in the .proto file
    const response = {
      isValid: registration.status === RegistrationStatus.CONFIRMED,
      message: `Registration status is ${registration.status}`,
      status: registration.status as string, // Cast to string to satisfy the interface
    };

    this.logger.log(
      `Validation result for registration ${registrationId}: ${JSON.stringify(response)}`,
    );

    return response;
  }

  private readonly logger = new Logger(EventRegistrationService.name);
  public eventService: EventService;

  constructor(
    @InjectModel(EventRegistration.name) private eventRegistrationModel: Model<EventRegistrationDocument>,
    @Inject('EVENT_SERVICE') private eventServiceClient: ClientGrpc,
    private readonly fileReferenceService: FileReferenceService,
    private readonly kafkaService: KafkaService,
    private readonly attendeeService: AttendeeService, // Assuming you have an AttendeeService to handle attendee logic
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  private constructImageUrl(passportPhotoId: string | undefined): string | undefined {
    if (!passportPhotoId) {
      return undefined;
    }
    const minioUrl = this.configService.get<string>('MINIO_URL');
    const bucket = this.configService.get<string>('MINIO_BUCKET_NAME');
    return `${minioUrl}/${bucket}${passportPhotoId}`;
  }

  async onModuleInit() {
    this.logger.log('EventRegistrationService initializing gRPC connection to EventService...');
    try {
      this.eventService = this.eventServiceClient.getService<EventService>('EventService');
      const metadata = new Metadata();
      metadata.add('x-temp-tenant-id', '60d5ec49f8a3c5a6d8b4567f');
      metadata.add('x-temp-user-id', '60d5ec49f8a3c5a6d8b4567e');
      const response = await firstValueFrom(this.eventService.Ping({}, metadata));
      this.logger.log(`Successfully connected to EventService via gRPC: ${response?.message || 'No message returned'}`);
    } catch (error) {
      this.logger.error(`Failed to connect to EventService via gRPC: ${error.message}`, error.stack);
      throw new InternalServerErrorException('gRPC connection to EventService failed');
    }
  }

  async getEventConfig(tenantId: string, eventId: string): Promise<EventConfig> {
    this.logger.log(`Fetching event config for tenantId: ${tenantId}, eventId: ${eventId}`);
    if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(eventId)) {
      throw new BadRequestException('Invalid tenantId or eventId format');
    }
    try {
      const metadata = new Metadata();
      metadata.add('x-temp-tenant-id', tenantId);
      metadata.add('x-temp-user-id', '60d5ec49f8a3c5a6d8b4567e');
      const config = await firstValueFrom(this.eventService.GetEventConfig({ tenantId, eventId }, metadata));
      return config;
    } catch (error) {
      this.logger.error(`Failed to fetch event config: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch event config: ${error.message}`);
    }
  }

  async generateAndStoreQrCode(eventId: string, tenantId: string, registrationId: string, session: ClientSession): Promise<Types.ObjectId> {
    this.logger.log(`Generating QR code for eventId: ${eventId}, registrationId: ${registrationId}`);
    try {
      // 1. Generate QR Code Data
      const qrCodeData = JSON.stringify({ eventId, registrationId, timestamp: Date.now() });
      const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, { width: 300 });
      const qrCodeFile: any = { // Using `any` or `Express.Multer.File` if you have types setup
        fieldname: 'qrcode',
        originalname: `qr-${registrationId}-${Date.now()}.png`,
        encoding: '7bit',
        mimetype: FileType.PNG, // Ensure FileType.PNG is correctly defined/imported
        size: qrCodeBuffer.length,
        buffer: qrCodeBuffer,
        destination: '', 
        filename: '',   
        path: '',        
        stream: null,    
      };

      // 3. Prepare DTO for creating FileReference in the database
      const createFileReferenceDto: CreateFileReferenceDto = {
        label: `QR Code for Event ${eventId} - Registration ${registrationId}`,
        fileType: FileType.PNG,
      };

      const fileRef = await this.fileReferenceService.uploadAndCreate(
        new Types.ObjectId(tenantId),
        new Types.ObjectId(registrationId), // Assuming registrationId is the 'uploadedBy' user
        qrCodeFile,
        createFileReferenceDto,
        session,
      );
      return (fileRef as FileReference & { _id: Types.ObjectId })._id;
    } catch (error) {
      this.logger.error(`Failed to generate/store QR code: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate or store QR code');
    }
  }

  private _validatePayload(dto: CreateEventRegistrationDto) {
    this.logger.log('Performing custom validation for registration payload.');

    if (dto.needsVisa) {
      this.logger.debug('Participant needs a visa, checking required document fields.');
      const requiredFields = [
        'documentNumber',
        'passportPhotoId',
        'passportCopyId',
        'nationality',
        'countryOfBirth',
        'dateOfIssue',
        'expirationDate',
      ];

      const missingFields = requiredFields.filter(field => !dto[field]);

      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields for participant needing a visa: ${missingFields.join(', ')}`;
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }
      this.logger.debug('All required fields for visa application are present.');
    }
  }

  async createRegistration(
    dto: CreateEventRegistrationDto,
    requestUser: UserContext,
  ): Promise<{ registration: EventRegistrationDocument; message: string }> {
    const { tenantId, userId } = requestUser;
    this.logger.log(`[START] Create registration for userId: ${userId}, eventId: ${dto.eventId}, tenant: ${tenantId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Step 1: Custom validation
      this._validatePayload(dto);

      if (!Types.ObjectId.isValid(tenantId) || !Types.ObjectId.isValid(dto.eventId)) {
        this.logger.error(`Invalid tenantId or eventId format. TenantId: ${tenantId}, EventId: ${dto.eventId}`);
        throw new BadRequestException('Invalid tenantId or eventId format');
      }

      // Step 1a: Check for existing registration with the same email for the same event
      this.logger.debug(`Checking for existing registration with email: ${dto.email} for event: ${dto.eventId}`);
      const existingRegistration = await this.eventRegistrationModel.findOne({
        tenantId,
        eventId: dto.eventId,
        email: dto.email,
      }).session(session).exec();

      if (existingRegistration) {
        const errorMsg = `A registration with the email "${dto.email}" already exists for this event.`;
        this.logger.error(errorMsg);
        throw new ConflictException(errorMsg);
      }
      this.logger.debug('No existing registration found for this email. Proceeding.');

      // Step 2: Fetch event configuration
      this.logger.debug('Fetching event configuration...');
      const config = await firstValueFrom(this.eventService.GetEventConfig({ tenantId, eventId: dto.eventId.toString() }));
      this.logger.debug(`Event config fetched successfully for eventId: ${dto.eventId}`);

      this.logger.debug('Fetching event details...');
      const event = await firstValueFrom(this.eventService.getEventById({ tenantId, eventId: dto.eventId.toString() }));
      this.logger.debug(`Event details fetched successfully: ${event.title}`);

      // Step 3: Validate required documents
      this.logger.debug('Validating required documents...');
      const requiredDocs = config.requiredDocuments?.map(rd => rd.id.toString());
      const providedDocs = (dto.documents || []).map(doc => doc.requiredDocumentId);
      const missingDocs = requiredDocs?.filter(id => !providedDocs.includes(id));
      if (missingDocs?.length > 0) {
        const errorMsg = `Missing required documents: ${missingDocs.join(', ')}`;
        this.logger.error(errorMsg);
        throw new BadRequestException(errorMsg);
      }
      this.logger.debug('Required documents validation passed.');

      // Step 4: Create or update attendee record within the transaction
      this.logger.debug('Creating or updating attendee record...');
      const createAttendeeDto: CreateAttendeeDto = {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        imageUrl: dto.passportPhotoId,
      };
      this.logger.debug(`Calling AttendeeService with DTO: ${JSON.stringify(createAttendeeDto)}`);

      await this.attendeeService.createOrUpdateFromRegistration(
        new Types.ObjectId(tenantId),
        createAttendeeDto,
        session,
      );
      this.logger.log(`Attendee created or updated for userId: ${userId}, tenant: ${tenantId}`);

      // Step 5: Determine active tariff
      this.logger.debug('Determining active tariff...');
      const now = new Date();
      const activeTariff = config.tariffRules.find(tr => {
        const start = new Date(tr.validFrom || 0);
        const end = new Date(tr.validUntil);
        return start <= now && end >= now;
      });

      let assignedTariffId: string | null = null;
      let price: number = 0;

      if (activeTariff) {
        assignedTariffId = activeTariff.id;
        price = activeTariff.amount;
        this.logger.debug(`Active tariff found: ${assignedTariffId} with price ${price}`);
      } else if (config.tariffRules.length > 0) {
        const defaultTariff = config.tariffRules[0];
        assignedTariffId = defaultTariff.id;
        price = defaultTariff.amount;
        this.logger.warn(`No active tariff found. Using default tariff: ${defaultTariff.id}.`);
      } else {
        this.logger.warn(`No tariff rules found for event ${dto.eventId}. Price set to 0.`);
      }

      // Step 6: Generate Registration ID and QR Code
      this.logger.debug('Generating registration ID and QR code...');
      const registrationId = new Types.ObjectId();
      const qrCodeFileId = await this.generateAndStoreQrCode(
        dto.eventId.toString(),
        tenantId,
        registrationId.toString(),
        session,
      );
      this.logger.debug(`QR code generated and stored with file ID: ${qrCodeFileId}`);

      // Step 7: Prepare and save registration data
      this.logger.debug('Preparing registration data for database insertion...');
      const registrationData = {
        _id: registrationId,
        tenantId,
        eventId: dto.eventId,
        userId,
        qrCodeFileId, // Add the generated QR code file ID
        owner: dto.owner, // Added 'owner' field
        status: dto.status ?? RegistrationStatus.PENDING_PAYMENT, // Use dto.status if provided, otherwise default
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        sexe: dto.sexe,
        dateOfBirth: dto.dateOfBirth,
        yearOfBirth: dto.yearOfBirth,
        birthPlace: dto.birthPlace,
        countryOfBirth: dto.countryOfBirth,
        nationality: dto.nationality,
        profession: dto.profession,
        professionDocId: dto.professionDocId,
        organization: dto.organization,
        institution: dto.institution,
        specialRequirements: dto.specialRequirements,
        terms: dto.terms,
        housingMode: dto.housingMode,
        accommodationType: dto.accommodationType,
        isForeigner: dto.isForeigner,
        needsVisa: dto.needsVisa,
        typeDocument: dto.typeDocument,
        documentNumber: dto.documentNumber,
        placeOfIssue: dto.placeOfIssue,
        dateOfIssue: dto.dateOfIssue,
        expirationDate: dto.expirationDate,
        passportPhotoId: dto.passportPhotoId,
        passportCopyId: dto.passportCopyId,
        purposeOfTravel: dto.purposeOfTravel,
        dateOfArrivalInBurundi: dto.dateOfArrivalInBurundi,
        currentVisaCopyId: dto.currentVisaCopyId,
        maritalStatus: dto.maritalStatus,
        fatherFirstName: dto.fatherFirstName,
        fatherLastName: dto.fatherLastName,
        motherFirstName: dto.motherFirstName,
        motherLastName: dto.motherLastName,
        province: dto.province,
        commune: dto.commune,
        zone: dto.zone,
        colline: dto.colline,
        fullAddress: dto.fullAddress,
        contactPerson: dto.contactPerson, // Flattened
        contactNumber: dto.contactNumber, // Added flattened field
        referencePersonFirst: dto.referencePersonFirst, // Added flattened field
        referencePersonLast: dto.referencePersonLast, // Added flattened field
        phoneNumberReference: dto.phoneNumberReference, // Added flattened field
        category: dto.category, // Added 'category' field
        registrationDate: new Date(),
        language: dto.language,
        documents: dto.documents,
        assignedTariffId: dto.assignedTariffId ?? assignedTariffId, // Use dto.assignedTariffId if available
        price: dto.price ?? price, // Use dto.price if available
        paymentStatus: dto.paymentStatus ?? PaymentStatus.PENDING, // Use dto.paymentStatus if available, otherwise default
      };

      const newRegistration = new this.eventRegistrationModel(registrationData);
      let savedRegistration: EventRegistrationDocument;

      this.logger.debug('Saving new registration to the database...');
      savedRegistration = await newRegistration.save({ session });
      this.logger.debug(`Registration data saved to database with id: ${savedRegistration._id}`);

      if (!savedRegistration) {
        this.logger.error('Failed to save registration to database.');
        throw new InternalServerErrorException('Failed to create registration');
      }

      await session.commitTransaction();
      this.logger.log(`[SUCCESS] Database transaction committed for registration ID: ${savedRegistration._id}`);

      // --- Post-Transaction Events ---
      // Now that the registration is confirmed in the DB, we can safely trigger async processes.

      // 1. Emit the general 'registration.created' event
      const createdEvent: RegistrationCreatedEvent = {
        registrationId: (savedRegistration._id as Types.ObjectId).toString(),
        eventId: savedRegistration.eventId.toString(),
        userId: savedRegistration.userId.toString(),
        tenantId: savedRegistration.tenantId.toString(),
        timestamp: new Date().toISOString(),
        owner: savedRegistration.owner,
        firstName: savedRegistration.firstName,
        lastName: savedRegistration.lastName,
        email: savedRegistration.email,
        phone: savedRegistration.phone,
        sexe: savedRegistration.sexe,
        dateOfBirth: savedRegistration.dateOfBirth?.toISOString(),
        yearOfBirth: savedRegistration.yearOfBirth?.toString(),
        birthPlace: savedRegistration.birthPlace,
        countryOfBirth: savedRegistration.countryOfBirth,
        nationality: savedRegistration.nationality,
        profession: savedRegistration.profession,
        professionDocId: savedRegistration.professionDocId,
        organization: savedRegistration.organization,
        institution: savedRegistration.institution,
        specialRequirements: savedRegistration.specialRequirements,
        terms: savedRegistration.terms,
        housingMode: savedRegistration.housingMode,
        accommodationType: savedRegistration.accommodationType,
        isForeigner: savedRegistration.isForeigner,
        needsVisa: savedRegistration.needsVisa,
        typeDocument: savedRegistration.typeDocument,
        documentNumber: savedRegistration.documentNumber,
        placeOfIssue: savedRegistration.placeOfIssue,
        dateOfIssue: savedRegistration.dateOfIssue?.toISOString(),
        expirationDate: savedRegistration.expirationDate?.toISOString(),
        passportPhotoId: savedRegistration.passportPhotoId,
        passportCopyId: savedRegistration.passportCopyId,
        purposeOfTravel: savedRegistration.purposeOfTravel,
        dateOfArrivalInBurundi: savedRegistration.dateOfArrivalInBurundi?.toISOString(),
        currentVisaCopyId: savedRegistration.currentVisaCopyId,
        maritalStatus: savedRegistration.maritalStatus,
        fatherFirstName: savedRegistration.fatherFirstName,
        fatherLastName: savedRegistration.fatherLastName,
        motherFirstName: savedRegistration.motherFirstName,
        motherLastName: savedRegistration.motherLastName,
        province: savedRegistration.province,
        commune: savedRegistration.commune,
        zone: savedRegistration.zone,
        colline: savedRegistration.colline,
        fullAddress: savedRegistration.fullAddress,
        contactPerson: savedRegistration.contactPerson,
        contactNumber: savedRegistration.contactNumber,
        referencePersonFirst: savedRegistration.referencePersonFirst,
        referencePersonLast: savedRegistration.referencePersonLast,
        phoneNumberReference: savedRegistration.phoneNumberReference,
        category: savedRegistration.category,
        qrCodeFileId: (savedRegistration.qrCodeFileId as Types.ObjectId).toString(),
        registrationDate: savedRegistration.registrationDate.toISOString(),
        language: savedRegistration.language,
        documents: savedRegistration.documents, // Already correct type
        assignedTariffId: savedRegistration.assignedTariffId,
        price: savedRegistration.price,
        paymentStatus: savedRegistration.paymentStatus,
        status: savedRegistration.status,
      };
      await this.kafkaService.produce('registration.created', createdEvent);
      this.logger.log(`Published 'registration.created' event for registrationId: ${savedRegistration._id}`);

      // 2. Emit the specific 'badge.generate' event for our new worker
      // Fetch event details to include in the badge
      const eventDetails = await this.getEventByIdGrpc(dto.eventId.toString(), tenantId);

      const badgeEvent: BadgeGenerateEvent = {
        registrationId: registrationId.toString(),
        attendeeEmail: dto.email, // Use email from the registration DTO
        attendeeFullName: `${dto.firstName} ${dto.lastName}`,
        tenantId,
        eventDetails: {
          title: eventDetails.title,
          type: eventDetails.type,
          startDate: eventDetails.startDate,
          endDate: eventDetails.endDate,
          adresse: eventDetails.adresse,
          format: eventDetails.format,
          locations: eventDetails.locations,
          avenue: eventDetails.avenue,
        },
      };
      await this.kafkaService.produce('badge.generate', badgeEvent);
      this.logger.log(`Published 'badge.generate' event for registrationId: ${savedRegistration._id}`);

      // 3. Conditionally emit the 'invitation.letter.generate' event
      if (savedRegistration.isForeigner && savedRegistration.needsVisa) {
        this.logger.log(`Foreigner requiring visa detected. Publishing 'invitation.letter.generate' event for registrationId: ${savedRegistration._id}`);
        const invitationEvent: InvitationLetterGenerateEvent = {
          registrationId: (savedRegistration._id as Types.ObjectId).toString(),
          tenantId: savedRegistration.tenantId.toString(),
          eventId: savedRegistration.eventId.toString(),
          email: savedRegistration.email,
        };
        await this.kafkaService.produce('invitation.letter.generate', invitationEvent);
        this.logger.log(`Published 'invitation.letter.generate' event for registrationId: ${savedRegistration._id}`);
      }

      return {
        registration: savedRegistration,
        message: 'Registration successful. The badge will be sent to your email shortly.',
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Transaction aborted for registration attempt. Error: ${error.message}`, error.stack);
      throw error; // Re-throw the original error to be handled by NestJS
    } finally {
      session.endSession();
      this.logger.log('Transaction session ended.');
    }
  }

  async findRegistrationById(
    id: string,
  ): Promise<{ _id: string; eventId: string; tenantId: string }> {
    this.logger.log(`Finding registration by id: ${id}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid registration ID format');
    }

    const registration = await this.eventRegistrationModel
      .findById(id)
      .select('_id eventId tenantId')
      .lean()
      .exec();

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    return {
      _id: registration._id.toString(),
      eventId: registration.eventId.toString(),
      tenantId: registration.tenantId.toString(),
    };
  }

  async getRegistrationById(id: string, tenantId?: string): Promise<EventRegistrationDocument> {
    this.logger.log(`Finding registration by ID: ${id}${tenantId ? ` for tenant ${tenantId}` : ''}`);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid registration ID format');
    }

    const query: any = { _id: id };
    if (tenantId) {
      // tenantId is optional, but if provided, it must be valid
      if (!Types.ObjectId.isValid(tenantId)) {
        throw new BadRequestException('Invalid tenantId format');
      }
      query.tenantId = tenantId;
    }

    const registration = await this.eventRegistrationModel.findOne(query).exec();

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    registration.imageUrl = this.constructImageUrl(registration.passportPhotoId);

    return registration;
  }

  async updateRegistration(id: string, updateDto: UpdateEventRegistrationDto, tenantId: string): Promise<EventRegistrationDocument> {
    this.logger.log(`Updating registration with ID: ${id} for tenant: ${tenantId}`);
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid id or tenantId format');
    }

    const updateFields: any = { ...updateDto };
    if (updateDto.documents) {
      updateFields.documents = updateDto.documents.map(doc => ({
        requiredDocumentId: doc.requiredDocumentId,
        fileReferenceId: doc.fileReferenceId,
      }));
    }

    const updatedRegistration = await this.eventRegistrationModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: updateFields }, { new: true })
      .exec();

    if (!updatedRegistration) {
      throw new NotFoundException(`Registration not found for id: ${id}`);
    }

    const event: RegistrationUpdatedEvent = {
      registrationId: (updatedRegistration._id as Types.ObjectId).toString(),
      eventId: updatedRegistration.eventId.toString(),
      userId: updatedRegistration.userId.toString(),
      tenantId: updatedRegistration.tenantId.toString(),
      timestamp: new Date().toISOString(),
      updatedFields: {
        ...updateDto, // Spread the DTO which already contains most fields

        // Directly assign owner and category as they are top-level string fields
        owner: updateDto.owner,
        category: updateDto.category,

        // Convert Date objects to ISO strings
        dateOfBirth: updateDto.dateOfBirth instanceof Date ? updateDto.dateOfBirth.toISOString() : updateDto.dateOfBirth,
        dateOfIssue: updateDto.dateOfIssue instanceof Date ? updateDto.dateOfIssue.toISOString() : updateDto.dateOfIssue,
        expirationDate: updateDto.expirationDate instanceof Date ? updateDto.expirationDate.toISOString() : updateDto.expirationDate,
        dateOfArrivalInBurundi: updateDto.dateOfArrivalInBurundi instanceof Date ? updateDto.dateOfArrivalInBurundi.toISOString() : updateDto.dateOfArrivalInBurundi,
        registrationDate: updateDto.registrationDate instanceof Date
          ? updateDto.registrationDate.toISOString()
          : (typeof updateDto.registrationDate === 'string' ? updateDto.registrationDate : undefined),

        // Convert Types.ObjectId to string
        professionDocId: updateDto.professionDocId?.toString(),
        passportPhotoId: updateDto.passportPhotoId?.toString(),
        passportCopyId: updateDto.passportCopyId?.toString(),
        currentVisaCopyId: updateDto.currentVisaCopyId?.toString(),

        // Handle documents array
        documents: updateDto.documents?.map(doc => ({
          requiredDocumentId: doc.requiredDocumentId,
          fileReferenceId: doc.fileReferenceId.toString(), // Ensure fileReferenceId is string
        })),

        // Ensure flattened contact/reference person fields are passed directly
        contactPerson: updateDto.contactPerson,
        contactNumber: updateDto.contactNumber,
        referencePersonFirst: updateDto.referencePersonFirst,
        referencePersonLast: updateDto.referencePersonLast,
        phoneNumberReference: updateDto.phoneNumberReference,

        // These fields are now strings, so no special casting needed beyond what `...updateDto` handles
        sexe: updateDto.sexe,
        housingMode: updateDto.housingMode,
        typeDocument: updateDto.typeDocument,
        purposeOfTravel: updateDto.purposeOfTravel,
        maritalStatus: updateDto.maritalStatus,
        yearOfBirth: updateDto.yearOfBirth,
      },
    };

    await this.kafkaService.produce('registration.updated', event);
    this.logger.log(`Updated registration with ID: ${id}`);
    return updatedRegistration;
  }

  async deleteRegistration(id: string, tenantId: string): Promise<void> {
    this.logger.log(`Deleting registration with ID: ${id} for tenant: ${tenantId}`);
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid id or tenantId format');
    }
    const result = await this.eventRegistrationModel.findOneAndDelete({ _id: id, tenantId }).exec();
    if (!result) {
      throw new NotFoundException(`Registration not found for id: ${id}`);
    }

    const event: RegistrationDeletedEvent = {
      registrationId: id,
      eventId: result.eventId.toString(),
      userId: result.userId.toString(),
      tenantId: result.tenantId.toString(),
      timestamp: new Date().toISOString(),
    };
    await this.kafkaService.produce('registration.deleted', event);
    this.logger.log(`Deleted registration with ID: ${id}`);
  }

  async findAll(
    tenantId: string,
    filterDto: FilterEventRegistrationDto,
  ): Promise<{ eventRegistrations: EventRegistration[]; total: number; page: number; limit: number }> {
    this.logger.log(`Finding all registrations for tenant: ${tenantId}`);
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid tenantId format');
    }
    const { eventId, userId, status, paymentStatus, page = 1, limit = 10 } = filterDto;

    const filter: any = { tenantId };
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;
    const [eventRegistrations, total] = await Promise.all([
      this.eventRegistrationModel.find(filter).skip(skip).limit(limit).exec(),
      this.eventRegistrationModel.countDocuments(filter).exec(),
    ]);

    return { eventRegistrations, total, page, limit };
  }

  async updatePaymentStatus(registrationId: string, tenantId: string, paymentStatus: PaymentStatus): Promise<EventRegistration> {
    this.logger.log(`Updating paymentStatus for registrationId: ${registrationId} to ${paymentStatus}`);
    if (!Types.ObjectId.isValid(registrationId) || !Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid registrationId or tenantId format');
    }
    const updated = await this.eventRegistrationModel.findOneAndUpdate(
      { _id: registrationId, tenantId },
      { paymentStatus },
      { new: true }
    ).exec();
    if (!updated) {
      throw new NotFoundException('Registration not found');
    }

    const event: RegistrationUpdatedEvent = {
      registrationId: (updated._id as Types.ObjectId).toString(),
      eventId: updated.eventId.toString(),
      userId: updated.userId.toString(),
      tenantId: updated.tenantId.toString(),
      timestamp: new Date().toISOString(),
      updatedFields: { paymentStatus },
    };
    await this.kafkaService.produce('registration.updated', event);
    return updated;
  }

  async findByEventId(
    eventId: string,
    tenantId: string,
    page = 1,
    limit = 10,
  ): Promise<{ eventRegistrations: EventRegistration[]; total: number; page: number; limit: number }> {
    this.logger.log(`Finding registrations by eventId: ${eventId}, tenantId: ${tenantId}`);
    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid eventId or tenantId format');
    }
    const filter = { eventId, tenantId };
    const skip = (page - 1) * limit;
    const [eventRegistrations, total] = await Promise.all([
      this.eventRegistrationModel.find(filter).skip(skip).limit(limit).exec(),
      this.eventRegistrationModel.countDocuments(filter).exec(),
    ]);
    return { eventRegistrations, total, page, limit };
  }

  async getEventByUserId(
    userId: string,
    tenantId: string,
    page = 1,
    limit = 10,
  ): Promise<{ eventRegistrations: EventRegistration[]; total: number; page: number; limit: number }> {
    this.logger.log(`Finding registrations by userId: ${userId}, tenantId: ${tenantId}`);
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('Invalid userId or tenantId format');
    }
    const filter = { userId, tenantId };
    const skip = (page - 1) * limit;
    const [eventRegistrations, total] = await Promise.all([
      this.eventRegistrationModel.find(filter).skip(skip).limit(limit).exec(),
      this.eventRegistrationModel.countDocuments(filter).exec(),
    ]);
    return { eventRegistrations, total, page, limit };
  }

  async markQrAsValidated(registrationId: string): Promise<EventRegistrationDocument> {
    this.logger.log(`Marking QR as validated for registrationId: ${registrationId}`);
    const registration = await this.getRegistrationById(registrationId);

    // This check is slightly redundant given the controller's check, but it ensures service-level integrity.
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${registrationId} not found.`);
    }

    registration.qrValidated = true;
    registration.lastValidationAt = new Date();
    const updatedRegistration = await registration.save();
    this.logger.log(`Successfully marked QR as validated for registrationId: ${registrationId}`);
    return updatedRegistration;
  }

  async updateBadgeStatus(registrationId: string, badgeUrl: string): Promise<EventRegistrationDocument> {
    this.logger.log(`Updating badge status for registrationId: ${registrationId}`);
    const registration = await this.getRegistrationById(registrationId);

    if (!registration) {
      throw new NotFoundException(`Registration with ID ${registrationId} not found.`);
    }

    registration.badgeUrl = badgeUrl;
    registration.badgeGenerated = true;

    const updatedRegistration = await registration.save();
    this.logger.log(`Successfully updated badge status for registrationId: ${registrationId}`);
    return updatedRegistration;
  }

  async getEventByRegistration(
    registrationId: string,
    user: UserContext,
  ): Promise<EventDto> {
    this.logger.log(
      `Getting event for registration ID: ${registrationId} for user ${user?.userId}`,
    );

    const registration = await this.findRegistrationById(registrationId);
    if (!registration) {
      throw new NotFoundException(
        `Registration with ID "${registrationId}" not found.`,
      );
    }

    const tenantId = user?.tenantId || registration.tenantId;
    if (!tenantId) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'Tenant ID is missing.',
      });
    }

    // Use the eventId from the registration document for the gRPC call
    return this.getEventByIdGrpc(registration.eventId, tenantId);
  }

  async findRegistrationDetailsById(
    registrationId: string,
    tenantId: string,
  ): Promise<EventRegistrationDocument | null> {
    this.logger.log(
      `Finding registration details for registrationId: ${registrationId} and tenantId: ${tenantId}`,
    );
    return this.eventRegistrationModel.findOne({ _id: registrationId, tenantId }).exec();
  }

  async handleQrScan(token: string): Promise<string> {
    this.logger.log(`Handling QR scan with token`);

    const qrJwtSecret = this.configService.get<string>('QR_JWT_SECRET');
    if (!qrJwtSecret) {
      this.logger.error('QR_JWT_SECRET is not defined in environment variables');
      throw new InternalServerErrorException('Server configuration error: JWT secret is missing.');
    }

    let decoded: QrTokenPayload;
    try {
      decoded = jwt.verify(token, qrJwtSecret) as QrTokenPayload;
    } catch (error) {
      this.logger.error(`Invalid QR token: ${error.message}`);
      throw new BadRequestException('Invalid or expired QR code.');
    }

    if (!decoded.regId) {
      this.logger.error('Token payload missing registrationId');
      throw new BadRequestException('Invalid token payload.');
    }

    const registration = await this.getRegistrationById(decoded.regId);

    // Construct the redirect URL for the Expo app
    const expoAppUrl = this.configService.get<string>('EXPO_APP_URL');
    if (!expoAppUrl) {
        this.logger.error('EXPO_APP_URL is not defined in environment variables');
        throw new InternalServerErrorException('Server configuration error: Expo App URL is missing.');
    }

    const redirectUrl = `${expoAppUrl}?eventId=${registration.eventId.toString()}&registrationId=${registration._id.toString()}`;

    this.logger.log(`Redirecting to: ${redirectUrl}`);
    return redirectUrl;




  }
}