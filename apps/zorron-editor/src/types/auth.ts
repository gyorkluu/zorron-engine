/**
 * Auth type definitions, mirroring the backend AuthResponseSchema.
 */

/** Authenticated user. */
export interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response from register/login. */
export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/** Register request payload. */
export interface RegisterPayload {
  email: string;
  password: string;
  nickname?: string;
}

/** Login request payload. */
export interface LoginPayload {
  email: string;
  password: string;
}
