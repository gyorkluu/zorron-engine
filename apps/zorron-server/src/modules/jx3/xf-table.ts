/**
 * xf-table.ts
 *
 * JX3 心法 (xf) lookup tables, distilled from three source files in the
 * jx3_pvp_analyzer data directory:
 *   - xfid.json     : mountKungfuId → 心法中文名
 *   - school.json   : 门派名 → { force_id, mounts[] }
 *   - relation.json : school_contains_mount / mount_belong_school
 *
 * Plus the kungfu-pinyin → 中文名 map, derived from the 推栏 React Native
 * bundle's `ALL_KUNGFUS` array (module 790). The `iconName` field in that
 * array is exactly the value the Xoyo `/mine/match/person-history` API
 * returns in its `kungfu` field (e.g. "fenying" → 焚影圣诀).
 *
 * Usage flow:
 *   1. Xoyo multi-role API returns `forceId` (门派 ID, e.g. 10 = 明教)
 *   2. `/mine/match/person-history` returns recent match records, each
 *      carrying a `kungfu` pinyin string (e.g. "fenying")
 *   3. `kungfuPinyinToName(kungfu)` resolves it to the Chinese 心法名
 */

/** forceId → 门派名 (from school.json force_id field). */
export const FORCE_ID_TO_NAME: Record<number, string> = {
  1: '少林',
  2: '万花',
  3: '天策',
  4: '纯阳',
  5: '七秀',
  6: '五毒',
  7: '唐门',
  8: '藏剑',
  9: '丐帮',
  10: '明教',
  21: '苍云',
  22: '长歌',
  23: '霸刀',
  24: '蓬莱',
  25: '凌雪',
  211: '衍天',
  212: '药宗',
  213: '刀宗',
  214: '万灵',
  215: '段氏',
  0: '无相',
};

/** forceId → 该门派下所有心法中文名列表 (from school.json mounts + xfid.json). */
export const FORCE_ID_TO_XF_NAMES: Record<number, string[]> = {
  1: ['易筋经', '洗髓经'],
  2: ['花间游', '离经易道'],
  3: ['傲血战意', '铁牢律'],
  4: ['紫霞功', '太虚剑意'],
  5: ['冰心诀', '云裳心经'],
  6: ['毒经', '补天诀'],
  7: ['惊羽诀', '天罗诡道'],
  8: ['问水诀', '山居剑意'],
  9: ['笑尘诀'],
  10: ['焚影圣诀', '明尊琉璃体'],
  21: ['铁骨衣', '分山劲'],
  22: ['莫问', '相知'],
  23: ['北傲诀'],
  24: ['凌海诀'],
  25: ['隐龙诀'],
  211: ['太玄经'],
  212: ['无方', '灵素'],
  213: ['孤锋诀'],
  214: ['山海心诀'],
  215: ['周天功'],
  0: ['幽罗引'],
};

/**
 * kungfu 拼音 (person-history `kungfu` field / bundle `iconName`) → 心法中文名.
 *
 * Derived from 推栏 bundle ALL_KUNGFUS (module 790). Some bundle entries
 * have a pinyin `name` field (newer schools); for those the Chinese name
 * is resolved via xfid.json by id.
 */
export const KUNGFU_PINYIN_TO_NAME: Record<string, string> = {
  yijin: '易筋经',
  xisui: '洗髓经',
  huajian: '花间游',
  lijing: '离经易道',
  aoxue: '傲血战意',
  tielao: '铁牢律',
  zixia: '紫霞功',
  taixu: '太虚剑意',
  yunshang: '云裳心经',
  bingxin: '冰心诀',
  dujing: '毒经',
  butian: '补天诀',
  jingyu: '惊羽诀',
  tianluo: '天罗诡道',
  wenshui: '问水诀',
  shanju: '山居剑意',
  xiaochen: '笑尘诀',
  mingzun: '明尊琉璃体',
  fenying: '焚影圣诀',
  tiegu: '铁骨衣',
  fenshan: '分山劲',
  mowen: '莫问',
  xiangzhi: '相知',
  beiao: '北傲诀',
  linghai: '凌海诀',
  yinlong: '隐龙诀',
  taixuan: '太玄经',
  lingsu: '灵素',
  wufang: '无方',
  gufeng: '孤锋诀',
  shanhai: '山海心诀',
  shanhaixinjue: '山海心诀',
  zhoutian: '周天功',
  zhoutiangong: '周天功',
  youluo: '幽罗引',
  youluoyin: '幽罗引',
};

/**
 * Resolve a kungfu pinyin (from person-history `kungfu` field) to the
 * Chinese 心法名. Returns '' when the pinyin is unknown.
 */
export function kungfuPinyinToName(pinyin: string): string {
  if (!pinyin) return '';
  return KUNGFU_PINYIN_TO_NAME[pinyin] ?? '';
}

/**
 * Get the list of 心法中文名 for a given forceId.
 * Returns [] when the forceId is unknown.
 */
export function forceIdToXfNames(forceId: number): string[] {
  return FORCE_ID_TO_XF_NAMES[forceId] ?? [];
}

/**
 * Whether a 门派 has exactly one 心法 (so it can be auto-filled without
 * asking the player).
 */
export function isSingleXfSchool(forceId: number): boolean {
  return (FORCE_ID_TO_XF_NAMES[forceId]?.length ?? 0) === 1;
}
