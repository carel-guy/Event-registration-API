// src/attendee/attendee.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendeeService } from './attendee.service';
import { CreateAttendeeDto } from './dto/create-attendee.dto';
import { UpdateAttendeeDto } from './dto/update-attendee.dto';
import { FilterAttendeeDto } from './dto/filter-attendee.dto';
import { Types } from 'mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Attendee } from './entities/attendee.entity';
import { GetAttendeeEventsDto } from './dto/get-attendee-events.dto';
import { EventConfig, EventService } from 'src/interface/grpc-interface';
import { CustomRequest } from 'src/Interceptor/custom-request.interface';

@ApiTags('Attendees')
@Controller('attendees')
@UsePipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}))
export class AttendeeController {
  private readonly logger = new Logger(AttendeeController.name);
  constructor(private readonly attendeeService: AttendeeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new attendee' })
  @ApiBody({ type: CreateAttendeeDto })
  @ApiResponse({ status: 201, description: 'The attendee has been successfully created.', type: Attendee })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Conflict (Attendee with this userId or email already exists for the tenant).' })
  async create(@Body() createAttendeeDto: CreateAttendeeDto, @Req() req: CustomRequest): Promise<Attendee> {
    const { tenantId } = req.user;
    return this.attendeeService.create(new Types.ObjectId(tenantId), createAttendeeDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all attendees with optional filtering and pagination' })
  @ApiQuery({ name: 'firstName', required: false, type: String, description: 'Filter by first name (case-insensitive partial match).', example: 'john' })
  @ApiQuery({ name: 'lastName', required: false, type: String, description: 'Filter by last name (case-insensitive partial match).', example: 'doe' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Filter by email address (case-insensitive partial match).', example: 'example.com' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID.', example: 'auth0|12345' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination.', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page for pagination.', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'A list of attendees with pagination details.',
    schema: {
      type: 'object',
      properties: {
        attendees: {
          type: 'array',
          items: { $ref: '#/components/schemas/Attendee' },
        },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 10 },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async findAll(@Req() req: CustomRequest, @Query() filterDto: FilterAttendeeDto): Promise<{ attendees: Attendee[]; total: number; page: number; limit: number; totalPages: number }> {
    const { tenantId } = req.user;
    return this.attendeeService.findAll(new Types.ObjectId(tenantId), filterDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve a single attendee by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the attendee', example: '60c72b2f9b1d8f001c8e4d8a' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved attendee.', type: Attendee })
  @ApiResponse({ status: 404, description: 'Attendee not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid ID format).' })
  async findOne(@Param('id') id: string, @Req() req: CustomRequest): Promise<Attendee> {
    const { tenantId } = req.user;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Attendee ID format.');
    }
    return this.attendeeService.findOne(new Types.ObjectId(tenantId), new Types.ObjectId(id));
  }
  

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing attendee by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the attendee', example: '60c72b2f9b1d8f001c8e4d8a' })
  @ApiBody({ type: UpdateAttendeeDto })
  @ApiResponse({ status: 200, description: 'The attendee has been successfully updated.', type: Attendee })
  @ApiResponse({ status: 404, description: 'Attendee not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 409, description: 'Conflict (Updated userId or email already exists for another attendee in this tenant).' })
  async update(@Param('id') id: string, @Body() updateAttendeeDto: UpdateAttendeeDto, @Req() req: CustomRequest): Promise<Attendee> {
    const { tenantId } = req.user;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Attendee ID format.');
    }
    return this.attendeeService.update(new Types.ObjectId(tenantId), new Types.ObjectId(id), updateAttendeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attendee by ID' })
  @ApiParam({ name: 'id', type: String, description: 'The ID of the attendee', example: '60c72b2f9b1d8f001c8e4d8a' })
  @ApiResponse({ status: 204, description: 'The attendee has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Attendee not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid ID format).' })
  async remove(@Param('id') id: string, @Req() req: CustomRequest): Promise<void> {
    const { tenantId } = req.user;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid Attendee ID format.');
    }
    await this.attendeeService.remove(new Types.ObjectId(tenantId), new Types.ObjectId(id));
  }

  @Get('events/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve all events for a specific user within the tenant' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved events for the user.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid userId format).' })
  @ApiResponse({ status: 401, description: 'Unauthorized (missing or invalid authentication).' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async getEventsForUser(
    @Param() params: GetAttendeeEventsDto,
    @Req() req: CustomRequest,
  ): Promise<EventConfig[]> {
    this.logger.log(`Received request to fetch events for userId: ${params.userId}`);

    const { tenantId, userId: requestorId } = req.user;

    // Optional: Add role-based access control here if needed
    // For example, an admin might be able to view any user's events,
    // while a regular user can only view their own.
    // if (!req.user.roles.includes('admin') && params.userId !== requestorId) {
    //   throw new UnauthorizedException('You are not authorized to view events for this user.');
    // }

    this.logger.log(`Calling service to fetch events for user ${params.userId} in tenant ${tenantId}`);

    try {
      const events = await this.attendeeService.getEventsForUser(new Types.ObjectId(tenantId), { userId: params.userId });
      this.logger.log(`Returning ${events.length} events for user ${params.userId}`);
      return events;
    } catch (error) {
      this.logger.error(`Failed to retrieve events for user ${params.userId}: ${error.message}`, error.stack);
      throw error; // Let the service's InternalServerErrorException propagate
    }
  }
}