import { AppError } from '../../shared/errors';
import * as authService from './auth.service';
import type {
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from './auth.schema';

function toUserResponse(user: {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Registers a new user and issues initial tokens.
 */
export async function register(
  body: RegisterRequest,
): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
  const { user, accessToken, refreshToken } = await authService.register(
    body.email,
    body.password,
    body.nickname,
  );

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Authenticates a user and issues tokens.
 */
export async function login(
  body: LoginRequest,
): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
  const { user, accessToken, refreshToken } = await authService.login(
    body.email,
    body.password,
  );

  return {
    user: toUserResponse(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Rotates the refresh token and returns a new access token.
 */
export async function refresh(
  rawToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return authService.refreshAccessToken(rawToken);
}

/**
 * Logs out the user by revoking the supplied refresh token.
 */
export async function logout(rawToken: string | undefined): Promise<void> {
  if (rawToken) {
    await authService.logout(rawToken);
  }
}

/**
 * Fetches the current authenticated user by id.
 */
export async function me(userId: string): Promise<UserResponse> {
  const user = await authService.getUserById(userId);
  if (!user) {
    throw new AppError('AUTH_002', 'Invalid access token', 401);
  }

  return toUserResponse(user);
}
