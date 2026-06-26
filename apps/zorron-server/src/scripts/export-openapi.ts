/**
 * Export the OpenAPI specification to a JSON file.
 *
 * The script boots the Elysia application on an ephemeral port, fetches the
 * auto-generated `/swagger/json` endpoint (provided by `@elysiajs/swagger`),
 * writes the spec to disk, and shuts down.
 *
 * Usage:
 *   bun src/scripts/export-openapi.ts [output-path]
 *
 * Default output: ./openapi.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../app';
import { logger } from '../shared/logger';

const DEFAULT_OUTPUT = 'openapi.json';
const SWAGGER_PATH = '/swagger/json';

/**
 * Boots the app, fetches the OpenAPI spec, writes it to disk, and stops.
 *
 * @param outputArg - Optional output path from CLI args
 */
async function main(outputArg?: string): Promise<void> {
  const outputPath = resolve(outputArg ?? DEFAULT_OUTPUT);
  const app = createApp();

  // Use port 0 to let the OS assign an ephemeral port, avoiding conflicts.
  const port = 0;
  await new Promise<void>((resolveListen) => {
    app.listen(port, () => resolveListen());
  });

  // Elysia exposes the actual assigned port via `app.server`.
  const server = app.server;
  if (!server) {
    throw new Error('Failed to start server for OpenAPI export');
  }
  const address = server.url;
  const specUrl = new URL(SWAGGER_PATH, address).toString();

  logger.info({ specUrl, outputPath }, 'exporting OpenAPI spec');

  const response = await fetch(specUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`,
    );
  }

  const spec = await response.json();
  writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf8');

  logger.info({ outputPath }, 'OpenAPI spec exported');

  server.stop();
  process.exit(0);
}

const outputArg = process.argv[2];

main(outputArg).catch((error: unknown) => {
  logger.error({ error }, 'failed to export OpenAPI spec');
  process.exit(1);
});
