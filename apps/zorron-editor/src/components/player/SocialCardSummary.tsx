/**
 * SocialCardSummary - JX3 Mohe-style social card (魔盒自介卡) in horizontal layout.
 * Recreated to match the reference image exactly, featuring dynamic JX3 school themes and local icons.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Variables } from '@/types/flow';
import { getCardImage, generateJudgment } from '@/services/jx3.service';
import { usePlayerStore } from '@/stores/playerStore';
import cdnMapping from '@/assets/cdn-mapping.json';

// JX3 Mindset (心法) to School (门派) Mapping
const XF_TO_FORCE: Record<string, string> = {
  '易筋经': '少林', '洗髓经': '少林',
  '花间游': '万花', '离经易道': '万花',
  '傲血战意': '天策', '铁牢律': '天策',
  '紫霞功': '纯阳', '太虚剑意': '纯阳',
  '冰心诀': '七秀', '云裳心经': '七秀',
  '毒经': '五毒', '补天诀': '五毒',
  '惊羽诀': '唐门', '天罗诡道': '唐门',
  '问水诀': '藏剑', '山居剑意': '藏剑',
  '笑尘诀': '丐帮',
  '焚影圣诀': '明教', '明尊琉璃体': '明教',
  '铁骨衣': '苍云', '分山劲': '苍云',
  '莫问': '长歌', '相知': '长歌',
  '北傲诀': '霸刀',
  '凌海诀': '蓬莱',
  '隐龙诀': '凌雪',
  '太玄经': '衍天',
  '无方': '药宗', '灵素': '药宗',
  '孤锋诀': '刀宗',
  '山海心诀': '万灵',
  '周天功': '段氏',
  '幽罗引': '无相',
};

// JX3 Mindset (心法) to core Pinyin (lowercase) for the vertical card decoration.
// Takes the core two characters of each mindset name (dropping common suffixes
// like 诀/经/功/道/意/体/衣/律/引/游) and renders them in pinyin. E.g. 焚影圣诀 → fenying.
const XF_TO_PINYIN: Record<string, string> = {
  '易筋经': 'yijin',
  '洗髓经': 'xisui',
  '花间游': 'huajian',
  '离经易道': 'lijing',
  '傲血战意': 'aoxue',
  '铁牢律': 'tielao',
  '紫霞功': 'zixia',
  '太虚剑意': 'taixu',
  '冰心诀': 'bingxin',
  '云裳心经': 'yunshang',
  '毒经': 'dujing',
  '补天诀': 'butian',
  '惊羽诀': 'jingyu',
  '天罗诡道': 'tianluo',
  '问水诀': 'wenshui',
  '山居剑意': 'shanju',
  '笑尘诀': 'xiaochen',
  '焚影圣诀': 'fenying',
  '明尊琉璃体': 'mingzun',
  '铁骨衣': 'tiegu',
  '分山劲': 'fenshan',
  '莫问': 'mowen',
  '相知': 'xiangzhi',
  '北傲诀': 'beiao',
  '凌海诀': 'linghai',
  '隐龙诀': 'yinlong',
  '太玄经': 'taixuan',
  '无方': 'wufang',
  '灵素': 'lingsu',
  '孤锋诀': 'gufeng',
  '山海心诀': 'shanhai',
  '周天功': 'zhoutian',
  '幽罗引': 'youluo',
};

// School name to sect ID mapping in files
const FORCE_NAME_TO_SECT_ID: Record<string, string> = {
  '少林': 'shaolin',
  '万花': 'wanhua',
  '天策': 'tiance',
  '纯阳': 'chunyang',
  '七秀': 'qixiu',
  '五毒': 'wudu',
  '唐门': 'tangmen',
  '藏剑': 'cangjian',
  '丐帮': 'gaibang',
  '明教': 'mingjiao',
  '苍云': 'cangyun',
  '长歌': 'changge',
  '霸刀': 'badao',
  '蓬莱': 'penglai',
  '凌雪': 'lingxue',
  '衍天': 'yantian',
  '药宗': 'yaozong',
  '刀宗': 'daozong',
  '万灵': 'wanling',
  '段氏': 'duanshi',
};

// JX3 Mindset Chinese Name to Local Mindset Icon ID
const XF_NAME_TO_ID: Record<string, number> = {
  '冰心诀': 10081,
  '云裳心经': 10080,
  '花间游': 10021,
  '离经易道': 10028,
  '毒经': 10175,
  '补天诀': 10176,
  '莫问': 10447,
  '相知': 10448,
  '傲血战意': 10026,
  '铁牢律': 10062,
  '易筋经': 10003,
  '洗髓经': 10002,
  '焚影圣诀': 10242,
  '明尊琉璃体': 10243,
  '分山劲': 10390,
  '铁骨衣': 10389,
  '紫霞功': 10014,
  '太虚剑意': 10015,
  '天罗诡道': 10225,
  '惊羽诀': 10224,
  '问水诀': 10144,
  '山居剑意': 10145,
  '笑尘诀': 10268,
  '北傲诀': 10464,
  '凌海诀': 10533,
  '隐龙诀': 10585,
  '太玄经': 10615,
  '无方': 10627,
  '灵素': 10626,
  '孤锋诀': 10698,
  '山海心诀': 10756,
  '周天功': 10786,
  '幽罗引': 10821,
};

// Traditional/Roleplay style quotes for each school
const SECT_QUOTES: Record<string, string> = {
  '少林': '古刹梵音度红尘，晨钟暮鼓尽归真。',
  '万花': '妙手仁心济苍生，只笑桃源非梦乡。',
  '天策': '长枪独守大唐魂，誓洒热血卫乾坤。',
  '纯阳': '昆仑御剑乘风去，坐忘太虚问道心。',
  '七秀': '西子湖畔动八方，一舞霓裳动名扬。',
  '五毒': '千蝶吐瑞济深海，百蛊娆娇笑九幽。',
  '唐门': '蜀中乾坤千机变，暴雨飞星绝影寒。',
  '藏剑': '秀水君子意如风，西子西湖藏剑锋。',
  '丐帮': '逍遥江湖一壶酒，醉卧风云笑王侯。',
  '明教': '光明之火耀大荒，生死交叠誓昭昭。',
  '苍云': '玄甲映日守坚城，铁骨血战照丹青。',
  '长歌': '儒门雅意莫相问，弦歌一曲震朝野。',
  '霸刀': '北地傲骨斩红尘，金戈铁马敬死生。',
  '蓬莱': '方外世外逍遥仙，玉伞凌波御风还。',
  '凌雪': '风雪夜归未悔迟，隐龙出鞘血满衣。',
  '衍天': '星运流转算乾坤，算尽天机世外人。',
  '药宗': '神农百草施妙手，敢试生死济苍生。',
  '刀宗': '寒山立马求一败，孤锋划破天地间。',
  '万灵': '乘风御兽走山川，山海相伴乐无边。',
  '段氏': '一指乾坤定波澜，世家风雅掌狂澜。',
};

// English couplet for each school — paired with SECT_QUOTES for the top decorative text.
// 设计原则：与中文诗句意境呼应，两行（用 \n 分隔），文言/诗意英文风格。
// 缺失门派时回退到 '江湖'（保留原版论语英译作为兜底文案）。
const SECT_EN_QUOTES: Record<string, string> = {
  '少林': 'In silence, the bell hears all.\nDust returns to dust; truth to truth.',
  '万花': 'Healing hands and quiet hearts.\nWhere kindness walks, paradise blooms.',
  '天策': 'One lance, one oath, one empire.\nAgainst the dying light, we stand.',
  '纯阳': 'Wind bears the sword; the void bears the question.\nSit, forget, and ask the heart.',
  '七秀': 'A single dance on West Lake.\nAnd the world leans in to listen.',
  '五毒': 'A thousand butterflies mend the sea.\nA hundred venoms laugh at the dark.',
  '唐门': "In Shu's rains, a thousand gears turn.\nThe flying star finds its mark.",
  '藏剑': 'Wind moves the gentleman.\nThe lake hides the blade beneath the lily.',
  '丐帮': 'One gourd, one sword, one laughing wind.\nThe world is my tavern.',
  '明教': 'Where light fades, faith remains.\nIn fire, the oath is written twice.',
  '苍云': 'Black iron at dawn, blood oath at dusk.\nThe wall does not fall.',
  '长歌': 'One string, one song.\nAnd the court falls silent to listen.',
  '霸刀': 'Northern-born, proud of bone.\nThe blade bows only to the falling foe.',
  '蓬莱': 'Beyond the world, beyond the wind.\nA jade umbrella rides the tide home.',
  '凌雪': 'Through snow and night, late but unrepentant.\nThe hidden blade is drawn.',
  '衍天': 'Stars turn, heaven turns.\nThe watcher stands outside the wheel.',
  '药宗': 'A hundred herbs, a steady hand.\nDeath itself must wait its turn.',
  '刀宗': 'On cold hills, seeking one defeat.\nThe lone edge splits the sky.',
  '万灵': 'Wind and beast, mountain and river.\nThe wild is my only home.',
  '段氏': 'One finger stills the storm.\nThe old house bends no knee to chaos.',
  '无相': 'Form is emptiness, the fist remains.\nThe vow outlives the name.',
  // 兜底：保留原版论语英译（"从心所欲不逾矩"），用于 '江湖' 或未识别门派。
  '江湖': "Only the best can follow one's inclinations.\nThis is the best state of life.",
};

// School Theme Definitions based on the prompt document
interface SchoolTheme {
  primary: string;
  textAccent: string;
  bg: string;
}

const SCHOOL_THEMES: Record<string, SchoolTheme> = {
  '江湖': {
    primary: '#6b7280',
    textAccent: '#374151',
    bg: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
  },
  '少林': {
    primary: '#FFB25F',
    textAccent: '#b45309',
    bg: 'linear-gradient(135deg, #fefaf0 0%, #faecd8 100%)',
  },
  '万花': {
    primary: '#C498FF',
    textAccent: '#7e22ce',
    bg: 'linear-gradient(135deg, #faf5ff 0%, #eedeff 100%)',
  },
  '天策': {
    primary: '#FF6F53',
    textAccent: '#b91c1c',
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  },
  '纯阳': {
    primary: '#16D8D8',
    textAccent: '#0369a1',
    bg: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
  },
  '七秀': {
    primary: '#FF81B0',
    textAccent: '#be185d',
    bg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
  },
  '五毒': {
    primary: '#3793FF',
    textAccent: '#1d4ed8',
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  },
  '唐门': {
    primary: '#79B736',
    textAccent: '#4d7c0f',
    bg: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 100%)',
  },
  '藏剑': {
    primary: '#D6F95D',
    textAccent: '#a16207',
    bg: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
  },
  '丐帮': {
    primary: '#CD853F',
    textAccent: '#854d0e',
    bg: 'linear-gradient(135deg, #fefaf0 0%, #fef3c7 100%)',
  },
  '明教': {
    primary: '#F04660',
    textAccent: '#be123c',
    bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
  },
  '长歌': {
    primary: '#64FAB4',
    textAccent: '#047857',
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  },
  '霸刀': {
    primary: '#6A6CBD',
    textAccent: '#4338ca',
    bg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
  },
  '蓬莱': {
    primary: '#ABE3FA',
    textAccent: '#0369a1',
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  },
  '衍天': {
    primary: '#A653FB',
    textAccent: '#5b21b6',
    bg: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
  },
  '药宗': {
    primary: '#00AC99',
    textAccent: '#0f766e',
    bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
  },
  '刀宗': {
    primary: '#6BB7F2',
    textAccent: '#0284c7',
    bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
  },
  '段氏': {
    primary: '#8FA3A8',
    textAccent: '#475569',
    bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  },
  '苍云': {
    primary: '#FF8F50',
    textAccent: '#c2410c',
    bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
  },
  '凌雪': {
    primary: '#FD5656',
    textAccent: '#7f1d1d',
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  },
  '万灵': {
    primary: '#EBD773',
    textAccent: '#a16207',
    bg: 'linear-gradient(135deg, #fefdf0 0%, #fef9c3 100%)',
  },
  '无相': {
    primary: '#FFB25F',
    textAccent: '#b45309',
    bg: 'linear-gradient(135deg, #fefaf0 0%, #faecd8 100%)',
  },
};

// Dynamic Game View descriptions based on score
function getGameViewDesc(score: number): string {
  if (score <= 5) {
    return '佛系外交官，情绪价值拉满但战斗意志薄弱，容易被欺负还主动揽锅，适合配暴躁队友平衡。';
  }
  if (score <= 15) {
    return '温和守护者，融入团队且配合默契，但在关键博弈中缺乏决断力，适合与有主见的主力队友搭档。';
  }
  return '热血战斗狂，好胜心极强且执行力拉满，容忍度较低容易上头，适合配善于安抚的佛系队友平衡。';
}

function getRankTierLabel(tier: string): string {
  switch (tier) {
    case '13以下': return '13以下';
    case '13-15': return '13-15';
    case '15+': return '15+';
    default: return tier;
  }
}

function getChineseRank(gradeValue: number): string {
  const cnNums = ['', '初段', '二段', '三段', '四段', '五段', '六段', '七段', '八段', '九段', '十段', '十一段', '十二段', '十三段', '十四段', '十五段', '十六段', '十七段', '十八段'];
  if (gradeValue >= 1 && gradeValue <= 18) {
    return cnNums[gradeValue];
  }
  return '';
}

function getRankFromMmr(mmr: number): string {
  if (mmr >= 2900) return '十八段';
  if (mmr >= 2750) return '十七段';
  if (mmr >= 2600) return '十六段';
  if (mmr >= 2400) return '十五段';
  if (mmr >= 2200) return '十四段';
  if (mmr >= 2000) return '十三段';
  if (mmr >= 1800) return '十二段';
  if (mmr >= 1600) return '十一段';
  if (mmr >= 1400) return '十段';
  if (mmr >= 1200) return '九段';
  if (mmr >= 1000) return '八段';
  if (mmr >= 800) return '七段';
  if (mmr >= 600) return '六段';
  if (mmr >= 400) return '五段';
  if (mmr >= 200) return '四段';
  return '三段以下';
}

export interface SocialCardSummaryProps {
  variables: Variables;
}

function SocialCardSummaryImpl({ variables }: SocialCardSummaryProps) {
  const v = variables;
  const mbti = String(v.mbti ?? '');
  const gameViewScore = Number(v.game_view_score ?? 0);
  const tuilanId = String(v.tuilan_id ?? '').trim();

  // Fetch the custom tuilan role card image if available
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [cardImageLoading, setCardImageLoading] = useState(false);

  useEffect(() => {
    if (!tuilanId) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const attempts = { current: 0 };
    const load = async () => {
      setCardImageLoading(true);
      try {
        const result = await getCardImage(tuilanId);
        if (!cancelled) {
          setCardImageUrl(result.cardImageUrl);
          setCardImageLoading(false);
        }
      } catch {
        if (cancelled) return;
        if (attempts.current < 3) {
          attempts.current += 1;
          retryTimer = setTimeout(load, 1500);
        } else {
          setCardImageLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [tuilanId]);

  // Resolve school/sect and sprite
  const forceName = useMemo(() => {
    const primary = String(v.mindset ?? '').trim();
    return primary ? (XF_TO_FORCE[primary] || '江湖') : '江湖';
  }, [v.mindset]);

  const spriteUrl = useMemo(() => {
    const sectId = FORCE_NAME_TO_SECT_ID[forceName];
    if (!sectId) return undefined;
    const key = `${sectId} - 已编辑.png` as keyof typeof cdnMapping;
    return cdnMapping[key] || `/workspace/sprite/${sectId} - 已编辑.png`;
  }, [forceName]);

  // Get the theme parameters based on school
  const theme = useMemo(() => {
    return SCHOOL_THEMES[forceName] || SCHOOL_THEMES['江湖'];
  }, [forceName]);

  // 推栏是否未能获取到有效角色信息。
  // playerStore 在 isProfileEffective=false 时会强制把 rank_tier 置为 '未知'，
  // 因此这里通过 rank_tier === '未知' 即可识别"推栏无效"场景。
  const isTuilanProfileInvalid = useMemo(() => {
    return String(v.rank_tier ?? '').trim() === '未知';
  }, [v.rank_tier]);

  // Card-photo signature: lowercase pinyin of the player's primary 心法 with
  // the first letter capitalized (e.g. 焚影圣诀 → Fenying).
  //
  // 兜底策略：若玩家有心法（推栏返回或手选），用对应 pinyin；
  //   否则一律默认 'Daxia'（大侠，江湖通用身份）。
  const cardPhotoName = useMemo(() => {
    const mindset = String(v.mindset ?? '').trim();
    const pinyin = mindset ? (XF_TO_PINYIN[mindset] || '') : '';
    if (pinyin) {
      return pinyin.charAt(0).toUpperCase() + pinyin.slice(1);
    }
    return 'Daxia';
  }, [v.mindset]);

  // Main picture shown in polaroid (role card or beautiful sect illustration).
  //
  // 推栏无效时，不使用推栏下载的角色名片图（即便缓存里有也不用），
  // 改用门派立绘 spriteUrl —— 既符合"无有效角色信息"的语义，又能保持视觉一致性。
  const portraitUrl = useMemo(() => {
    if (isTuilanProfileInvalid) {
      return spriteUrl || '/workspace/sprite/luyaner - 已编辑.png';
    }
    return cardImageUrl || spriteUrl || '/workspace/sprite/luyaner - 已编辑.png';
  }, [isTuilanProfileInvalid, cardImageUrl, spriteUrl]);

  // Traditional quote below Polaroid photo.
  //
  // 优先级：玩家在 Node 21 输入的个性签名 > 门派经典诗句 > 兜底文案。
  // 这样玩家填写的签名会直接展示在名片左下角，而不是被门派诗句覆盖。
  const quoteText = useMemo(() => {
    const sig = String(v.signature ?? '').trim();
    if (sig) return sig;
    return SECT_QUOTES[forceName] || '路遥知马力，日久见人心。';
  }, [v.signature, forceName]);

  // Top decorative English couplet — paired with the school theme.
  // 按当前门派从 SECT_EN_QUOTES 取对应英文双行诗句，未识别时回退到 '江湖' 兜底
  // （即原版论语英译"从心所欲不逾矩"）。返回 [line1, line2] 数组方便分两行渲染。
  const [quoteEnLine1, quoteEnLine2] = useMemo(() => {
    const raw = SECT_EN_QUOTES[forceName] || SECT_EN_QUOTES['江湖'];
    const [l1, ...rest] = raw.split('\n');
    return [l1 || '', rest[0] ?? ''];
  }, [forceName]);

  // Resolve mindsets to display.
  //
  // 完全根据玩家选择展示，不强制补齐到固定数量：
  //   - 第一个位置：主玩心法 (v.mindset)，玩家在 scene_02 选择，
  //     或由 tuilan 后台返回 xfName 自动填充。
  //   - 后续位置：玩家在 Node 20 multi-select 选择的常用心法 (v.favorite_xinfas,
  //     逗号分隔) 按顺序追加（与主玩心法去重）。
  //
  // 不再用同门派心法或兜底心法补齐到 3 个 —— 用户选几个就显示几个。
  // 上限 5 个（与 node_20 multi-select 的 maxSelected 一致），防止 UI 溢出。
  const displayMindsets = useMemo(() => {
    const primary = String(v.mindset ?? '').trim();
    const list: string[] = [];
    if (primary) list.push(primary);

    // 常用心法：玩家在 Node 20 multi-select 中选择的心法列表。
    const favoriteRaw = String(v.favorite_xinfas ?? '').trim();
    if (favoriteRaw) {
      favoriteRaw.split(',').map((s) => s.trim()).filter(Boolean).forEach((xf) => {
        if (!list.includes(xf)) list.push(xf);
      });
    }

    // 上限 5 个，与 multi-select maxSelected 对齐。
    return list.slice(0, 5);
  }, [v.mindset, v.favorite_xinfas]);

  // Resolve mindset icon URLs (Local files)
  const mindsetIcons = useMemo(() => {
    return displayMindsets.map((xf) => {
      const id = XF_NAME_TO_ID[xf];
      return id ? `/workspace/xf/${id}.png` : '';
    }).filter(Boolean);
  }, [displayMindsets]);

  // Information strings
  const roleName = String(v.role_name ?? v.nickname ?? v.nickName ?? v.name ?? '青春染指流年');
  const mbtiText = mbti || 'ENFP';
  const genderText = String(v.gender ?? '女');
  const zodiacText = String(v.zodiac ?? '天蝎座');
  const serverText = String(v.server ?? '唯我独尊');
  const bodyTypeText = String(v.body_type ?? '成女');
  const rankTierText = useMemo(() => {
    // 推栏无法获取有效角色信息时，playerStore 会强制把 rank_tier 置为 '未知'。
    // 此时直接展示"未知段位"，不再尝试用 grade_value / mmr 推算具体段位。
    const tierRaw = String(v.rank_tier ?? '').trim();
    if (tierRaw === '未知' || !tierRaw) {
      return '未知段位';
    }
    const gVal = Number(v.grade_value ?? 0);
    if (gVal > 0) {
      const cnRank = getChineseRank(gVal);
      if (cnRank) return cnRank;
    }
    const mmrVal = Number(v.mmr ?? 0);
    if (mmrVal > 0) {
      return getRankFromMmr(mmrVal);
    }
    return getRankTierLabel(tierRaw);
  }, [v.grade_value, v.mmr, v.rank_tier]);

  // 在线时间：玩家在 scene_09b 节点选择（白天 / 晚上 / 周末）。
  const onlineTimeText = useMemo(() => {
    const t = String(v.online_time ?? '').trim();
    return t || '保密';
  }, [v.online_time]);

  // 入坑年份：node_22 number-picker 写入的具体年份（2008-2024）。
  // 改为展示原始年份而非"入坑 N 年"，便于玩家直观识别同代玩家。
  // join_year 缺失或非法时回退为"保密"，与卡片其它行的兜底文案保持一致。
  const joinYearText = useMemo(() => {
    const joinYear = Number(v.join_year ?? 0);
    if (!joinYear || joinYear <= 0) return '保密';
    return `${joinYear}年`;
  }, [v.join_year]);

  // 兴趣标签：玩家在 Node 15 multi-select 中选择的兴趣（逗号分隔字符串）。
  // 例如：'竞技场,吃鸡,截图' → ['竞技场', '吃鸡', '截图']
  const interestTags = useMemo(() => {
    const raw = String(v.interests ?? '').trim();
    if (!raw) return [] as string[];
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [v.interests]);

  // Game view text — 优先调用 AI 生成判语，加载中显示提示文案，
  // 失败/超时回退到 getGameViewDesc 固定文案兜底（确保卡片始终有内容）。
  const fallbackGameViewText = getGameViewDesc(gameViewScore);
  const [gameViewText, setGameViewText] = useState<string>(fallbackGameViewText);
  const [judgmentLoading, setJudgmentLoading] = useState(false);

  // 从 playerStore 读取预取的 AI 判词缓存。
  // playerStore 在 MBTI 选完 (scene_16) 后立即异步调用 generateJudgment 预生成判词，
  // settlement 阶段这里直接读取，无需用户等待。
  const prefetchedJudgment = usePlayerStore((s) => s.prefetchedJudgment);
  const isPrefetchingJudgment = usePlayerStore((s) => s.isPrefetchingJudgment);
  // 写入最终判词到 playerStore —— SettlementStage 监听 judgmentFinalized 后提交。
  const setFinalJudgment = usePlayerStore((s) => s.setFinalJudgment);

  useEffect(() => {
    // 5 题选项字母数组 (gv_choice_1~5)，从 variables 中读取
    const choices = [
      String(v.gv_choice_1 ?? ''),
      String(v.gv_choice_2 ?? ''),
      String(v.gv_choice_3 ?? ''),
      String(v.gv_choice_4 ?? ''),
      String(v.gv_choice_5 ?? ''),
    ].filter((c) => c); // 过滤空值

    const mbti = String(v.mbti ?? '').trim();

    // 若没有任何选项数据，直接使用兜底文案，不调用 AI
    // 同时把 finalJudgment 标记为 null（后端存 NULL），并通知 SettlementStage 可以提交
    if (choices.length === 0) {
      setGameViewText(fallbackGameViewText);
      setFinalJudgment(null);
      return;
    }

    const choicesHash = choices.join('|');

    // ── 缓存命中：直接使用预取结果，不再调用 AI ──
    if (
      prefetchedJudgment &&
      prefetchedJudgment.mbti === mbti &&
      prefetchedJudgment.choicesHash === choicesHash
    ) {
      setJudgmentLoading(false);
      const text = prefetchedJudgment.text || fallbackGameViewText;
      setGameViewText(text);
      // 写入最终判词，让 SettlementStage 提交到后端持久化
      // （confirmModify 场景下 finalJudgment 已是同值，setFinalJudgment 是幂等的）
      setFinalJudgment(text);
      return;
    }

    // ── 预取进行中：显示占位文案，等待预取完成（由 zustand 触发重渲染）──
    // 避免在此重复触发 AI 调用
    // 不调用 setFinalJudgment —— 保持 judgmentFinalized=false，让 SettlementStage 等待
    if (isPrefetchingJudgment) {
      setJudgmentLoading(true);
      setGameViewText('正在生成专属判语...');
      return;
    }

    // ── 兜底：预取未触发 / 失败 / mbti+choices 不匹配 —— 走原同步调用 ──
    let cancelled = false;
    setJudgmentLoading(true);
    setGameViewText('正在生成专属判语...');

    generateJudgment(mbti, choices)
      .then((res) => {
        if (cancelled) return;
        const text = res.judgment || fallbackGameViewText;
        setGameViewText(text);
        // 同步调用成功 —— 写入最终判词触发 SettlementStage 提交
        setFinalJudgment(text);
      })
      .catch(() => {
        if (cancelled) return;
        // AI 失败兜底：使用基于分数的固定文案
        setGameViewText(fallbackGameViewText);
        // AI 失败 —— 标记为 null（后端存 NULL），允许 SettlementStage 提交
        setFinalJudgment(null);
      })
      .finally(() => {
        if (cancelled) return;
        setJudgmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // 依赖：5 题选项 + mbti + 分数 + 预取缓存（任一变化时重新生成）
    // setFinalJudgment 是 zustand 的稳定函数引用，无需加入依赖
  }, [
    v.gv_choice_1,
    v.gv_choice_2,
    v.gv_choice_3,
    v.gv_choice_4,
    v.gv_choice_5,
    v.mbti,
    fallbackGameViewText,
    prefetchedJudgment,
    isPrefetchingJudgment,
    setFinalJudgment,
  ]);

  const roleNameFontSize = roleName.length > 8 ? 42 : roleName.length > 6 ? 48 : 54;
  const mobileRoleNameFontSize = roleName.length > 8 ? 20 : roleName.length > 6 ? 22 : 28;

  // Keep the desktop card's export dimensions while adapting its preview to
  // both the available width and height. Mobile uses a dedicated readable layout.
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;
      const mobile = parentWidth < 640;
      setIsMobile(mobile);
      if (mobile) {
        setScale(1);
        return;
      }
      const targetWidth = 960;
      const targetHeight = 540;
      const availableWidth = parentWidth - 32;
      const availableHeight = parentHeight - 126;
      setScale(Math.max(0.6, Math.min(1.15, availableWidth / targetWidth, availableHeight / targetHeight)));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const parent = containerRef.current?.parentElement;
    const resizeObserver = parent ? new ResizeObserver(handleResize) : null;
    if (parent) resizeObserver?.observe(parent);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, []);

  if (isMobile) {
    return (
      <div ref={containerRef} className="w-full px-4">
        <article
          className="relative mx-auto w-full max-w-[420px] select-none overflow-hidden rounded-[8px] bg-[#f7f6f6] text-[#0f0d0e] shadow-[0_18px_45px_rgba(0,0,0,0.24)]"
          style={{ fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif' }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @font-face {
              font-family: 'XiangcuiDengcusong';
              src: url('/font/XiangcuiDengcusong.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
          ` }} />

          <div className="absolute inset-[10px] border border-[#bda9ad]/20 pointer-events-none" />
          {spriteUrl && (
            <img
              src={spriteUrl}
              alt=""
              className="absolute -right-16 bottom-0 h-[350px] w-[350px] scale-x-[-1] object-contain object-bottom opacity-[0.07] pointer-events-none"
            />
          )}

          <header className="relative flex h-[68px] items-start justify-between px-5 pt-3">
            <div className="flex gap-5 text-[18px] font-light text-[#bda9ad]/30"><span>+</span><span>+</span><span>+</span></div>
            <div className="text-right">
              <div className="text-[11px] tracking-[2px] text-[#bda9ad]/60">剑网3魔盒自介卡</div>
              <div className="mt-1 text-[10px] leading-[1.05] text-black/30" style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive', transform: 'rotate(-2deg)' }}>
                <div>{quoteEnLine1}</div>
                <div>{quoteEnLine2}</div>
              </div>
            </div>
          </header>

          <div className="relative mx-5 grid grid-cols-[38%_1fr] gap-4">
            <div className="relative pb-3">
              <div className="absolute -left-1 top-2 h-[218px] w-full rotate-[-4deg] bg-[#ded9da]" />
              <div className="relative bg-white p-2 shadow-[0_10px_24px_rgba(40,28,31,0.1)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#ebe8e9]">
                  <img src={portraitUrl} alt="角色照片" className="h-full w-full object-cover" style={{ objectPosition: 'center top', filter: 'saturate(0.82) contrast(0.96) brightness(1.04)' }} />
                  {cardImageLoading && <div className="absolute inset-0 flex items-center justify-center bg-white/45 text-xs text-gray-500 animate-pulse">加载中...</div>}
                  <div className="absolute left-3 top-2 text-[25px] leading-none text-[#3c3839]/80" style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive', transform: 'rotate(-8deg)' }}>{cardPhotoName}</div>
                </div>
                <div className="flex min-h-[38px] items-center justify-center px-1 py-2 text-center text-[10px] leading-[1.35] tracking-[1px] text-[#262224]">{quoteText}</div>
              </div>
              <button
                type="button"
                onClick={() => { try { window.dispatchEvent(new CustomEvent('mate-card:start-match')); } catch { /* no-op */ } }}
                className="match-trigger group absolute -right-3 bottom-0 overflow-hidden border border-[#d8ccce] bg-white/95 px-3 py-1.5 text-[11px] tracking-[1px] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#bda9ad] hover:shadow-[0_8px_20px_rgba(54,38,42,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bda9ad]/60"
                aria-label="开始匹配"
              >
                <span className="relative z-10 flex items-center gap-1 transition-colors duration-300 group-hover:text-[#3c3839]">
                  <span>开始匹配</span>
                  <svg
                    className="match-arrow h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </span>
                <span
                  className="match-shine pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#bda9ad]/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="relative min-w-0 pt-2">
              <div className="absolute -left-2 top-1 flex flex-col items-center text-[27px] leading-[0.9] text-[#777]/15 pointer-events-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {'JX3BOX'.split('').map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
              </div>
              <div className="relative z-10">
                <h1 className="whitespace-nowrap font-black leading-[1.05]" style={{ fontSize: `${mobileRoleNameFontSize}px` }}>{roleName}</h1>
                <div className="mt-4 border-l-[4px] border-[#e4dfe0] pl-3 text-[13px] font-bold leading-[1.55]">
                  <div>{mbtiText} / {genderText} / {zodiacText}</div>
                  <div>{serverText} / {bodyTypeText} / {rankTierText}</div>
                  <div className="text-[12px] text-[#3c3839]">
                    <span>在线：{onlineTimeText}</span>
                    <span className="ml-1 text-[#7a6f72]">/ 初入江湖：{joinYearText}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mx-5 mt-5 border-t border-[#cdbfc2]/45 pt-4">
            <div className="flex items-baseline">
              <h2 className="text-[24px] font-black leading-none">游戏观</h2>
              <span className="ml-4 text-[8px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>PERSONAL INFORMATION</span>
            </div>
            <div className="mt-3 min-h-[70px] border-y border-l-[4px] border-[#cfc7c8] bg-white/30 px-4 py-3 text-[13px] font-medium leading-[1.65]" style={{ opacity: judgmentLoading ? 0.6 : 1 }}>
              {gameViewText}
            </div>
          </div>

          <div className="relative mx-5 mt-5 grid grid-cols-[1fr_132px] gap-5 pb-6">
            <section>
              <h2 className="text-[24px] font-black leading-none">兴趣标签</h2>
              <div className="mt-1 text-[9px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>INTERESTS</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {interestTags.length === 0 ? (
                  <span className="text-[12px] italic text-[#8a8082]">未选择</span>
                ) : interestTags.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="rounded-full border px-2 py-1 text-[11px] font-medium" style={{ borderColor: theme.primary, color: theme.textAccent, backgroundColor: 'rgba(255,255,255,0.65)' }}>{tag}</span>
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-[24px] font-black leading-none">常用心法</h2>
              <div className="mt-1 text-[9px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>OFTENPLAYED GAMES</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {mindsetIcons.length === 0 ? (
                  <div className="text-[12px] italic text-[#8a8082]">未选择心法</div>
                ) : mindsetIcons.map((url, index) => (
                  <div key={`${url}-${index}`} className="flex h-[36px] w-[36px] items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm" style={{ borderColor: '#766d6f' }} title={displayMindsets[index]}>
                    <img src={url} alt={displayMindsets[index]} className="h-[32px] w-[32px] rounded-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center overflow-hidden"
      style={{
        width: '100%',
        height: `${540 * scale}px`,
        transition: 'height 0.2s ease-out',
      }}
    >
      <div
        className="relative select-none flex-shrink-0 transition-all duration-300"
        style={{
          width: '960px',
          height: '540px',
          borderRadius: '12px',
          background: '#f7f6f6',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif',
        }}
      >
        {/* Load local custom fonts only — no Google Fonts (unreachable in mainland China) */}
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'XiangcuiDengcusong';
            src: url('/font/XiangcuiDengcusong.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'ShangguRoundSC';
            src: url('/font/ShangguRoundSC-Normal.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        ` }} />

        <div className="absolute inset-0 bg-[#f7f6f6]/90" />
        <div className="absolute inset-[16px] border pointer-events-none" style={{ borderColor: 'rgba(189, 169, 173, 0.2)' }} />
        <div className="absolute top-0 bottom-0 left-[412px] border-l pointer-events-none" style={{ borderColor: 'rgba(189, 169, 173, 0.14)' }} />

        <div className="absolute top-3 left-4 flex gap-10 text-[22px] font-light text-[#bda9ad]/30 pointer-events-none">
          <span>+</span><span>+</span><span>+</span>
        </div>
        <div className="absolute left-4 bottom-8 h-[220px] w-[48px] border-l border-b pointer-events-none" style={{ borderColor: 'rgba(189, 169, 173, 0.25)' }}>
          <div className="absolute -left-[5px] top-0 h-2 w-2 rotate-45 border bg-[#f7f6f6]" style={{ borderColor: 'rgba(189, 169, 173, 0.4)' }} />
          <div className="absolute -left-[5px] top-12 h-2 w-2 rotate-45 border bg-[#f7f6f6]" style={{ borderColor: 'rgba(189, 169, 173, 0.4)' }} />
        </div>

        {spriteUrl && (
          <img
            src={spriteUrl}
            alt=""
            className="absolute pointer-events-none select-none"
            style={{
              width: '590px',
              height: '590px',
              right: '-14px',
              bottom: '-72px',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              transform: 'scaleX(-1)',
              opacity: 0.09,
            }}
          />
        )}

        <div className="absolute top-2 right-12 z-10 text-right select-none">
          <div className="text-[15px] tracking-[2px] text-[#bda9ad]/60">剑网3魔盒自介卡</div>
          <div className="mt-2 text-[17px] leading-[1.05] text-black/30" style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive', transform: 'rotate(-2deg)' }}>
            <div>{quoteEnLine1}</div>
            <div>{quoteEnLine2}</div>
          </div>
        </div>

        <div className="absolute left-[386px] top-[42px] z-[1] flex flex-col items-center text-[48px] leading-[0.92] text-[#777]/20 pointer-events-none" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {'JX3BOX'.split('').map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}
        </div>
        <StarDecor top="72px" left="392px" size={20} opacity={0.25} fill={theme.primary} />
        <StarDecor top="248px" right="50px" size={58} opacity={0.12} fill={theme.primary} />
        <StarDecor bottom="32px" left="455px" size={16} opacity={0.2} fill={theme.primary} />

        <div className="absolute right-[34px] top-[125px] flex flex-col gap-2 pointer-events-none">
          {[0.08, 0.12, 0.16, 0.2, 0.16, 0.12].map((opacity, index) => (
            <div key={index} className="h-[20px] w-[20px] rounded-full" style={{ backgroundColor: theme.textAccent, opacity }} />
          ))}
        </div>

        {/* Left photo stack */}
        <div className="absolute left-[72px] top-[45px] z-10 h-[455px] w-[330px]">
          <div className="absolute left-0 top-2 h-[442px] w-[302px] bg-[#ded9da] shadow-sm" style={{ transform: 'rotate(-7deg)' }} />
          <div className="absolute left-3 top-1 h-[442px] w-[314px] bg-white p-3 shadow-[0_14px_30px_rgba(40,28,31,0.09)]">
            <div className="relative h-[366px] w-full overflow-hidden bg-[#ebe8e9]">
              <img src={portraitUrl} alt="角色照片" className="h-full w-full object-cover" style={{ objectPosition: 'center top', filter: 'saturate(0.82) contrast(0.96) brightness(1.04)' }} />
              {cardImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/45 text-xs text-gray-500 animate-pulse">加载中...</div>
              )}
              <div className="absolute left-5 top-2 text-[46px] leading-none text-[#3c3839]/80" style={{ fontFamily: '"Brush Script MT", "Lucida Handwriting", "Segoe Script", cursive', transform: 'rotate(-8deg)' }}>{cardPhotoName}</div>
              <div className="absolute right-5 top-7 h-12 w-12 text-white/80"><StarDecor top="0" left="0" size={48} opacity={0.7} fill="white" /></div>
            </div>
            <div className="flex h-[52px] items-center justify-center px-2 text-center text-[14px] tracking-[1px] text-[#262224]">{quoteText}</div>
          </div>

          <div className="absolute -left-2 top-[135px] z-20 flex h-[38px] w-[62px] items-center justify-center rounded-[22px] border bg-white shadow-sm after:absolute after:-bottom-1 after:right-2 after:h-3 after:w-3 after:rotate-45 after:border-b after:border-r after:border-[#d8ccce] after:bg-white" style={{ borderColor: '#d8ccce' }}>
            <svg width="25" height="25" viewBox="0 0 24 24" fill={theme.textAccent}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          </div>
        </div>

        {/* Interactive match trigger with shimmer + arrow hover animation. */}
        <button
          type="button"
          onClick={() => { try { window.dispatchEvent(new CustomEvent('mate-card:start-match')); } catch { /* no-op */ } }}
          className="match-trigger group absolute left-[344px] top-[412px] z-30 overflow-hidden border border-[#d8ccce] bg-white/95 px-5 py-2.5 text-[14px] tracking-[2px] text-[#171415] shadow-[0_4px_12px_rgba(54,38,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:border-[#bda9ad] hover:bg-white hover:text-[#3c3839] hover:shadow-[0_10px_28px_rgba(54,38,42,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bda9ad]/60 active:translate-y-0 active:scale-100"
          aria-label="开始匹配"
        >
          <span className="relative z-10 flex items-center gap-2">
            <span>开始匹配</span>
            <svg
              className="match-arrow h-3.5 w-3.5 -translate-x-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
          {/* Glow ring on hover */}
          <span
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ring-2 ring-[#bda9ad]/40 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden="true"
          />
          {/* Shimmer sweep */}
          <span
            className="match-shine pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#bda9ad]/30 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
            aria-hidden="true"
          />
          {/* Subtle pulsing dot — signals live action */}
          <span
            className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#bda9ad] opacity-50 transition-opacity duration-300 group-hover:animate-ping group-hover:opacity-100"
            aria-hidden="true"
          />
        </button>

        {/* Right information column */}
        <div className="absolute left-[482px] top-[83px] z-10 w-[395px] text-[#0f0d0e]">
          <div className="relative inline-flex max-w-full items-center">
            <div className="absolute bottom-1 left-[-8px] h-[21px] w-[115px] bg-[#e4dfe0]/80" />
            <h1 className="relative z-10 whitespace-nowrap font-black leading-none" style={{ fontSize: `${roleNameFontSize}px`, fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif' }}>{roleName}</h1>
          </div>

          <div className="mt-5 border-l-[5px] pl-4 text-[18px] font-bold leading-[1.45] tracking-[2px]" style={{ borderLeftColor: '#e4dfe0' }}>
            <div>{mbtiText} / {genderText} / {zodiacText}</div>
            <div>{serverText} / {bodyTypeText} / {rankTierText}</div>
            <div className="text-[16px] tracking-[1px] text-[#3c3839]">
              <span>在线：{onlineTimeText}</span>
              <span className="ml-2 text-[#7a6f72]">/ 初入江湖：{joinYearText}</span>
            </div>
          </div>

          <div className="relative mt-1 h-[16px] border-b" style={{ borderColor: 'rgba(205, 191, 194, 0.45)' }}>
            <div className="absolute -bottom-[4px] left-0 h-2 w-2 rotate-45 bg-[#ded4d6]" />
            <div className="absolute -bottom-[4px] right-0 h-2 w-2 rotate-45 bg-[#ded4d6]" />
          </div>

          <section className="mt-4">
            <div className="flex items-baseline">
              <h2 className="text-[24px] font-black leading-none" style={{ fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif' }}>游戏观</h2>
              <span className="ml-9 text-[10px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>PERSONAL INFORMATION</span>
            </div>
            <div
              className="mt-3 flex min-h-[64px] items-center border-y border-l-[4px] bg-white/30 px-5 py-2 text-left text-[14px] font-medium leading-[1.55] tracking-[1px] transition-opacity"
              style={{
                borderColor: '#cfc7c8',
                opacity: judgmentLoading ? 0.6 : 1,
              }}
            >
              {gameViewText}
            </div>
          </section>

          <div className="mt-4 flex items-start gap-5">
            <section className="min-w-0 flex-1">
              <h2 className="text-[24px] font-black leading-none" style={{ fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif' }}>兴趣标签</h2>
              <span className="mt-1 block text-[9px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>INTERESTS</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {interestTags.length === 0 ? (
                  <span className="text-[12px] italic text-[#8a8082]">未选择</span>
                ) : (
                  interestTags.map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className="rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.5px]"
                      style={{
                        borderColor: theme.primary,
                        color: theme.textAccent,
                        backgroundColor: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {tag}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section className="w-[160px] flex-none">
              <h2 className="text-[24px] font-black leading-none" style={{ fontFamily: '"XiangcuiDengcusong", "STSong", "SimSun", "PingFang SC", "Microsoft YaHei", serif' }}>常用心法</h2>
              <div className="mt-1 text-[9px] tracking-[2px] text-[#4b4446]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>OFTENPLAYED GAMES</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {mindsetIcons.length === 0 ? (
                  <div className="text-[12px] text-[#8a8082] italic">未选择心法</div>
                ) : (
                  mindsetIcons.map((url, index) => (
                    <div key={`${url}-${index}`} className="flex h-[38px] w-[38px] items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm transition-transform hover:scale-110" style={{ borderColor: '#766d6f' }} title={displayMindsets[index]}>
                      <img src={url} alt={displayMindsets[index]} className="h-[34px] w-[34px] rounded-full object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="absolute bottom-8 left-[480px] right-[190px] h-px bg-[#cdbfc2]/30">
          <div className="absolute -left-1 -top-1 h-2 w-2 rotate-45 bg-[#ded4d6]" />
          <div className="absolute -right-1 -top-1 h-2 w-2 rotate-45 bg-[#ded4d6]" />
        </div>


      </div>
    </div>
  );
}

interface StarDecorProps {
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: number;
  opacity: number;
  fill?: string;
}

function StarDecor({ top, left, right, bottom, size, opacity, fill = '#a8a7ab' }: StarDecorProps) {
  return (
    <svg
      className="absolute pointer-events-none"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ top, left, right, bottom, opacity, zIndex: 0 }}
    >
      <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill={fill} />
    </svg>
  );
}

export const SocialCardSummary = memo(SocialCardSummaryImpl);
