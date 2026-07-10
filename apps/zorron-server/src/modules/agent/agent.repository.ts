/**
 * Agent repository - data access for test_sessions.
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../config/database';
import { testSessions } from '../../db/schema';
import type { TestSession, NewTestSession } from '../../db/schema';

/** Insert a new test session. */
export async function createSession(
  data: NewTestSession,
): Promise<TestSession> {
  const [session] = await db.insert(testSessions).values(data).returning();
  return session;
}

/** Find sessions by user identifier or project id with pagination. */
export async function findSessions(opts: {
  userIdentifier?: string;
  projectId?: string;
  page: number;
  pageSize: number;
}): Promise<{ data: TestSession[]; total: number }> {
  const conditions = [];
  if (opts.userIdentifier) {
    conditions.push(eq(testSessions.userIdentifier, opts.userIdentifier));
  }
  if (opts.projectId) {
    conditions.push(eq(testSessions.projectId, opts.projectId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (opts.page - 1) * opts.pageSize;
  const data = await db
    .select()
    .from(testSessions)
    .where(where)
    .orderBy(desc(testSessions.createdAt))
    .limit(opts.pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(testSessions)
    .where(where);

  return { data, total: count };
}
