import { CallHandler, ExecutionContext, Injectable, NestInterceptor, BadRequestException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Types } from 'mongoose';
import { Metadata } from '@grpc/grpc-js';
import { UserRole } from '../enums';

interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

interface CustomRequest extends Request {
  user: UserContext;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isHttp = context.getType() === 'http';
    const isRpc = context.getType() === 'rpc';

    if (isHttp) {
      const request = context.switchToHttp().getRequest<CustomRequest>();

      // If a user is NOT already attached by the AuthenticationGuard, attach a mock user.
      if (!request.user) {
        this.logger.debug('No JWT user found. Attaching mock user context for development.');

        const tempTenantId = Array.isArray(request.headers['x-temp-tenant-id'])
          ? request.headers['x-temp-tenant-id'][0]
          : request.headers['x-temp-tenant-id'] || '60d5ec49f8a3c5a6d8b4567f';
        const tempUserId = Array.isArray(request.headers['x-temp-user-id'])
          ? request.headers['x-temp-user-id'][0]
          : request.headers['x-temp-user-id'] || '60d5ec49f8a3c5a6d8b4567e';

        if (!Types.ObjectId.isValid(tempTenantId)) {
          throw new BadRequestException('Invalid temporary tenant ID format.');
        }
        if (!Types.ObjectId.isValid(tempUserId)) {
          throw new BadRequestException('Invalid temporary user ID format.');
        }

        const userContext: UserContext = {
          userId: tempUserId,
          tenantId: tempTenantId,
          roles: [UserRole.TENANT_ADMIN, UserRole.EVENT_MANAGER], // Provide powerful mock roles
        };

        request.user = userContext;
        this.logger.debug(`HTTP: Attached mock userContext with tenantId: ${tempTenantId}, userId: ${tempUserId}`);
      } else {
        this.logger.debug('User already attached by AuthenticationGuard. Skipping mock user attachment.');
      }
    } else if (isRpc) {
      const call = context.switchToRpc().getContext();

      // If a user is NOT already attached by the AuthenticationGuard, attach a mock user.
      if (!call.user) {
        this.logger.debug('No gRPC user found. Attaching mock user context for development.');
        const metadata: Metadata = context.getArgByIndex(1);
        const tempTenantId = metadata.get('x-temp-tenant-id')[0]?.toString() || '60d5ec49f8a3c5a6d8b4567f';
        const tempUserId = metadata.get('x-temp-user-id')[0]?.toString() || '60d5ec49f8a3c5a6d8b4567e';

        if (!Types.ObjectId.isValid(tempTenantId)) {
          throw new BadRequestException('Invalid temporary tenant ID format in gRPC metadata.');
        }
        if (!Types.ObjectId.isValid(tempUserId)) {
          throw new BadRequestException('Invalid temporary user ID format in gRPC metadata.');
        }

        const userContext: UserContext = {
          userId: tempUserId,
          tenantId: tempTenantId,
          roles: [UserRole.TENANT_ADMIN, UserRole.EVENT_MANAGER],
        };

        call.user = userContext;
        this.logger.debug(`gRPC: Attached mock user with tenantId: ${tempTenantId}, userId: ${tempUserId}`);
      } else {
        this.logger.debug('gRPC user already exists. Skipping mock attachment.');
      }
    }

    return next.handle();
  }
}