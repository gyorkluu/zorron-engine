import { db } from '../config/database';
import { users, projects, assets } from './schema';
import { logger } from '../shared/logger';

/**
 * Seeds the local development database with a sample user, project, and asset.
 *
 * Run with `pnpm --filter zorron-server db:seed`.
 */
async function seed() {
  logger.info('Seeding development data...');

  const [user] = await db
    .insert(users)
    .values({
      email: 'dev@zorron.io',
      passwordHash: '$2b$10$placeholder_hash_do_not_use_in_production',
      nickname: 'Zorron Dev',
    })
    .returning();

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: user.id,
      title: 'Sample Narrative',
      description: 'A sample project for local development',
      data: {
        nodes: [],
        edges: [],
        variables: {},
        settings: {},
        version: '1.0.0',
      },
    })
    .returning();

  await db.insert(assets).values({
    ownerId: user.id,
    projectId: project.id,
    name: 'placeholder.png',
    type: 'image',
    mimeType: 'image/png',
    size: 0,
    storageKey: 'placeholders/placeholder.png',
    url: 'http://localhost:3000/uploads/placeholders/placeholder.png',
    metadata: {},
  });

  logger.info({ userId: user.id, projectId: project.id }, 'Seed complete');
}

seed()
  .then(async () => {
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error(err, 'Seed failed');
    process.exit(1);
  });
