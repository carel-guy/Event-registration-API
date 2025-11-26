import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';
import UserRepresentation from '@keycloak/keycloak-admin-client/lib/defs/userRepresentation';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private adminClient: KeycloakAdminClient;

  constructor(private configService: ConfigService) {
    this.adminClient = new KeycloakAdminClient({
      baseUrl: this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080'),
      realmName: 'master',
    });
  }

  async onModuleInit() {
    this.logger.log('Checking Keycloak connection...');
    try {
      const realmName = this.configService.get<string>('KEYCLOAK_REALM');
      if (!realmName) {
        this.logger.error('KEYCLOAK_REALM environment variable not set. Realm check will be skipped.');
        return;
      }
      await this.authenticateAdmin();
      this.logger.log('Keycloak admin authentication successful.');

      this.logger.log(`Ensuring realm '${realmName}' exists.`);
      await this.ensureRealmExists(realmName);
      this.logger.log('Keycloak connection and realm check successful.');
    } catch (error) {
      this.logger.error('Failed to initialize Keycloak service. Please check KEYCLOAK credentials and connection.', error.stack);
      // We are not re-throwing the error to allow the app to start, but the log provides a clear warning.
    }
  }

  /**
   * Finds the internal ID of a client given its public clientId.
   * The Keycloak Admin Client often requires the internal ID for operations.
   */
  private async getClientInternalId(realm: string, clientId: string): Promise<string> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });

    const clients = await this.adminClient.clients.find({ clientId });
    if (!clients || clients.length === 0) {
      this.logger.error(`Client '${clientId}' not found in realm '${realm}'.`);
      throw new NotFoundException(`Client '${clientId}' not found in realm '${realm}'.`);
    }

    const clientInternalId = clients[0].id;
    if (!clientInternalId) {
        this.logger.error(`Client '${clientId}' in realm '${realm}' does not have an internal ID.`);
        throw new InternalServerErrorException(`Client '${clientId}' is missing an internal ID.`);
    }

    return clientInternalId;
  }

  private async authenticateAdmin() {
    await this.adminClient.auth({
      username: this.configService.get<string>('KEYCLOAK_ADMIN_USER', 'admin'),
      password: this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin'),
      grantType: 'password',
      clientId: 'admin-cli',
    });
  }

  public async ensureRealmExists(realmName: string) {
    await this.authenticateAdmin();
    const realms = await this.adminClient.realms.find();
    const realmExists = realms.some((realm) => realm.realm === realmName);

    if (!realmExists) {
      this.logger.log(`Realm '${realmName}' not found. Creating it...`);
      await this.adminClient.realms.create({
        realm: realmName,
        enabled: true,
      });
      this.logger.log(`Realm '${realmName}' created successfully.`);
    } else {
      this.logger.log(`Realm '${realmName}' already exists.`);
    }
  }

  async findUserById(realm: string, userId: string): Promise<UserRepresentation> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });
    const user = await this.adminClient.users.findOne({ id: userId });
    if (!user) {
      throw new Error(`User with ID ${userId} not found in realm ${realm}`);
    }
    return user;
  }

  async createUser(realm: string, user: UserRepresentation, tenantId: string, password?: string): Promise<string> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });

    const newUser: UserRepresentation = {
      username: user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: true,
      attributes: {
        tenantId: [tenantId],
      },
    };

    if (password) {
      newUser.credentials = [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ];
    }

    try {
      const createdUser = await this.adminClient.users.create(newUser);
      this.logger.log(`Successfully created user ${newUser.email} in realm ${realm} with ID ${createdUser.id}`);
      return createdUser.id;
    } catch (error) {
      this.logger.error(`Failed to create user ${newUser.email} in realm ${realm}`, error.stack);
      if (error.response?.status === 409) {
        throw new Error(`User with email ${newUser.email} already exists in realm ${realm}.`);
      }
      throw new Error(`An unexpected error occurred while creating the user in Keycloak: ${error.message}`);
    }
  }

  async getUserInfo(userId: string, realm: string) {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });
    
    const user = await this.adminClient.users.findOne({ id: userId });

    if (!user) {
      throw new Error('User not found in Keycloak');
    }

    const tenantId = user.attributes?.tenantId?.[0] || 'default-tenant-id';
    const realmAccess = await this.adminClient.users.listRealmRoleMappings({id: userId});

    return {
      id: user.id,
      tenantId: tenantId,
      roles: realmAccess?.map(role => role.name) || [],
    };
  }

  // --- Client Role Management ---

  /**
   * Assigns a client-level role to a user within a specific realm.
   * @param realm The realm in which the user and role exist.
   * @param userId The ID of the user.
   * @param roleName The name of the client role to assign (e.g., 'TENANT_ADMIN').
   */
  async assignClientRoleToUser(realm: string, userId: string, roleName: string): Promise<void> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });

    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException('KEYCLOAK_CLIENT_ID is not configured.');
    }

    const clientInternalId = await this.getClientInternalId(realm, clientId);

    const role = await this.adminClient.clients.findRole({ id: clientInternalId, roleName });
    if (!role || !role.id || !role.name) {
      throw new NotFoundException(`Role '${roleName}' not found or is invalid for client '${clientId}' in realm '${realm}'.`);
    }

    try {
      // Construct the required RoleMappingPayload
      const rolePayload = { id: role.id, name: role.name };
      await this.adminClient.users.addClientRoleMappings({ id: userId, clientUniqueId: clientInternalId, roles: [rolePayload] });
      this.logger.log(`Successfully assigned role '${roleName}' to user '${userId}' in realm '${realm}'.`);
    } catch (error) {
      this.logger.error(`Failed to assign role '${roleName}' to user '${userId}'.`, error.stack);
      throw new InternalServerErrorException('Failed to assign role to user.');
    }
  }

  /**
   * Revokes a client-level role from a user.
   * @param realm The realm in which the user and role exist.
   * @param userId The ID of the user.
   * @param roleName The name of the client role to revoke.
   */
  async revokeClientRoleFromUser(realm: string, userId: string, roleName: string): Promise<void> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });

    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException('KEYCLOAK_CLIENT_ID is not configured.');
    }

    const clientInternalId = await this.getClientInternalId(realm, clientId);

    const role = await this.adminClient.clients.findRole({ id: clientInternalId, roleName });
    if (!role || !role.id || !role.name) {
      throw new NotFoundException(`Role '${roleName}' not found or is invalid for client '${clientId}' in realm '${realm}'.`);
    }

    try {
      // Construct the required RoleMappingPayload
      const rolePayload = { id: role.id, name: role.name };
      await this.adminClient.users.delClientRoleMappings({ id: userId, clientUniqueId: clientInternalId, roles: [rolePayload] });
      this.logger.log(`Successfully revoked role '${roleName}' from user '${userId}' in realm '${realm}'.`);
    } catch (error) {
      this.logger.error(`Failed to revoke role '${roleName}' from user '${userId}'.`, error.stack);
      throw new InternalServerErrorException('Failed to revoke role from user.');
    }
  }

  /**
   * Finds all users who have a specific client-level role.
   * @param realm The realm to search within.
   * @param roleName The name of the client role.
   * @returns A list of user representations.
   */
  async findUsersByClientRole(realm: string, roleName: string): Promise<UserRepresentation[]> {
    await this.authenticateAdmin();
    this.adminClient.setConfig({ realmName: realm });

    const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException('KEYCLOAK_CLIENT_ID is not configured.');
    }

    const clientInternalId = await this.getClientInternalId(realm, clientId);

    try {
      const users = await this.adminClient.clients.findUsersWithRole({ id: clientInternalId, roleName });
      return users;
    } catch (error) {
      this.logger.error(`Failed to find users with role '${roleName}'.`, error.stack);
      throw new InternalServerErrorException('Failed to retrieve users by role.');
    }
  }
}
