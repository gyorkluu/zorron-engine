import { env } from '../../config/env';
import type { StorageProvider } from './provider';
import { LocalStorageProvider } from './local.provider';
import { S3StorageProvider } from './s3.provider';

/**
 * Resolves the active storage provider from environment configuration.
 */
export function createStorageProvider(): StorageProvider {
  switch (env.STORAGE_PROVIDER) {
    case 's3':
    case 'r2':
      return new S3StorageProvider();
    case 'local':
    default:
      return new LocalStorageProvider();
  }
}
