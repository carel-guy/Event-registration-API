import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseInterceptors, UploadedFile, Req, BadRequestException, HttpCode, HttpStatus, Res, NotFoundException } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import { EventRegistrationService } from './event-registration.service';
import { CreateEventRegistrationDto } from './dto/create-event-registration.dto'; // Removed DocumentUploadDto as it's not directly used here for @Body
import { UpdateEventRegistrationDto } from './dto/update-event-registration.dto';
import { FilterEventRegistrationDto } from './dto/filter-event-registration.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomRequest, UserContext } from 'src/Interceptor/custom-request.interface'; // Corrected import path based on your provided interface
import { EventRegistration } from './entities/event-registration.entity';
import { File } from 'multer';
import { EventDto } from './dto/event.dto';
import { Response } from 'express';

// Manually define the interface for the gRPC call metadata, including the user context
interface GrpcCall {
  user?: UserContext;
  metadata?: Metadata;
}

// Manually define the request interface based on the proto definition
interface GetEventByRegistrationIdRequest {
  registrationId: string;
}

@ApiTags('event-registrations')
@Controller('event-registrations')
export class EventRegistrationController {
  constructor(private readonly eventRegistrationService: EventRegistrationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new event registration' })
  @ApiResponse({ status: 201, description: 'Registration created successfully', type: CreateEventRegistrationDto })
  @ApiResponse({ status: 200, description: 'Registration created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createRegistration(
    @Body() dto: CreateEventRegistrationDto,
    @Req() req: CustomRequest, // CustomRequest now contains the user context
  ): Promise<{ registration: EventRegistration; message: string }> {
    const { registration, message } = await this.eventRegistrationService.createRegistration(dto, req.user);
    return { registration, message };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all registrations with filters' })
  @ApiResponse({ status: 200, description: 'List of registrations', type: [EventRegistration] })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  async findAll(
    @Query() filterDto: FilterEventRegistrationDto,
    @Req() req: CustomRequest,
  ): Promise<{ eventRegistrations: EventRegistration[]; total: number; page: number; limit: number }> {
    const { tenantId } = req.user; // Extract tenantId from req.user
    return this.eventRegistrationService.findAll(tenantId, filterDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a registration by ID' })
  @ApiResponse({ status: 200, description: 'Registration details', type: EventRegistration })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistrationById(@Param('id') id: string, @Req() req: CustomRequest): Promise<EventRegistration> {
    const { tenantId } = req.user; // Extract tenantId from req.user
    return this.eventRegistrationService.getRegistrationById(id, tenantId);
  }

  @Get(':id/details')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get full registration details by ID' })
  @ApiResponse({ status: 200, description: 'Full registration details', type: EventRegistration })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async getRegistrationDetails(@Param('id') id: string, @Req() req: CustomRequest): Promise<EventRegistration> {
    const { tenantId } = req.user;
    const registration = await this.eventRegistrationService.findRegistrationDetailsById(id, tenantId);
    if (!registration) {
      throw new NotFoundException('Registration not found.');
    }
    return registration;
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a registration by ID' })
  @ApiResponse({ status: 200, description: 'Registration updated successfully', type: EventRegistration })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async updateRegistration(
    @Param('id') id: string,
    @Body() updateDto: UpdateEventRegistrationDto,
    @Req() req: CustomRequest,
  ): Promise<EventRegistration> {
    const { tenantId } = req.user; // Extract tenantId from req.user
    return this.eventRegistrationService.updateRegistration(id, updateDto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a registration by ID' })
  @ApiResponse({ status: 200, description: 'Registration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async deleteRegistration(@Param('id') id: string, @Req() req: CustomRequest): Promise<void> {
    const { tenantId } = req.user; // Extract tenantId from req.user
    return this.eventRegistrationService.deleteRegistration(id, tenantId);
  }

  // --- Added: REST endpoint to fetch event by ID from Event microservice via gRPC ---
  @Get('by-registration/:registrationId/event')
  @ApiOperation({ summary: 'Get event details by registration ID' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventDto })
  @ApiResponse({ status: 404, description: 'Registration or Event not found' })
  async getEventByRegistrationIdFromRest(
    @Param('registrationId') registrationId: string,
    @Req() req: CustomRequest,
  ): Promise<EventDto> {
    return this.eventRegistrationService.getEventByRegistration(
      registrationId,
      req.user,
    );
  }

  
}