// src/event-config/event-config.controller.ts (in Event Registration Microservice)
import { Controller, Get, Query, Req, BadRequestException, Logger, HttpCode, HttpStatus, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { EventRegistrationService } from './event-registration.service';
import { CustomRequest } from 'src/Interceptor/custom-request.interface';
import { EventDto } from './dto/event.dto';

interface EventConfig {
  requiredDocuments: { id: string; key: string; label: string }[];
  tariffRules: { id: string; name: string; amount: number; validFrom: string; validUntil: string }[];
}

@ApiTags('GrpcMethods')
@Controller('event')
export class EventConfigController {
  private readonly logger = new Logger(EventConfigController.name);

  constructor(private readonly eventRegistrationService: EventRegistrationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get event pricing' })

  @ApiQuery({ name: 'eventId', required: true, description: 'The event ID' })
  @ApiResponse({ status: 200, description: 'Event pricing returned successfully', type: Object  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEventConfig(
    @Query('eventId') eventId: string,
    @Req() req: CustomRequest,
  ): Promise<EventConfig> {
    const { tenantId } = req.user;
    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }
    this.logger.log(`Fetching event config for tenantId: ${tenantId}, eventId: ${eventId}`);
    try {
      const config = await this.eventRegistrationService.getEventConfig(tenantId, eventId);
      return config;
    } catch (error) {
      this.logger.error(`Failed to fetch event config: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch event config: ${error.message}`);
    }
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ping the Event Service' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'The tenant ID (optional)' })
  @ApiResponse({ status: 200, description: 'Ping response', schema: { properties: { message: { type: 'string' } } } })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async ping(@Query('tenantId') tenantId?: string, @Req() req?: CustomRequest): Promise<{ message: string }> {
  this.logger.log(`Pinging Event Service with tenantId: ${tenantId || 'unknown'}`);
  try {
    const metadata = new Metadata();
    metadata.add('x-temp-tenant-id', tenantId || req?.user.tenantId || 'unknown');
    metadata.add('x-temp-user-id', req?.user.userId || 'unknown');
    const response = await firstValueFrom(this.eventRegistrationService.eventService.Ping({}));
    return { message: response.message };
  } catch (error) {
    this.logger.error(`Failed to ping Event Service: ${error.message}`, error.stack);
    throw new BadRequestException(`Failed to ping Event Service: ${error.message}`);
  }
}

  @Get(':eventId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'eventId', required: true, description: 'The event ID' })
  @ApiResponse({ status: 200, description: 'Event returned successfully', type: EventDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getEventById(
    @Param('eventId') eventId: string,
    @Req() req: CustomRequest,
  ): Promise<EventDto> {
    const { tenantId } = req.user;
    this.logger.log(`REST request to fetch eventId: ${eventId} for tenantId: ${tenantId}`);

    if (!eventId) {
      throw new BadRequestException('Event ID is required');
    }

    try {
      const event = await this.eventRegistrationService.getEventByIdGrpc(eventId, tenantId);
      return event;
    } catch (error) {
      this.logger.error(`Failed to fetch event ${eventId}: ${error.message}`, error.stack);
      // Re-throw the exception to let NestJS handle the response
      throw error;
    }
  }
}