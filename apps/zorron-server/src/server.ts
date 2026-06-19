import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/logger';

/**
 * Application entry point. Creates the Elysia instance and starts Bun.serve.
 */
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, nodeEnv: env.NODE_ENV },
    'Zorron server started',
  );
});

export type App = typeof app;
