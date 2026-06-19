import { eq } from 'drizzle-orm';
import { db } from '../config/database';
import { users, type User, type NewUser } from '../db/schema';

/**
 * Find a user by email address.
 *
 * @param email - User email
 * @returns User record or undefined
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

/**
 * Find a user by id.
 *
 * @param id - User UUID
 * @returns User record or undefined
 */
export async function findUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

/**
 * Create a new user record.
 *
 * @param values - Insert payload (email, passwordHash, nickname)
 * @returns Created user
 */
export async function createUser(values: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(values).returning();
  return user;
}
