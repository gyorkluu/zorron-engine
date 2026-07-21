/**
 * jx3.types.ts
 *
 * Type definitions for the JX3 推栏号 lookup flow.
 *
 * Three-step Xoyo API chain:
 *   1. fetch-role-person — search by 推栏号 (personNum)
 *   2. home-page/multi-role — fetch grade / mmr / pvpType / camp ...
 *   3. get-role-card-preset — fetch encrypted card-preset URL
 */

/** Result of step 1: a single role-person entry. */
export interface RolePerson {
  /** Internal Xoyo personId (used as input for step 2). */
  id: string;
  nickName: string;
  /** 推栏号 (the user-facing numeric ID). */
  personNum: number;
  avatarUrl: string;
  medalUrl: string;
  status: string;
  type: string;
  introduce: string;
  role: {
    zone: string;
    server: string;
    /** 门派, e.g. "明教". */
    force: string;
    /** 体型, e.g. "萝莉". */
    bodyType: string;
    /** 游戏角色名 (in-game name). */
    roleName: string;
  };
}

/** Result of step 2: detailed JX3 role info. */
export interface MultiRole {
  bodily: string;
  camp: string;
  centerId: string;
  /** 门派名, e.g. "明教". */
  force: string;
  forceId: number;
  gameGlobalRoleId: string;
  gameName: string;
  gamePrivacy: string;
  gamePrivacyVisible: boolean;
  gameRoleId: string;
  /** 段位 (Chinese), e.g. "十五段". */
  grade: string;
  /** MMR (matchmaking rating), as string. */
  mmr: string;
  /** 游戏角色名. */
  name: string;
  personId: string;
  /** PVP type, e.g. "3v3". */
  pvpType: string;
  /** 排名百分比, e.g. "20%". */
  ranking: string;
  server: string;
  /** 总场次. */
  totalCount: string;
  /** 胜率, e.g. "48%". */
  winRate: string;
  zone: string;
}

/** Result of step 3: card-preset metadata. */
export interface CardPreset {
  praiseTotalCount: number;
  /** Encrypted card-preset URL (opaque string, used as-is). */
  showCardPresetUrl: string;
}

/**
 * Aggregated profile returned to the frontend.
 *
 * The frontend writes these into the engine's `variables` map; the engine
 * then auto-skips scene nodes whose target variable is already populated.
 */
export interface Jx3Profile {
  /** 推栏号. */
  tuilanId: string;
  /** Xoyo personId (internal). */
  personId: string;
  /** Display nickname from Xoyo. */
  nickName: string;
  /** Avatar URL (public CDN). */
  avatarUrl: string;
  /** 游戏角色名 (in-game display name). */
  gameName: string;
  /** 区, e.g. "电信区". */
  zone: string;
  /** 区服, e.g. "唯我独尊". */
  server: string;
  /** 门派, e.g. "明教" (mapped to scene_02 `mindset` variable). */
  force: string;
  /** force_id, e.g. 10. */
  forceId: number;
  /** 体型, e.g. "萝莉". */
  bodyType: string;
  /** 段位原始中文, e.g. "十五段". */
  gradeRaw: string;
  /** 段位数值, e.g. 15. 0 when parsing fails. */
  gradeValue: number;
  /** 段位分类 (matches seed RANK_TIERS.value): "13以下" | "13-15" | "15+". */
  rankTier: string;
  /** PVP type, e.g. "3v3". */
  pvpType: string;
  /** MMR 数值. */
  mmr: number;
  /** 胜率百分比数值, e.g. 48. */
  winRate: number;
  /** 总场次. */
  totalCount: number;
  /** 排名百分比数值, e.g. 20. */
  ranking: number;
  /** 阵营, e.g. "恶人谷". */
  camp: string;
  /** game_global_role_id (opaque). */
  gameGlobalRoleId: string;
  /** game_role_id (opaque). */
  gameRoleId: string;
  /** Encrypted card-preset URL (opaque). Empty when step 3 fails. */
  cardPresetUrl: string;
  /**
   * 心法中文名 (e.g. "焚影圣诀"), resolved from the player's most recent
   * match via `/mine/match/person-history`. Empty when the history is
   * empty or the kungfu pinyin is unknown.
   *
   * The multi-role API only returns the 门派 (`force`); the 心法 is more
   * specific (each 门派 has 1-2 心法). When this field is non-empty, the
   * frontend writes it into the `mindset` variable instead of `force`.
   */
  xfName: string;
}

/** Error wrapper — distinguishes "not found" from upstream errors. */
export class Jx3LookupError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'UPSTREAM_ERROR' | 'PARSE_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'Jx3LookupError';
  }
}
