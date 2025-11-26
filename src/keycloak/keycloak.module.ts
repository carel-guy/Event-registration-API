import { Module } from '@nestjs/common';
import {
  KeycloakConnectModule,
  AuthGuard,
  ResourceGuard,
  RoleGuard,
  PolicyEnforcementMode,
} from 'nest-keycloak-connect';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';

@Module({
  imports: [
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        authServerUrl: configService.get<string>('KEYCLOAK_URL')!,
        realm: configService.get<string>('KEYCLOAK_REALM')!,
        clientId: configService.get<string>('KEYCLOAK_CLIENT_ID')!,
        secret: configService.get<string>('KEYCLOAK_CLIENT_SECRET')!,
        // Set to true if you are using bearer-only authentication
        bearerOnly: true,
        // The policy enforcement mode decides what to do with requests that don't have a valid token.
        // 'PERMISSIVE' will allow them to pass, which is what we want for our mock user fallback.
        policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
      }),
    }),
  ],
  providers: [
    // This adds a global guard that will protect all routes
    {
      provide: APP_GUARD,
      useClass: ResourceGuard,
    },
    KeycloakService,
  ],
  exports: [KeycloakConnectModule, KeycloakService],
})
export class KeycloakModule {}

