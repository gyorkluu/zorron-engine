import { hash, compare } from 'bcrypt';
import { SignJWT } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { refreshTokens, type User } from '../../db/schema';
import { AppError } from '../../shared/errors';
import * as userRepository from '../../repositories/user.repository';

/**
 * Converts a human-readable duration string (e.g. `7d`, `15m`) into milliseconds.
 */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)\s*([dhms])$/i);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    d: 86_400_000,
    h: 3_600_000,
    m: 60_000,
    s: 1_000,
  };
  return value * multipliers[unit];
}

/**
 * Hashes a plain-text password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Issues a short-lived JWT access token.
 */
export async function generateAccessToken(
  userId: string,
  email: string,
): Promise<string> {
  return new SignJWT({ email })
    .setSubject(userId)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(new TextEncoder().encode(env.JWT_SECRET));
}

/**
 * Generates a cryptographically secure random refresh token, hashes it, and
 * persists the hash to PostgreSQL.
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

/**
 * Hashes a raw refresh token for lookup.
 */
function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Rotates a refresh token: validates the existing hash, removes it, and issues
 * a new raw token.
 */
export async function rotateRefreshToken(rawToken: string): Promise<string> {
  const tokenHash = hashRefreshToken(rawToken);
  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash));

  if (!existing) {
    throw new AppError('AUTH_002', 'Invalid refresh token', 401);
  }

  if (existing.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, existing.id));
    throw new AppError('AUTH_002', 'Refresh token expired', 401);
  }

  await db.delete(refreshTokens).where(eq(refreshTokens.id, existing.id));

  return generateRefreshToken(existing.userId);
}

/**
 * Revokes a refresh token by removing its hash from the database.
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}

/**
 * Registers a new user and issues initial tokens.
 */
export async function register(
  email: string,
  password: string,
  nickname?: string,
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const existing = await userRepository.findUserByEmail(email);
  if (existing) {
    throw new AppError('AUTH_004', 'Email already registered', 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.createUser({
    email,
    passwordHash,
    nickname,
  });

  const accessToken = await generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

/**
 * Authenticates a user and issues tokens.
 */
export async function login(
  email: string,
  password: string,
): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('AUTH_003', 'Invalid email or password', 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError('AUTH_003', 'Invalid email or password', 401);
  }

  const accessToken = await generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);

  return { user, accessToken, refreshToken };
}

/**
 * Refreshes the access token using a valid refresh token cookie.
 */
export async function refreshAccessToken(
  rawToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const newRefreshToken = await rotateRefreshToken(rawToken);
  // Lookup user by the rotated token's owner requires an extra query because
  // rotateRefreshToken returns the token but not the user id. We decode the
  // user id from the token row by hashing the new token.
  const tokenHash = hashRefreshToken(newRefreshToken);
  const [row] = await db
    .select({ userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash));

  if (!row) {
    throw new AppError('AUTH_002', 'Invalid refresh token', 401);
  }

  const user = await userRepository.findUserById(row.userId);
  if (!user) {
    throw new AppError('AUTH_002', 'Invalid refresh token', 401);
  }

  const accessToken = await generateAccessToken(user.id, user.email);
  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Logs out a user by revoking the supplied refresh token.
 */
export async function logout(rawToken: string): Promise<void> {
  await revokeRefreshToken(rawToken);
}

/**
 * Fetches the current authenticated user by id.
 */
export async function getUserById(id: string): Promise<User | undefined> {
  return userRepository.findUserById(id);
}
