/**
 * jx3.service.ts
 *
 * Business logic for the JX3 推栏号 lookup flow.
 *
 * Three-step Xoyo API chain (each step depends on the previous):
 *   1. POST /user/s/fetch-role-person  → search by 推栏号 (personNum)
 *   2. POST /user/home-page/multi-role → fetch grade / mmr / camp ...
 *   3. POST /badge/get-role-card-preset → fetch encrypted card-preset URL
 *
 * Step 3 is best-effort: failure does not invalidate steps 1-2.
 *
 * Grade mapping: "十五段" → 15 → RANK_TIERS.value "13-15".
 */

import { logger } from '../../shared/logger';
import {
  XOYO_HOST,
  buildHeaders,
  getts,
} from './xoyo-sign';
import {
  type Jx3Profile,
  type MultiRole,
  type RolePerson,
  type CardPreset,
  Jx3LookupError,
} from './jx3.types';
import { decryptCardUrl } from './card-crypto';
import { kungfuPinyinToName } from './xf-table';
import { db } from '../../config/database';
import { jx3Submissions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ── Chinese number parsing ────────────────────────────────────────────

const CN_DIGITS: Record<string, number> = {
  零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 两: 2,
};

/**
 * Parse a Chinese numeral substring into a number.
 * Supports: "一".."九", "十", "十一".."十九", "二十".."二十九", "三十"...
 *
 * @example parseChineseNumber('十五') === 15
 * @example parseChineseNumber('二十三') === 23
 */
function parseChineseNumber(s: string): number {
  if (!s) return 0;
  // Pure-digit fallback
  if (/^\d+$/.test(s)) return Number(s);

  if (s[0] === '十') {
    return 10 + (s.length > 1 ? (CN_DIGITS[s[1]] ?? 0) : 0);
  }
  const shiIdx = s.indexOf('十');
  if (shiIdx > 0) {
    const tens = CN_DIGITS[s[shiIdx - 1]] ?? 0;
    const ones = s.length > shiIdx + 1 ? (CN_DIGITS[s[shiIdx + 1]] ?? 0) : 0;
    return tens * 10 + ones;
  }
  return CN_DIGITS[s] ?? 0;
}

/** Extract the numeric grade from a Chinese string like "十五段". */
function extractGradeValue(gradeRaw: string): number {
  // Strip trailing "段" / "级" / whitespace
  const cleaned = gradeRaw.replace(/[段级\s]/g, '');
  const num = parseChineseNumber(cleaned);
  return num;
}

/**
 * Map a numeric grade to the seed's RANK_TIERS.value scheme.
 *   ≤12 → "13以下"
 *   13-15 → "13-15"
 *   ≥16 → "15+"
 */
function mapGradeToRankTier(gradeValue: number): string {
  if (gradeValue <= 12) return '13以下';
  if (gradeValue <= 15) return '13-15';
  return '15+';
}

// ── Upstream HTTP helpers ─────────────────────────────────────────────

interface XoyoEnvelope<T> {
  code: number;
  msg: string;
  tag?: string;
  data?: T;
}

async function postXoyo<T>(path: string, body: unknown): Promise<XoyoEnvelope<T>> {
  const bodyStr = JSON.stringify(body);
  const headers = buildHeaders(body);
  const url = `https://${XOYO_HOST}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: bodyStr,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Jx3LookupError(
      `Xoyo upstream ${path} returned HTTP ${res.status}`,
      'UPSTREAM_ERROR',
      { status: res.status, body: text.slice(0, 500) },
    );
  }
  try {
    return JSON.parse(text) as XoyoEnvelope<T>;
  } catch (err) {
    throw new Jx3LookupError(
      `Xoyo upstream ${path} returned non-JSON body`,
      'PARSE_ERROR',
      { body: text.slice(0, 500) },
    );
  }
}

// ── Step 1: fetch-role-person ─────────────────────────────────────────

async function fetchRolePerson(personNum: string): Promise<RolePerson> {
  const body = { query: personNum, pageSize: 10, PageIndex: 1, ts: getts() };
  const env = await postXoyo<RolePerson[]>('/user/s/fetch-role-person', body);
  if (env.code !== 0) {
    throw new Jx3LookupError(
      `fetch-role-person failed: ${env.msg}`,
      'UPSTREAM_ERROR',
      env,
    );
  }
  const list = env.data ?? [];
  if (list.length === 0) {
    throw new Jx3LookupError(
      `推栏号 ${personNum} 未找到对应玩家`,
      'NOT_FOUND',
    );
  }
  // Return the first match. Xoyo ES search is by personNum prefix,
  // so the exact match is typically first.
  return list[0];
}

// ── Step 2: home-page/multi-role ──────────────────────────────────────

async function fetchMultiRole(personId: string): Promise<MultiRole> {
  const body = { personId, ts: getts() };
  const env = await postXoyo<{ jx3: MultiRole }>('/user/home-page/multi-role', body);
  if (env.code !== 0 || !env.data?.jx3) {
    throw new Jx3LookupError(
      `multi-role failed: ${env.msg}`,
      'UPSTREAM_ERROR',
      env,
    );
  }
  return env.data.jx3;
}

// ── Step 3: get-role-card-preset (best-effort) ─────────────────────────

async function fetchCardPreset(
  gameGlobalRoleId: string,
  gameRoleId: string,
  zone: string,
  server: string,
): Promise<CardPreset | null> {
  const body = {
    game_global_role_id: gameGlobalRoleId,
    game_role_id: gameRoleId,
    zone,
    server,
    ts: getts(),
  };
  try {
    const env = await postXoyo<CardPreset>('/badge/get-role-card-preset', body);
    if (env.code !== 0 || !env.data) {
      logger.warn(
        { tag: 'jx3.service', msg: env.msg },
        'card-preset lookup returned non-zero code',
      );
      return null;
    }
    return env.data;
  } catch (err) {
    logger.warn(
      { tag: 'jx3.service', err: (err as Error).message },
      'card-preset lookup failed (best-effort)',
    );
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

function toNumber(raw: string | undefined | null, fallback = 0): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function stripPercent(raw: string | undefined | null): number {
  if (!raw) return 0;
  const n = Number(raw.replace('%', ''));
  return Number.isFinite(n) ? n : 0;
}

// ── Step 4: person-history (best-effort, for kungfu detection) ────────

/** A single match record from /mine/match/person-history. */
interface PersonHistoryItem {
  kungfu: string;
  start_time: number;
}

/**
 * Fetch the player's most recent match and extract the `kungfu` pinyin.
 *
 * The Xoyo multi-role API only returns the 门派 (force), not the specific
 * 心法. The `/mine/match/person-history` endpoint returns recent match
 * records, each carrying a `kungfu` pinyin field (e.g. "fenying") that
 * identifies the exact 心法 the player used in that match.
 *
 * Returns the resolved Chinese 心法名 (e.g. "焚影圣诀"), or '' when the
 * history is empty or the pinyin is unknown. Best-effort: errors are
 * swallowed so they never block the main lookup chain.
 */
async function fetchLatestXfName(personId: string): Promise<string> {
  const body = { person_id: personId, size: 1, cursor: 0, ts: getts() };
  try {
    const env = await postXoyo<PersonHistoryItem[]>(
      '/mine/match/person-history',
      body,
    );
    if (env.code !== 0 || !Array.isArray(env.data) || env.data.length === 0) {
      return '';
    }
    const kungfu = env.data[0]?.kungfu ?? '';
    return kungfuPinyinToName(kungfu);
  } catch (err) {
    logger.warn(
      { tag: 'jx3.service', err: (err as Error).message },
      'person-history lookup failed (best-effort)',
    );
    return '';
  }
}

// ── Public service entry ──────────────────────────────────────────────

/**
 * Look up a JX3 player profile by 推栏号.
 *
 * Runs the three-step Xoyo chain and aggregates the result into a flat
 * `Jx3Profile` object. The frontend writes these fields into the engine
 * variables; the engine then auto-skips scene nodes whose target variable
 * is already populated.
 *
 * @throws {@link Jx3LookupError} when the player is not found or the upstream
 *   is unreachable. Step 3 (card-preset) failure is swallowed.
 */
export async function lookupJx3Profile(tuilanId: string): Promise<Jx3Profile> {
  const trimmed = tuilanId.trim();
  if (!trimmed) {
    throw new Jx3LookupError('推栏号不能为空', 'NOT_FOUND');
  }

  logger.info({ tag: 'jx3.service', tuilanId: trimmed }, 'JX3 lookup start');

  // Step 1
  const person = await fetchRolePerson(trimmed);
  // Step 2
  const role = await fetchMultiRole(person.id);

  // Step 4 (best-effort) — fetch the player's latest 心法 from match history.
  // The multi-role API only returns the 门派; the history endpoint's
  // `kungfu` pinyin field identifies the exact 心法 (e.g. fenying → 焚影圣诀).
  const xfName = await fetchLatestXfName(person.id);

  // Step 3 (best-effort)
  let cardPresetUrl = '';
  if (role.gameGlobalRoleId && role.gameRoleId) {
    const preset = await fetchCardPreset(
      role.gameGlobalRoleId,
      role.gameRoleId,
      role.zone,
      role.server,
    );
    if (preset) {
      cardPresetUrl = preset.showCardPresetUrl;
      // Proactively download/cache the card image during lookup!
      try {
        await downloadCardImage(cardPresetUrl, trimmed);
      } catch (e) {
        logger.warn(
          { tag: 'jx3.service', tuilanId: trimmed, error: (e as Error).message },
          'Proactive card download failed during lookup',
        );
      }
    }
  }

  const gradeValue = extractGradeValue(role.grade);
  const rankTier = mapGradeToRankTier(gradeValue);

  const profile: Jx3Profile = {
    tuilanId: trimmed,
    personId: person.id,
    nickName: person.nickName,
    avatarUrl: person.avatarUrl,
    gameName: role.name ?? person.role.roleName,
    zone: role.zone ?? person.role.zone,
    server: role.server ?? person.role.server,
    force: role.force ?? person.role.force,
    forceId: role.forceId,
    bodyType: role.bodily ?? person.role.bodyType,
    gradeRaw: role.grade,
    gradeValue,
    rankTier,
    pvpType: role.pvpType,
    mmr: toNumber(role.mmr),
    winRate: stripPercent(role.winRate),
    totalCount: toNumber(role.totalCount),
    ranking: stripPercent(role.ranking),
    camp: role.camp,
    gameGlobalRoleId: role.gameGlobalRoleId,
    gameRoleId: role.gameRoleId,
    cardPresetUrl,
    xfName,
  };

  logger.info(
    {
      tag: 'jx3.service',
      tuilanId: trimmed,
      server: profile.server,
      force: profile.force,
      xfName: profile.xfName,
      grade: profile.gradeRaw,
      rankTier: profile.rankTier,
      hasPreset: !!cardPresetUrl,
    },
    'JX3 lookup success',
  );

  return profile;
}

// ── Card image download ──────────────────────────────────────────────

/**
 * Decrypt the card-preset ciphertext and download the image to local disk.
 *
 * The decrypted URL contains a time-limited `auth_key` (≈24h), so the image
 * must be downloaded immediately after decryption. The downloaded file is
 * cached at `uploads/jx3-cards/{tuilanId}.png`.
 *
 * @param cardPresetCiphertext - Base64 AES-128-CBC ciphertext.
 * @param tuilanId - Used as the filename.
 * @returns The local relative path (served via static file middleware),
 *   or empty string on failure.
 */
export async function downloadCardImage(
  cardPresetCiphertext: string,
  tuilanId: string,
): Promise<string> {
  if (!cardPresetCiphertext) return '';
  const imageUrl = decryptCardUrl(cardPresetCiphertext);
  if (!imageUrl) {
    logger.warn({ tag: 'jx3.service', tuilanId }, 'card URL decryption failed');
    return '';
  }
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      logger.warn(
        { tag: 'jx3.service', tuilanId, status: res.status },
        'card image download failed',
      );
      return '';
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const dir = join(env.STORAGE_LOCAL_ROOT, 'jx3-cards');
    await mkdir(dir, { recursive: true });
    const filename = `${tuilanId}.png`;
    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);
    logger.info(
      { tag: 'jx3.service', tuilanId, size: buffer.length },
      'card image downloaded',
    );
    return `/uploads/jx3-cards/${filename}`;
  } catch (err) {
    logger.warn(
      { tag: 'jx3.service', tuilanId, err: (err as Error).message },
      'card image download error',
    );
    return '';
  }
}

// ── Submission persistence ───────────────────────────────────────────

/**
 * Check whether a submission already exists for the given 推栏号.
 *
 * @returns The existing submission record, or null if none exists.
 */
export async function checkJx3Submission(
  tuilanId: string,
) {
  const rows = await db
    .select()
    .from(jx3Submissions)
    .where(eq(jx3Submissions.tuilanId, tuilanId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Save (or update) a completed JX3 social-card submission.
 *
 * Downloads the card image first, then upserts the submission record.
 *
 * @param tuilanId - 推栏号.
 * @param profile - Aggregated Xoyo profile (from lookup).
 * @param variables - Final engine variables at settlement time.
 * @param settlementResult - Settlement result object.
 * @returns The saved submission record.
 */
export async function saveJx3Submission(
  tuilanId: string,
  profile: Jx3Profile | null,
  variables: Record<string, unknown>,
  settlementResult: unknown,
) {
  // Download card image. Try profile first, then fall back to variables.
  let cardImagePath = '';
  const cardPresetCiphertext =
    profile?.cardPresetUrl || String(variables.card_preset_url ?? '');
  if (cardPresetCiphertext) {
    cardImagePath = await downloadCardImage(cardPresetCiphertext, tuilanId);
  }

  const existing = await checkJx3Submission(tuilanId);
  if (existing) {
    const [updated] = await db
      .update(jx3Submissions)
      .set({
        profile,
        variables,
        settlementResult,
        cardImagePath,
        updatedAt: new Date(),
      })
      .where(eq(jx3Submissions.tuilanId, tuilanId))
      .returning();
    logger.info(
      { tag: 'jx3.service', tuilanId, cardImagePath },
      'JX3 submission updated',
    );
    return updated;
  }

  const [created] = await db
    .insert(jx3Submissions)
    .values({
      tuilanId,
      personId: profile?.personId ?? null,
      profile,
      variables,
      settlementResult,
      cardImagePath,
    })
    .returning();
  logger.info(
    { tag: 'jx3.service', tuilanId, cardImagePath },
    'JX3 submission created',
  );
  return created;
}
