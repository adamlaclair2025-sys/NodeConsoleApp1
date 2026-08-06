export type { Logger } from 'pino';

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  COMMUNITY_MODERATOR = 'community_moderator',
  SENIOR_MODERATOR = 'senior_moderator',
  SUPPORT_STAFF = 'support_staff',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  DELETED = 'deleted',
}

export interface JWTPayload {
  userId: string;
  email: string;
  roles: UserRole[];
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  roles: UserRole[];
  verified: boolean;
}
