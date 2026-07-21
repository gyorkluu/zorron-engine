/**
 * card-crypto.ts
 *
 * Decrypts the `showCardPresetUrl` field returned by Xoyo's
 * `/badge/get-role-card-preset` endpoint.
 *
 * The 推栏 app encrypts the card-preset image URL with AES-128-CBC
 * using a hardcoded key/IV (reverse-engineered from the JS bundle).
 * The ciphertext is Base64-encoded; the plaintext is a UTF-8 CDN URL
 * with a time-limited `auth_key` parameter.
 *
 * Reference: I:\workspace\Nodejs-workspace\bot\game\tuilanapp\decrypt_card_url.py
 */

import { createDecipheriv } from 'node:crypto';

/** AES-128-CBC key (16 bytes, ASCII). */
const CARD_KEY = 'Xy5Km9Rp2Wq4Nv8C';
/** AES-128-CBC IV (same as key). */
const CARD_IV = 'Xy5Km9Rp2Wq4Nv8C';

/**
 * Decrypt a Base64-encoded AES-128-CBC ciphertext into the plaintext
 * card-preset image URL.
 *
 * @param ciphertext - Base64 ciphertext from `showCardPresetUrl`.
 * @returns The decrypted CDN URL string, or empty string on failure.
 */
export function decryptCardUrl(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const keyBuf = Buffer.from(CARD_KEY, 'utf8');
    const ivBuf = Buffer.from(CARD_IV, 'utf8');
    const dataBuf = Buffer.from(ciphertext, 'base64');

    const decipher = createDecipheriv('aes-128-cbc', keyBuf, ivBuf);
    const decrypted = Buffer.concat([
      decipher.update(dataBuf),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}
