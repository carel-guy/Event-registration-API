// src/attendee/attendee.service.ts
import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { FilterAttendeeDto } from './dto/filter-attendee.dto';
import { Attendee, AttendeeDocument } from './entities/attendee.entity';
import { GetAttendeeEventsDto } from './dto/get-attendee-events.dto';
import { ClientGrpc } from '@nestjs/microservices';
import { EventConfig, EventService } from 'src/interface/grpc-interface';
import { EventRegistration } from 'src/event-registration/entities/event-registration.entity';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AttendeeService implements OnModuleInit {
  private readonly logger = new Logger(AttendeeService.name);
  public eventService: EventService;

  constructor(
    @InjectModel(Attendee.name) private attendeeModel: Model<AttendeeDocument>,
    @Inject('EVENT_SERVICE') private eventServiceClient: ClientGrpc,
    @InjectModel(EventRegistration.name) private eventRegistrationModel: Model<EventRegistration>,
  ) {}

  onModuleInit() {
    this.eventService = this.eventServiceClient.getService<EventService>('EventService');
  }

  async create(tenantId: Types.ObjectId, createAttendeeDto: CreateAttendeeDto): Promise<AttendeeDocument> {
    this.logger.log(`Attempting to create or find attendee for tenant ${tenantId.toHexString()}: ${JSON.stringify(createAttendeeDto)}`);
    try {
      // Find an existing attendee by userId or email
      const existingAttendee = await this.attendeeModel.findOne({
        tenantId,
        $or: [{ userId: createAttendeeDto.userId }, { email: createAttendeeDto.email }],
      }).exec();

      if (existingAttendee) {
        this.logger.log(`Found existing attendee with ID: ${existingAttendee._id}. Returning existing record.`);
        return existingAttendee;
      }

      // If no attendee exists, create a new one
      this.logger.log('No existing attendee found. Creating a new one.');
      const createdAttendee = new this.attendeeModel({ ...createAttendeeDto, tenantId });
      return await createdAttendee.save();
    } catch (error) {
      this.logger.error(`Failed to create or find attendee for tenant ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create or find attendee.');
    }
  }

  async findAll(tenantId: Types.ObjectId, filterDto: FilterAttendeeDto): Promise<{ attendees: AttendeeDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    this.logger.log(`Fetching all attendees for tenant ${tenantId.toHexString()} with filters: ${JSON.stringify(filterDto)}`);

    const { firstName, lastName, email, userId, page = 1, limit = 10 } = filterDto;

    const query: any = { tenantId };

    if (firstName) {
      query.firstName = { $regex: firstName, $options: 'i' };
    }
    if (lastName) {
      query.lastName = { $regex: lastName, $options: 'i' };
    }
    if (email) {
      query.email = { $regex: email, $options: 'i' };
    }
    if (userId) {
      query.userId = userId;
    }

    try {
      const total = await this.attendeeModel.countDocuments(query).exec();
      const totalPages = Math.ceil(total / limit) || 1;

      const attendees = await this.attendeeModel
        .find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      this.logger.log(`Found ${attendees.length} attendees (total: ${total}, page: ${page}/${totalPages}) for tenant ${tenantId.toHexString()}`);

      return { attendees, total, page, limit, totalPages };
    } catch (error) {
      this.logger.error(`Failed to fetch attendees for tenant ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve attendees.');
    }
  }

  async findOne(tenantId: Types.ObjectId, id: Types.ObjectId): Promise<AttendeeDocument> {
    this.logger.log(`Finding attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()}`);
    try {
      const attendee = await this.attendeeModel.findOne({ _id: id, tenantId }).exec();
      if (!attendee) {
        throw new NotFoundException(`Attendee with ID "${id.toHexString()}" not found for tenant "${tenantId.toHexString()}".`);
      }
      return attendee;
    } catch (error) {
      this.logger.error(`Failed to find attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to retrieve attendee with ID "${id.toHexString()}" for tenant "${tenantId.toHexString()}".`);
    }
  }

  async update(tenantId: Types.ObjectId, id: Types.ObjectId, updateAttendeeDto: UpdateAttendeeDto): Promise<AttendeeDocument> {
    this.logger.log(`Updating attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()} with data: ${JSON.stringify(updateAttendeeDto)}`);
    try {
      if (updateAttendeeDto.userId) {
        const existingByUserId = await this.attendeeModel.findOne({
          tenantId,
          userId: updateAttendeeDto.userId,
          _id: { $ne: id },
        }).exec();
        if (existingByUserId) {
          throw new ConflictException(`Attendee with userId "${updateAttendeeDto.userId}" already exists for tenant "${tenantId.toHexString()}".`);
        }
      }

      if (updateAttendeeDto.email) {
        const existingByEmail = await this.attendeeModel.findOne({
          tenantId,
          email: updateAttendeeDto.email,
          _id: { $ne: id },
        }).exec();
        if (existingByEmail) {
          throw new ConflictException(`Attendee with email "${updateAttendeeDto.email}" already exists for tenant "${tenantId.toHexString()}".`);
        }
      }

      const updatedAttendee = await this.attendeeModel
        .findOneAndUpdate({ _id: id, tenantId }, { $set: updateAttendeeDto }, { new: true })
        .exec();

      if (!updatedAttendee) {
        throw new NotFoundException(`Attendee with ID "${id.toHexString()}" not found for tenant "${tenantId.toHexString()}".`);
      }
      return updatedAttendee;
    } catch (error) {
      this.logger.error(`Failed to update attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to update attendee with ID "${id.toHexString()}" for tenant "${tenantId.toHexString()}".`);
    }
  }

  async remove(tenantId: Types.ObjectId, id: Types.ObjectId): Promise<void> {
    this.logger.log(`Removing attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()}`);
    try {
      const deletedResult = await this.attendeeModel.findOneAndDelete({ _id: id, tenantId }).exec();
      if (!deletedResult) {
        throw new NotFoundException(`Attendee with ID "${id.toHexString()}" not found for tenant "${tenantId.toHexString()}".`);
      }
    } catch (error) {
      this.logger.error(`Failed to remove attendee with ID: ${id.toHexString()} for tenant ${tenantId.toHexString()}. Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Failed to remove attendee with ID "${id.toHexString()}" for tenant "${tenantId.toHexString()}".`);
    }
  }

  async getEventsForUser(tenantId: Types.ObjectId, dto: GetAttendeeEventsDto): Promise<EventConfig[]> {
  const { userId } = dto;
  const tenantIdStr = tenantId.toHexString();
  this.logger.log(`Starting to fetch events for user ${userId} in tenant ${tenantIdStr}`);

  try {
    // Step 1: Retrieve event registrations for the user
    this.logger.log(`Querying event registrations for tenantId: ${tenantIdStr}, userId: ${userId}`);
    const registrations = await this.eventRegistrationModel
      .find({ tenantId, userId })
      .select('eventId')
      .exec();

    this.logger.log(`Found ${registrations.length} event registrations for user ${userId} in tenant ${tenantIdStr}`);

    if (registrations.length === 0) {
      this.logger.warn(`No event registrations found for user ${userId} in tenant ${tenantIdStr}`);
      return [];
    }

    // Step 2: Extract event IDs
    const eventIds = registrations.map(reg => reg.eventId.toString());
    this.logger.log(`Extracted event IDs: ${JSON.stringify(eventIds)}`);

    // Step 3: Fetch event details from EventService via gRPC
    const metadata = new Metadata(); // Add any metadata if required (e.g., auth tokens)
    this.logger.log(`Preparing to fetch event configurations for ${eventIds.length} events`);

    const events = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          this.logger.log(`Fetching event config for eventId: ${eventId}, tenantId: ${tenantIdStr}`);
          const response = await firstValueFrom(
            this.eventService.GetEventConfig(
              { tenantId: tenantIdStr, eventId },
              metadata
            )
          );
          this.logger.log(`Successfully fetched event config for eventId: ${eventId}`);
          return response;
        } catch (error) {
          this.logger.error(`Failed to fetch event ${eventId}: ${error.message}`, error.stack);
          return null; // Handle individual failures gracefully
        }
      })
    );

    // Step 4: Filter out failed requests and return successful responses
    const successfulEvents = events.filter(event => event !== null);
    this.logger.log(`Successfully fetched ${successfulEvents.length} event configurations for user ${userId}`);

    if (successfulEvents.length === 0 && registrations.length > 0) {
      this.logger.warn(`All gRPC calls failed for user ${userId} in tenant ${tenantIdStr}`);
    }

    return successfulEvents;
  } catch (error) {
    this.logger.error(
      `Failed to fetch events for user ${userId} in tenant ${tenantIdStr}. Error: ${error.message}`,
      error.stack
    );
    throw new InternalServerErrorException('Failed to retrieve events for the attendee.');
  }

  }

  async findByUserId(userId: string, tenantId: string): Promise<AttendeeDocument> {
    this.logger.log(`Finding attendee with userId: ${userId} for tenant ${tenantId}`);
    try {
      const attendee = await this.attendeeModel.findOne({ userId, tenantId: new Types.ObjectId(tenantId) }).exec();
      if (!attendee) {
        throw new NotFoundException(`Attendee with userId "${userId}" not found for tenant "${tenantId}".`);
      }
      return attendee;
    } catch (error) {
      this.logger.error(`Failed to find attendee with userId: ${userId} for tenant ${tenantId}. Error: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve attendee by userId.');
    }
  }

  async createOrUpdateFromRegistration(
  tenantId: Types.ObjectId,
  dto: CreateAttendeeDto,
  session: ClientSession,
): Promise<Attendee> {
  this.logger.log(`[DEV-MODE] Creating a new attendee for each registration for email: ${dto.email}`);
  const newAttendee = new this.attendeeModel({ ...dto, tenantId });
  return newAttendee.save({ session });
}
}