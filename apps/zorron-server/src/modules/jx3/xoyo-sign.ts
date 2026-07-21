/**
 * xoyo-sign.ts
 *
 * Xoyo (Seasun / 西山居) m.pvp.xoyo.com request signing utilities.
 *
 * Algorithm (mirrors jx3_buy/time_sync.py, same source as zorron-api rank-update.ts):
 *   message = JSON.stringify(body) + SIGN_SALT
 *   sig     = HMAC-SHA256(SIGN_KEY, message).hex().lower()
 *   header  = x-sk: <sig>
 *
 * Timestamp format: YYYYMMDDHHmmssSSS (UTC, millisecond precision).
 */

import crypto from 'node:crypto';

/** HMAC signing key (shared across JX3 APP clients). */
export const SIGN_KEY = 'MaYoaMQ3zpWJFWtN9mqJqKpHrkdFwLd9DDlFWk2NnVR1mChVRI6THVe6KsCnhpoR';

/** Salt appended to the JSON body before HMAC. */
export const SIGN_SALT = '@#?.#@';

/** Default device id used by the JX3 APP sample captured in docs/http. */
export const DEFAULT_DEVICE_ID = 'oNh8++POiQjJm94+SOBJfA==';

/**
 * Default token (captured from a live APP request).
 * Override via `JX3_XOYO_TOKEN` env var when rotated.
 */
export const DEFAULT_TOKEN =
  process.env.JX3_XOYO_TOKEN ??
  '4d4b4f79a22d4e2cb9ef86c19f1598be:pvxx103:kingsoft::oNh8++POiQjJm94+SOBJfA==';

/** Xoyo m.pvp host. */
export const XOYO_HOST = 'm.pvp.xoyo.com';

/** Base headers shared by every JX3 APP request to m.pvp.xoyo.com. */
export function baseHeaders(): Record<string, string> {
  return {
    Host: XOYO_HOST,
    accept: 'application/json',
    deviceid: DEFAULT_DEVICE_ID,
    platform: 'android',
    gamename: 'jx3',
    fromsys: 'APP',
    clientkey: '1',
    'cache-control': 'no-cache',
    apiversion: '3',
    sign: 'true',
    'content-type': 'application/json',
    'accept-encoding': 'gzip',
    'user-agent': 'okhttp/3.12.2',
    token: DEFAULT_TOKEN,
  };
}

/** Generate UTC timestamp string YYYYMMDDHHmmssSSS. */
export function getts(): string {
  const d = new Date();
  const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${utc.getFullYear()}${pad(utc.getMonth() + 1)}${pad(utc.getDate())}` +
    `${pad(utc.getHours())}${pad(utc.getMinutes())}${pad(utc.getSeconds())}${pad(utc.getMilliseconds(), 3)}`
  );
}

/**
 * Compute the x-sk HMAC-SHA256 signature for a request body.
 * Equivalent to `signRequest()` in rank-update.ts.
 */
export function signRequest(body: unknown): string {
  const message = JSON.stringify(body) + SIGN_SALT;
  return crypto.createHmac('sha256', SIGN_KEY).update(message, 'utf8').digest('hex').toLowerCase();
}

/** Build the complete header set for a Xoyo request. */
export function buildHeaders(body: unknown): Record<string, string> {
  return { ...baseHeaders(), 'x-sk': signRequest(body) };
}
