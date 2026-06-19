/**
 * Storage provider abstraction for local disk, S3, R2, etc.
 */
export interface StorageProvider {
  /**
   * Stores a file and returns the accessible URL.
   */
  put(key: string, file: File): Promise<string>;

  /**
   * Generates a pre-signed URL (for S3/R2) or a direct link (for local).
   */
  getSignedUrl(
    key: string,
    expiresSeconds?: number,
  ): Promise<{ url: string; expiresAt?: Date }>;

  /**
   * Deletes the file from storage.
   */
  delete(key: string): Promise<void>;
}
