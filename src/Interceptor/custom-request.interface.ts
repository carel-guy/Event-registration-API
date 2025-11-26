// src/common/interfaces/custom-request.interface.ts

import { Request } from 'express';

export interface UserContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

export interface CustomRequest extends Request {
  user: UserContext;
}
