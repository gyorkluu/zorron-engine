/**
 * SocialCardSummary - custom visual block for the JX3 social card scenario.
 *
 * Renders the player's final variables as a structured "business card" with
 * sections for basic info, game level, rank tier, MBTI personality, game-view
 * tier, interests, and zodiac.
 */

import { memo } from 'react';
import type { Variables } from '@/types/flow';

/** MBTI type descriptions for the personality portrait. */
const MBTI_DESCRIPTIONS: Record<string, string> = {
  INTJ: '建筑师 · 战略思考者',
  INTP: '逻辑学家 · 理性分析',
  ENTJ: '指挥官 · 天生领袖',
  ENTP: '辩论家 · 创新思维',
  INFJ: '提倡者 · 理想主义',
  INFP: '调停者 · 诗意善良',
  ENFJ: '主人公 · 魅力四射',
  ENFP: '竞选者 · 热情洋溢',
  ISTJ: '物流师 · 稳重可靠',
  ISFJ: '守卫者 · 温暖守护',
  ESTJ: '总经理 · 秩序维护',
  ESFJ: '执政官 · 热心助人',
  ISTP: '鉴赏家 · 实践达人',
  ISFP: '探险家 · 艺术气质',
  ESTP: '企业家 · 行动派',
  ESFP: '表演者 · 享乐主义',
};

/** MBTI category colors. */
const MBTI_CATEGORY: Record<string, { color: string; label: string }> = {
  INTJ: { color: 'text-purple-300', label: '分析家' },
  INTP: { color: 'text-purple-300', label: '分析家' },
  ENTJ: { color: 'text-purple-300', label: '分析家' },
  ENTP: { color: 'text-purple-300', label: '分析家' },
  INFJ: { color: 'text-emerald-300', label: '外交官' },
  INFP: { color: 'text-emerald-300', label: '外交官' },
  ENFJ: { color: 'text-emerald-300', label: '外交官' },
  ENFP: { color: 'text-emerald-300', label: '外交官' },
  ISTJ: { color: 'text-blue-300', label: '守护者' },
  ISFJ: { color: 'text-blue-300', label: '守护者' },
  ESTJ: { color: 'text-blue-300', label: '守护者' },
  ESFJ: { color: 'text-blue-300', label: '守护者' },
  ISTP: { color: 'text-amber-300', label: '探索家' },
  ISFP: { color: 'text-amber-300', label: '探索家' },
  ESTP: { color: 'text-amber-300', label: '探索家' },
  ESFP: { color: 'text-amber-300', label: '探索家' },
};

/** Props for SocialCardSummary. */
export interface SocialCardSummaryProps {
  variables: Variables;
}

/** Resolve the game-view tier label from the score. */
function getGameViewTier(score: number): { label: string; color: string; emoji: string } {
  if (score <= 5) return { label: '天使', color: 'text-sky-300', emoji: '😇' };
  if (score <= 15) return { label: '一般', color: 'text-amber-300', emoji: '😐' };
  return { label: '暴躁', color: 'text-red-400', emoji: '😤' };
}

/** Resolve the rank tier display label. */
function getRankTierLabel(tier: string): string {
  switch (tier) {
    case '13以下':
      return '13 以下（新手/休闲）';
    case '13-15':
      return '13-15（中端）';
    case '15+':
      return '15+（高端）';
    default:
      return tier;
  }
}

function SocialCardSummaryImpl({ variables }: SocialCardSummaryProps) {
  const v = variables;
  const mbti = String(v.mbti ?? '');
  const gameViewScore = Number(v.game_view_score ?? 0);
  const tier = getGameViewTier(gameViewScore);
  const mbtiCat = MBTI_CATEGORY[mbti];
  const interests = String(v.interests ?? '').split(',').filter(Boolean);

  return (
    <div className="w-full space-y-4 text-left">
      {/* Header */}
      <div className="rounded-xl border border-teal-500/40 bg-gradient-to-br from-teal-900/30 to-slate-900/50 p-5 text-center">
        <h2 className="text-2xl font-bold text-teal-200">游戏社交名片</h2>
        <p className="mt-1 text-xs text-slate-400">剑网3 · 专属名片已生成</p>
      </div>

      {/* Basic info */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-bold text-teal-300">基本信息</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <InfoRow label="区服" value={String(v.server ?? '—')} />
          <InfoRow label="心法" value={String(v.mindset ?? '—')} />
          <InfoRow label="体型" value={String(v.body_type ?? '—')} />
          <InfoRow label="性别" value={String(v.gender ?? '—')} />
          <InfoRow label="主要玩法" value={String(v.primary_mode ?? '—')} />
        </div>
      </div>

      {/* Game level */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-bold text-teal-300">游戏水平</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <LevelBar label="PVP" value={Number(v.pvp_level ?? 0)} color="bg-rose-500" />
          <LevelBar label="PVE" value={Number(v.pve_level ?? 0)} color="bg-blue-500" />
          <LevelBar label="PVX" value={Number(v.pvx_level ?? 0)} color="bg-emerald-500" />
        </div>
      </div>

      {/* Rank tier */}
      <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4">
        <h3 className="mb-2 text-sm font-bold text-amber-300">段位</h3>
        <div className="text-lg font-bold text-amber-200">
          {getRankTierLabel(String(v.rank_tier ?? '—'))}
        </div>
      </div>

      {/* MBTI personality */}
      {mbti && (
        <div className="rounded-lg border border-purple-500/40 bg-purple-950/20 p-4">
          <h3 className="mb-2 text-sm font-bold text-purple-300">MBTI 人格画像</h3>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-purple-200">{mbti}</span>
            {mbtiCat && (
              <span className={`text-sm ${mbtiCat.color}`}>{mbtiCat.label}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-purple-400">
            {MBTI_DESCRIPTIONS[mbti] ?? ''}
          </p>
        </div>
      )}

      {/* Game view tier */}
      <div className="rounded-lg border border-orange-500/40 bg-orange-950/20 p-4">
        <h3 className="mb-2 text-sm font-bold text-orange-300">游戏观等级</h3>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-orange-200">
            {tier.emoji} {tier.label}
          </span>
          <span className="text-sm text-orange-400">{gameViewScore} / 25 分</span>
        </div>
      </div>

      {/* Interests */}
      {interests.length > 0 && (
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-bold text-teal-300">兴趣标签</h3>
          <div className="flex flex-wrap gap-2">
            {interests.map((tag, i) => (
              <span
                key={i}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Zodiac */}
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-bold text-teal-300">星座</h3>
        <div className="text-lg font-bold text-slate-200">
          {String(v.zodiac ?? '—')}
        </div>
      </div>
    </div>
  );
}

/** A label + value row. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}

/** A labeled level bar (0-10). */
function LevelBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / 10) * 100));
  return (
    <div>
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-100">{value}<span className="text-xs text-slate-500">/10</span></div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const SocialCardSummary = memo(SocialCardSummaryImpl);
