/**
 * Player store (Zustand) - bridges the framework-agnostic GameEngine with React.
 *
 * Holds a GameEngine instance and mirrors its `GameState` so components can
 * subscribe via Zustand selectors. All mutations delegate to the engine.
 */

import { create } from 'zustand';
import { GameEngine, type GameState } from '@/engine/GameEngine';
import type { FlowData } from '@/types/flow';
import {
  lookupJx3Profile,
  checkJx3Submission,
  submitJx3Appeal,
  generateJudgment,
  type Jx3Profile,
} from '@/services/jx3.service';
import { AppError } from '@/lib/errors';

/**
 * 预取的 AI 判词缓存。
 *
 * 在玩家选完 MBTI (scene_16) 后立即异步调用 generateJudgment 预生成判词，
 * 这样到达 settlement 阶段时 SocialCardSummary 可以直接读取，无需用户等待。
 *
 * 缓存命中校验：mbti 和 choicesHash 必须与当前 variables 完全一致，
 * 避免脏读（例如 confirmModify 注入旧 variables 后又改了 MBTI）。
 */
export interface PrefetchedJudgment {
  /** 生成判词时使用的 mbti（用于命中校验） */
  mbti: string;
  /** 生成判词时使用的 5 题选项字母数组的拼接 hash（用于命中校验） */
  choicesHash: string;
  /** AI 生成的判词文本 */
  text: string;
  /** AI 返回的模型名（仅用于调试，可忽略） */
  model: string;
  /** 调用耗时（ms，仅用于调试） */
  latencyMs: number;
}

/**
 * 根据当前 variables 计算 mbti + choices 的签名字符串，用于缓存命中校验。
 * 5 题 gv_choice_* 任一为空都视为不完整，返回空字符串。
 */
function computeJudgmentSignature(variables: Record<string, string | number | boolean>): {
  mbti: string;
  choices: string[];
  choicesHash: string;
} {
  const mbti = String(variables.mbti ?? '').trim();
  const choices = [
    String(variables.gv_choice_1 ?? ''),
    String(variables.gv_choice_2 ?? ''),
    String(variables.gv_choice_3 ?? ''),
    String(variables.gv_choice_4 ?? ''),
    String(variables.gv_choice_5 ?? ''),
  ];
  // 任一题为空 → 视为不完整
  if (!mbti || choices.some((c) => !c)) {
    return { mbti: '', choices: [], choicesHash: '' };
  }
  return { mbti, choices, choicesHash: choices.join('|') };
}

/** Player store state shape. */
interface PlayerStoreState {
  /** The current engine state snapshot. */
  state: GameState | null;
  /** Whether the player is currently running. */
  isRunning: boolean;
  /** The active engine instance (null when not running). */
  engine: GameEngine | null;
  /** True while a 推栏号 lookup is in flight. */
  isLookingUp: boolean;
  /** Last lookup error message (cleared on next attempt). */
  lookupError: string | null;
  /** True when the submitted 推栏号 already has a submission record. */
  submissionExists: boolean;
  /** The 推栏号 pending a "modify or appeal" decision. */
  pendingTuilanId: string | null;
  /**
   * 上次提交时缓存的引擎 variables 快照。
   * 在 submissionExists=true 时由 checkJx3Submission 返回，
   * confirmModify 时直接注入引擎，避免重新走一遍流程。
   */
  pendingSubmissionVariables: Record<string, string | number | boolean> | null;
  /**
   * 上次提交时缓存的 Xoyo profile。
   * confirmModify 时直接复用，不再调用 Xoyo API。
   */
  pendingSubmissionProfile: Jx3Profile | null;
  /**
   * 上次提交时持久化的 AI 判词文本。
   * confirmModify 时直接写入 finalJudgment + prefetchedJudgment（伪造缓存命中），
   * 让 SocialCardSummary 跳过 AI 调用、SettlementStage 直接提交此文本。
   */
  pendingSubmissionJudgment: string | null;
  /** True while an appeal is being submitted. */
  isAppealing: boolean;
  /** Last appeal error message. */
  appealError: string | null;
  /** True when the appeal was submitted successfully. */
  appealSuccess: boolean;
  /**
   * 预取的 AI 判词缓存。
   * 在玩家选完 MBTI (scene_16) 后立即异步生成判词，settlement 阶段直接读取。
   * 命中时 SocialCardSummary 跳过自己的 useEffect 调用，避免用户等待。
   * null 表示无缓存（首次未触发 / 已失效 / 已重置）。
   */
  prefetchedJudgment: PrefetchedJudgment | null;
  /**
   * AI 判词预取进行中标志。
   * SocialCardSummary 据此显示 "正在生成专属判语..." 占位文案，
   * 而不是立即触发自己的调用（避免重复请求）。
   */
  isPrefetchingJudgment: boolean;
  /**
   * 最终判词文本（用于提交到后端持久化）。
   * 由 SocialCardSummary 在以下场景写入：
   *   - 预取缓存命中时写入缓存文本
   *   - 同步 AI 调用成功时写入返回文本
   *   - 同步 AI 调用失败 / 无 choices 时写入 null（后端存 NULL）
   * confirmModify 时由后端 /check 接口回填的 cached judgment 直接写入此字段。
   * SettlementStage 通过 judgmentFinalized 监听此字段就绪后提交。
   */
  finalJudgment: string | null;
  /**
   * 判词是否已最终化（SocialCardSummary 已决定最终文本）。
   * SettlementStage 据此判断是否可以触发 submitJx3Submission：
   *   - false: SocialCardSummary 尚未完成（预取中 / 同步调用中）—— 等待
   *   - true: 可以提交，使用 finalJudgment 字段值（可能为 null）
   */
  judgmentFinalized: boolean;
  /**
   * 写入最终判词文本。同时将 judgmentFinalized 置为 true。
   * 传入 null 表示判词生成失败 / 无数据，后端会存 NULL。
   */
  setFinalJudgment: (text: string | null) => void;

  /** Load a project and start the engine. */
  start: (flowData: FlowData) => GameState;
  /** Select a choice on the current scene node. */
  selectChoice: (choiceId: string) => void;
  /** Select a button on the current settlement node. */
  selectSettlementButton: (buttonId: string) => void;
  /** Advance from a start node. */
  advanceFromStart: () => void;
  /** Skip the current video node. */
  skipVideo: () => void;
  /** Submit a minigame score. */
  submitMinigame: (score: number) => void;
  /** Submit a rating value. */
  submitRating: (value: number) => void;
  /** Submit multi-select choices. */
  submitMultiSelect: (optionIds: string[]) => void;
  /** Submit text input value. */
  submitTextInput: (value: string) => void;
  /** Submit rank-order drag result (ordered item ids). */
  submitRankOrder: (orderedIds: string[]) => void;
  /** Submit a number-picker value (e.g. 入坑年份). */
  submitNumberPicker: (value: number) => void;
  /**
   * Skip the Xoyo lookup and proceed with manual entry.
   * Called when the API is unavailable — stores the tuilan_id variable
   * and advances, letting the player manually select server/mindset/etc.
   */
  skipTuilanLookup: (value: string) => void;
  /**
   * Submit a 推栏号 text input.
   *
   * First checks if the 推栏号 already has a submission. If so, sets
   * `submissionExists: true` and waits for the user to choose "修改信息"
   * (confirmModify) or "申诉" (submitAppeal). Otherwise proceeds with
   * the Xoyo lookup and auto-skip logic.
   */
  submitTuilanId: (value: string) => Promise<void>;
  /** Confirm "修改信息": proceed with lookup after submission-exists prompt. */
  confirmModify: () => Promise<void>;
  /** Dismiss the submission-exists prompt (reset state). */
  dismissSubmissionExists: () => void;
  /** Submit an appeal with a screenshot. */
  submitAppeal: (screenshot: File, reason?: string) => Promise<void>;
  /** Advance from a media node. */
  advanceFromMedia: () => void;
  /** Reset the engine to the beginning. */
  restart: () => void;
  /** Stop the player and release the engine. */
  stop: () => void;
}

/**
 * 判断从推栏 API 返回的 profile 是否包含有效的角色信息。
 *
 * 当 API 调用失败/返回空数据/角色无 PVP 记录时，profile 中关键字段
 * 全为 0 或空字符串。此时玩家继续走流程会看到默认段位"十五段"等
 * 不真实数据，因此需要在 profileToVariables 中强制把 rank_tier 改为 '未知'。
 *
 * 判断条件（满足任一即视为无效）：
 *   - gradeValue 为 0 且 mmr 为 0（无任何段位/匹配分数据）
 *   - server 为空（无法解析区服）
 *   - force 为空且 xfName 为空（既无门派也无心法）
 *   - totalCount 为 0 且 mmr 为 0（从未打过 PVP）
 */
function isProfileEffective(p: Jx3Profile): boolean {
  if (!p) return false;
  if (!p.server || !p.server.trim()) return false;
  if (!p.force && !p.xfName) return false;
  // 段位等级和 MMR 都为 0 且 totalCount 也为 0 — 视为无 PVP 数据
  if (p.gradeValue === 0 && p.mmr === 0 && p.totalCount === 0) return false;
  return true;
}

/**
 * Map a Jx3Profile into engine variables.
 *
 * The returned object is shallow-merged into `engine.variables`; the
 * GameEngine's auto-skip logic then sees these as "known" and bypasses
 * the corresponding scene nodes.
 *
 * 注意：
 * 1. `mindset` 只接受 tuilan 后台返回的精确心法名 (xfName, e.g. "焚影圣诀")，
 *    不再回退到 `force` (门派名 e.g. "明教")。原因：
 *    a. SocialCardSummary 的主题/诗句/拼音映射都基于心法名，门派名无法命中。
 *    b. 当 xfName 为空时，让 mindset 保持空字符串，GameEngine 的 auto-skip
 *       机制 (GameEngine.findSceneSkipTarget) 会判定 `current === ''` 返回 null，
 *       从而不会跳过 scene_02 心法选择节点，玩家可以手动选择主玩心法。
 * 2. 当 profile 无有效角色信息 (isProfileEffective=false) 时，强制把
 *    `rank_tier` 设为 '未知'，避免展示不真实的"十五段"等默认数据。
 *    注意：grade_value/mmr/total_count 仍按原值写入，SocialCardSummary 中
 *    getRankFromMmr 等函数会因为 0 值而走兜底，最终展示 '未知'。
 */
function profileToVariables(p: Jx3Profile): Record<string, string | number | boolean> {
  const effective = isProfileEffective(p);
  return {
    tuilan_id: p.tuilanId,
    person_id: p.personId,
    nick_name: p.nickName,
    game_name: p.gameName,
    avatar_url: p.avatarUrl,
    server: p.server,
    zone: p.zone,
    mindset: p.xfName,
    body_type: p.bodyType,
    // 推栏无有效角色信息时强制 '未知'，否则用 API 返回的 rankTier
    rank_tier: effective ? p.rankTier : '未知',
    grade_raw: p.gradeRaw,
    grade_value: p.gradeValue,
    pvp_type: p.pvpType,
    mmr: p.mmr,
    win_rate: p.winRate,
    total_count: p.totalCount,
    ranking: p.ranking,
    camp: p.camp,
    card_preset_url: p.cardPresetUrl,
  };
}

export const usePlayerStore = create<PlayerStoreState>((set, get) => ({
  state: null,
  isRunning: false,
  engine: null,
  isLookingUp: false,
  lookupError: null,
  submissionExists: false,
  pendingTuilanId: null,
  pendingSubmissionVariables: null,
  pendingSubmissionProfile: null,
  pendingSubmissionJudgment: null,
  isAppealing: false,
  appealError: null,
  appealSuccess: false,
  prefetchedJudgment: null,
  isPrefetchingJudgment: false,
  finalJudgment: null,
  judgmentFinalized: false,

  setFinalJudgment: (text) => set({ finalJudgment: text, judgmentFinalized: true }),

  start: (flowData) => {
    // Tear down any previous engine.
    const previous = get().engine;
    if (previous) {
      previous.reset();
    }
    const engine = new GameEngine(flowData);
    let prevMbti = '';
    let prevChoicesHash = '';
    const initial = engine.start();

    // Attach listener AFTER start() so initial transition does not trigger nested state updates
    engine.subscribe((next) => {
      set({ state: next });

      // ── AI 判词预取：检测 mbti + 5 题 choices 全部就绪那一刻 ──
      const sig = computeJudgmentSignature(next.variables);
      if (!sig.choicesHash) {
        prevMbti = sig.mbti;
        prevChoicesHash = sig.choicesHash;
        return;
      }
      // 仅在 mbti+choicesHash 发生变化时触发，避免重复调用
      if (sig.mbti === prevMbti && sig.choicesHash === prevChoicesHash) {
        return;
      }
      prevMbti = sig.mbti;
      prevChoicesHash = sig.choicesHash;

      // 命中缓存（同 mbti+choices 已预取过）—— 直接复用
      const cached = get().prefetchedJudgment;
      if (
        cached &&
        cached.mbti === sig.mbti &&
        cached.choicesHash === sig.choicesHash
      ) {
        return;
      }

      // 触发异步预取
      set({ isPrefetchingJudgment: true });
      void generateJudgment(sig.mbti, sig.choices)
        .then((res) => {
          set({
            isPrefetchingJudgment: false,
            prefetchedJudgment: {
              mbti: sig.mbti,
              choicesHash: sig.choicesHash,
              text: res.judgment,
              model: res.model,
              latencyMs: res.latencyMs,
            },
          });
        })
        .catch(() => {
          set({ isPrefetchingJudgment: false, prefetchedJudgment: null });
        });
    });

    set({
      engine,
      state: initial,
      isRunning: true,
      prefetchedJudgment: null,
      isPrefetchingJudgment: false,
      finalJudgment: null,
      judgmentFinalized: false,
    });
    return initial;
  },

  selectChoice: (choiceId) => {
    const engine = get().engine;
    if (!engine) return;
    engine.selectChoice(choiceId);
  },

  selectSettlementButton: (buttonId) => {
    const engine = get().engine;
    if (!engine) return;
    engine.selectSettlementButton(buttonId);
  },

  advanceFromStart: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.advanceFromStart();
  },

  skipVideo: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.skipVideo();
  },

  submitMinigame: (score) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitMinigame(score);
  },

  submitRating: (value) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitRating(value);
  },

  submitMultiSelect: (optionIds) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitMultiSelect(optionIds);
  },

  submitTextInput: (value) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitTextInput(value);
  },

  submitRankOrder: (orderedIds) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitRankOrder(orderedIds);
  },

  submitNumberPicker: (value) => {
    const engine = get().engine;
    if (!engine) return;
    engine.submitNumberPicker(value);
  },

  skipTuilanLookup: (value) => {
    const engine = get().engine;
    if (!engine) return;
    const trimmed = value.trim();
    // Store the tuilan_id variable so it's available at settlement,
    // but do NOT populate server/mindset/etc — the player will
    // manually select those via the scene nodes.
    engine.applyVariables({ tuilan_id: trimmed });
    set({ isLookingUp: false, lookupError: null });
    engine.submitTextInput(trimmed);
  },

  submitTuilanId: async (value) => {
    const engine = get().engine;
    if (!engine) return;
    const trimmed = value.trim();
    set({
      isLookingUp: true,
      lookupError: null,
      submissionExists: false,
      pendingTuilanId: null,
      pendingSubmissionVariables: null,
      pendingSubmissionProfile: null,
      pendingSubmissionJudgment: null,
      appealError: null,
      appealSuccess: false,
    });

    // Required: empty input is rejected by UI, but guard anyway.
    if (!trimmed) {
      set({ isLookingUp: false, lookupError: '推栏号为必填项' });
      return;
    }

    try {
      // 1. Check if a submission already exists for this 推栏号.
      const checkResult = await checkJx3Submission(trimmed);
      if (checkResult.exists) {
        // 缓存上次提交的 variables、profile 和 judgment，confirmModify 时直接注入。
        // variables 是玩家之前填写的所有数据 (MBTI/游戏观/常用心法/签名/期望等)，
        // profile 是上次从 Xoyo 查到的角色信息，
        // judgment 是上次持久化的 AI 判词 —— 直接复用避免重复调用 AI。
        set({
          isLookingUp: false,
          submissionExists: true,
          pendingTuilanId: trimmed,
          pendingSubmissionVariables: checkResult.data?.variables ?? null,
          pendingSubmissionProfile: checkResult.data?.profile ?? null,
          pendingSubmissionJudgment: checkResult.data?.judgment ?? null,
        });
        return;
      }
      // 2. Proceed with Xoyo lookup and advance.
      const profile = await lookupJx3Profile(trimmed);
      engine.applyVariables(profileToVariables(profile));
      set({ isLookingUp: false, lookupError: null });
      engine.submitTextInput(trimmed);
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.message
          : err instanceof Error
            ? err.message
            : '推栏号查询失败';
      set({ isLookingUp: false, lookupError: message });
    }
  },

  /**
   * Confirm "修改信息": 恢复玩家上次提交的所有数据到引擎。
   *
   * 流程：
   * 1. 优先使用缓存的 variables（玩家之前填的 MBTI/游戏观/常用心法/签名/期望等）
   * 2. 优先使用缓存的 profile（避免再次调用 Xoyo API）
   * 3. 缓存缺失时回退到 lookupJx3Profile 重新查询
   * 4. 注入 variables 到引擎 → 推进流程
   *
   * 判词复用：若缓存中有 judgment 文本，先在 applyVariables 之前伪造 prefetchedJudgment
   * 缓存（匹配 cachedVars 的 mbti+choicesHash），这样 engine.subscribe 触发预取检查时
   * 直接命中缓存跳过 AI 调用；同时把 judgment 写入 finalJudgment + judgmentFinalized=true，
   * 让 SettlementStage 直接提交此文本，无需等待 SocialCardSummary。
   *
   * 这样玩家点"修改信息"后，所有之前填好的数据都会自动加载，
   * 可以直接在已有数据基础上修改，无需重新走一遍。
   */
  confirmModify: async () => {
    const engine = get().engine;
    if (!engine) return;
    const tuilanId = get().pendingTuilanId;
    if (!tuilanId) return;
    set({ isLookingUp: true, lookupError: null, submissionExists: false });
    try {
      // 0. 判词复用：在 applyVariables 之前预填缓存，避免 engine.subscribe 触发预取
      const cachedVars = get().pendingSubmissionVariables;
      const cachedJudgment = get().pendingSubmissionJudgment;
      if (cachedJudgment && cachedVars) {
        const sig = computeJudgmentSignature(cachedVars);
        if (sig.choicesHash) {
          // 伪造缓存命中：mbti+choicesHash 匹配，engine.subscribe 检查时直接 return
          set({
            prefetchedJudgment: {
              mbti: sig.mbti,
              choicesHash: sig.choicesHash,
              text: cachedJudgment,
              model: 'cached',
              latencyMs: 0,
            },
            // 同时设置 finalJudgment，让 SettlementStage 直接提交此文本
            // （即使 SocialCardSummary 因某种原因未触发，submit 也能拿到 judgment）
            finalJudgment: cachedJudgment,
            judgmentFinalized: true,
          });
        }
      }

      // 1. 优先用缓存的 profile；缺失时回退到 Xoyo API
      const cachedProfile = get().pendingSubmissionProfile;
      const profile = cachedProfile ?? await lookupJx3Profile(tuilanId);
      // 2. 注入 profile 派生的 variables (区服/门派/心法等基础信息)
      engine.applyVariables(profileToVariables(profile));

      // 3. 注入玩家之前填写的 variables (MBTI/游戏观/常用心法/签名/期望等)
      //    这些是上次提交时引擎的完整快照，直接 applyVariables 即可恢复。
      //    浅合并：profile 派生字段优先（更新过的区服/门派/心法），
      //    然后玩家变量补齐（避免 profile 中的旧值覆盖玩家新填的）。
      if (cachedVars && Object.keys(cachedVars).length > 0) {
        engine.applyVariables(cachedVars);
      }

      set({
        isLookingUp: false,
        lookupError: null,
        pendingTuilanId: null,
        pendingSubmissionVariables: null,
        pendingSubmissionProfile: null,
        pendingSubmissionJudgment: null,
      });
      engine.submitTextInput(tuilanId);
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.message
          : err instanceof Error
            ? err.message
            : '推栏号查询失败';
      set({ isLookingUp: false, lookupError: message });
    }
  },

  dismissSubmissionExists: () => {
    set({
      submissionExists: false,
      pendingTuilanId: null,
      pendingSubmissionVariables: null,
      pendingSubmissionProfile: null,
      pendingSubmissionJudgment: null,
      appealError: null,
      appealSuccess: false,
      isAppealing: false,
    });
  },

  submitAppeal: async (screenshot, reason) => {
    const tuilanId = get().pendingTuilanId;
    if (!tuilanId) return;
    set({ isAppealing: true, appealError: null, appealSuccess: false });
    try {
      await submitJx3Appeal(tuilanId, screenshot, reason);
      set({ isAppealing: false, appealSuccess: true });
    } catch (err) {
      const message =
        err instanceof AppError
          ? err.message
          : err instanceof Error
            ? err.message
            : '申诉提交失败';
      set({ isAppealing: false, appealError: message });
    }
  },

  advanceFromMedia: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.advanceFromMedia();
  },

  restart: () => {
    const engine = get().engine;
    if (!engine) return;
    engine.reset();
    engine.start();
    // 重置预取缓存和最终判词（重新开始流程时清空旧判词）
    set({
      prefetchedJudgment: null,
      isPrefetchingJudgment: false,
      finalJudgment: null,
      judgmentFinalized: false,
    });
  },

  stop: () => {
    const engine = get().engine;
    if (engine) {
      engine.reset();
    }
    set({
      engine: null,
      state: null,
      isRunning: false,
      // 停止播放器时清空预取缓存和最终判词
      prefetchedJudgment: null,
      isPrefetchingJudgment: false,
      finalJudgment: null,
      judgmentFinalized: false,
    });
  },
}));

if (typeof window !== 'undefined') {
  (window as any).usePlayerStore = usePlayerStore;
}

