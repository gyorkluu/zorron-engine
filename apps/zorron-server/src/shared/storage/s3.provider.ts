import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from './provider';
import { env } from '../../config/env';

/**
 * [S3/R2 Storage]: stores uploaded files in an S3-compatible bucket and
 * returns pre-signed URLs for private reads.
 */
export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    if (!env.STORAGE_BUCKET || !env.STORAGE_ENDPOINT) {
      throw new Error('Missing S3 storage configuration');
    }

    this.client = new S3Client({
      endpoint: env.STORAGE_ENDPOINT,
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? '',
      },
    });
    this.bucket = env.STORAGE_BUCKET;
    this.publicUrl = env.STORAGE_PUBLIC_URL ?? env.STORAGE_BASE_URL;
  }

  async put(key: string, file: File): Promise<string> {
    const buffer = Buffer.from(await file.arrayBuffer());
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );
    return `${this.publicUrl}/${key}`;
  }

  async getSignedUrl(
    key: string,
    expiresSeconds = 3600,
  ): Promise<{ url: string; expiresAt: Date }> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getS3SignedUrl(this.client, command, {
      expiresIn: expiresSeconds,
    });
    return { url, expiresAt: new Date(Date.now() + expiresSeconds * 1000) };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
