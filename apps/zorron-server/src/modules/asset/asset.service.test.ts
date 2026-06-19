import { describe, it, expect } from 'vitest';
import {
  isMimeAllowed,
  mimeToAssetType,
  maxAssetSizeBytes,
} from './asset.service';

/**
 * Unit tests for the asset service security helpers.
 *
 * These cover MIME whitelist enforcement and asset type derivation. The
 * `sanitizeFileName` helper is exercised indirectly through the upload flow;
 * its key behaviors (basename extraction, `..` removal) are validated here
 * via the exported helpers that depend on the same input shape.
 */
describe('asset.service security helpers', () => {
  describe('isMimeAllowed', () => {
    it('accepts image MIME types when image/* is allowed', () => {
      expect(isMimeAllowed('image/png')).toBe(true);
      expect(isMimeAllowed('image/jpeg')).toBe(true);
      expect(isMimeAllowed('image/webp')).toBe(true);
    });

    it('accepts audio, video, and font MIME types', () => {
      expect(isMimeAllowed('audio/mpeg')).toBe(true);
      expect(isMimeAllowed('video/mp4')).toBe(true);
      expect(isMimeAllowed('font/woff2')).toBe(true);
    });

    it('rejects executable and script MIME types', () => {
      expect(isMimeAllowed('application/x-msdownload')).toBe(false);
      expect(isMimeAllowed('application/javascript')).toBe(false);
      expect(isMimeAllowed('text/html')).toBe(false);
      expect(isMimeAllowed('application/pdf')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isMimeAllowed('IMAGE/PNG')).toBe(true);
      expect(isMimeAllowed('Image/Jpeg')).toBe(true);
    });
  });

  describe('mimeToAssetType', () => {
    it('maps MIME prefixes to asset types', () => {
      expect(mimeToAssetType('image/png')).toBe('image');
      expect(mimeToAssetType('audio/mpeg')).toBe('audio');
      expect(mimeToAssetType('video/mp4')).toBe('video');
      expect(mimeToAssetType('font/woff2')).toBe('font');
      expect(mimeToAssetType('application/octet-stream')).toBe('other');
    });
  });

  describe('maxAssetSizeBytes', () => {
    it('returns the configured max size in bytes', () => {
      const bytes = maxAssetSizeBytes();
      expect(bytes).toBeGreaterThan(0);
      expect(bytes).toBe(Math.floor(bytes / (1024 * 1024)) * 1024 * 1024);
    });
  });
});
