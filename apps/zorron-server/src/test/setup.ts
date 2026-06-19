import { config } from 'dotenv';
import path from 'node:path';

/**
 * Load environment variables from `.env` before any test runs.
 */
config({ path: path.resolve(import.meta.dirname, '../../.env') });
