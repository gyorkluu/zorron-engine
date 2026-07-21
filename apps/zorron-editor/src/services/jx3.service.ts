/**
 * jx3.service.ts
 *
 * Frontend client for the JX3 推栏号 lookup endpoint.
 *
 * Used by TextInputStage when the user submits a 推栏号: the response
 * populates the engine's variables so the GameEngine can auto-skip
 * already-known scene nodes (区服 / 门派 / 体型 / 段位).
 */

import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from 'axios';
import { JX3_API_BASE_URL } from './api';
import { AppError, type AppErrorShape } from '@/lib/errors';

/**
 * [axios]: dedicated HTTP client for the JX3 backend (service-lover).
 *
 * The JX3 service is an independent Hono backend; it has no auth layer
 * (推栏号 lookup is public) so this client skips the bearer-token
 * interceptor and the 401-refresh rotation used by the main `http` client.
 */
const jx3Client: AxiosInstance = axios.create({
  baseURL: JX3_API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Convert an axios error into a normalized AppError instance. */
function toAppError(error: unknown): AppError {
  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as Partial<AppErrorShape> | undefined;
    return new AppError({
      code: body?.code ?? 'HTTP_ERROR',
      message: body?.message ?? error.message,
      details: body?.details,
      requestId: body?.requestId
        ?? (error.response.headers['x-request-id'] as string)
        ?? '',
      status: error.response.status,
    });
  }
  if (error instanceof AxiosError && error.request) {
    return new AppError({
      code: 'NETWORK_ERROR',
      message: 'Network error: unable to reach the JX3 service.',
      requestId: '',
      status: 0,
    });
  }
  return new AppError({
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
    requestId: '',
    status: 0,
  });
}

// Response interceptor: normalize all errors into AppError so callers
// can switch on `code` / `status` uniformly.
jx3Client.interceptors.response.use(
  (response) => response,
  async (error) => Promise.reject(toAppError(error)),
);

/** Typed request helpers that unwrap the axios response. */
const jx3Http = {
  get: <T>(url: string): Promise<T> =>
    jx3Client.get<T>(url).then((r: AxiosResponse<T>) => r.data),
  post: <T>(url: string, body?: unknown): Promise<T> =>
    jx3Client.post<T>(url, body).then((r: AxiosResponse<T>) => r.data),
};

/** Aggregated JX3 profile returned by POST /api/jx3/lookup. */
export interface Jx3Profile {
  tuilanId: string;
  personId: string;
  nickName: string;
  avatarUrl: string;
  gameName: string;
  zone: string;
  server: string;
  force: string;
  forceId: number;
  bodyType: string;
  gradeRaw: string;
  gradeValue: number;
  rankTier: string;
  pvpType: string;
  mmr: number;
  winRate: number;
  totalCount: number;
  ranking: number;
  camp: string;
  gameGlobalRoleId: string;
  gameRoleId: string;
  cardPresetUrl: string;
  /**
   * 心法中文名 (e.g. "焚影圣诀"), resolved from the player's most recent
   * match history. When non-empty, the frontend prefers this over `force`
   * for the `mindset` variable.
   */
  xfName: string;
}

/** Envelope returned by the backend. */
interface Jx3LookupResponse {
  code: number | string;
  message: string;
  data?: Jx3Profile;
}

/** Result of GET /api/jx3/check/:tuilanId. */
export interface Jx3CheckResult {
  exists: boolean;
  data?: {
    tuilanId: string;
    cardImagePath: string | null;
    createdAt: string;
    updatedAt: string;
    /** 上次提交的完整引擎 variables 快照 — confirmModify 时直接注入。 */
    variables?: Record<string, string | number | boolean>;
    /** 上次查询到的 Xoyo profile — confirmModify 时复用，避免再调一次 Xoyo。 */
    profile?: Jx3Profile | null;
    /**
     * 上次提交的 AI 判词文本 — confirmModify 时前端直接复用，
     * 避免重复调用 AI 接口消耗 token。
     * 新提交时为 null；预取失败兜底走固定文案时也可能为 null。
     */
    judgment?: string | null;
  };
}

/** Result of GET /api/jx3/card/:tuilanId. */
export interface Jx3CardImageResult {
  tuilanId: string;
  cardImagePath: string;
  cardImageUrl: string;
}

/**
 * Map a backend error code to a user-friendly Chinese message.
 *
 * The backend returns technical codes (`NOT_FOUND`, `UPSTREAM_ERROR`,
 * `PARSE_ERROR`) that leak implementation details. The UI should only
 * show actionable, human-readable text.
 */
function friendlyMessage(code: string, fallback: string): string {
  switch (code) {
    case 'NOT_FOUND':
      return '未找到该推栏号对应的玩家';
    case 'UPSTREAM_ERROR':
      return '查询服务暂时不可用，请稍后重试或手动填写信息';
    case 'PARSE_ERROR':
      return '查询服务返回异常，请稍后重试或手动填写信息';
    default:
      return fallback || '推栏号查询失败，请手动填写信息';
  }
}

/**
 * Look up a JX3 player profile by 推栏号.
 *
 * @throws {AppError} when the backend is unreachable, the player is not
 *   found, or the upstream Xoyo API fails.
 */
export async function lookupJx3Profile(tuilanId: string): Promise<Jx3Profile> {
  try {
    const res = await jx3Http.post<Jx3LookupResponse>('/api/jx3/lookup', { tuilanId });
    if (res.code !== 0 || !res.data) {
      throw new AppError({
        code: 'JX3_LOOKUP_FAILED',
        message: friendlyMessage(String(res.code), res.message),
        requestId: '',
        status: 400,
      });
    }
    return res.data;
  } catch (err) {
    // AppError thrown by the HTTP interceptor — normalize the message.
    if (err instanceof AppError) {
      throw new AppError({
        code: err.code,
        message: friendlyMessage(err.code, err.message),
        requestId: err.requestId,
        status: err.status,
        details: err.details,
      });
    }
    // Network / unexpected error.
    throw new AppError({
      code: 'JX3_LOOKUP_NETWORK',
      message: err instanceof Error ? err.message : '网络错误，请稍后重试',
      requestId: '',
      status: 0,
    });
  }
}

// ── Submission check / submit / appeal ──────────────────────────────

/**
 * Check whether a submission already exists for the given 推栏号.
 *
 * Used by TextInputStage to show "修改信息" or "申诉" buttons when the
 * 推栏号 has already been used.
 */
export async function checkJx3Submission(
  tuilanId: string,
): Promise<Jx3CheckResult> {
  try {
    return await jx3Http.get<Jx3CheckResult>(`/api/jx3/check/${encodeURIComponent(tuilanId)}`);
  } catch (err) {
    // Non-existent is not an error — treat 404 as "not found".
    if (err instanceof AppError && err.status === 404) {
      return { exists: false };
    }
    throw err instanceof AppError
      ? err
      : new AppError({
          code: 'JX3_CHECK_NETWORK',
          message: '检查推栏号失败',
          requestId: '',
          status: 0,
        });
  }
}

/**
 * Save a completed JX3 social-card submission to the backend.
 *
 * The backend downloads and caches the card image, then stores the record.
 *
 * @param judgment AI 预生成的判词文本（可选）。
 *   - 预取成功时由 SocialCardSummary 在缓存命中 / 同步调用成功后写入 playerStore.finalJudgment
 *   - confirmModify 时由后端 /check 接口回填（避免重复 AI 调用）
 *   - 预取失败 / 兜底走固定文案时为 null，后端存 NULL
 */
export async function submitJx3Submission(
  tuilanId: string,
  profile: Jx3Profile | null,
  variables: Record<string, string | number | boolean>,
  settlementResult: unknown,
  judgment?: string | null,
): Promise<void> {
  try {
    await jx3Http.post('/api/jx3/submit', {
      tuilanId,
      profile,
      variables,
      settlementResult,
      judgment: judgment ?? null,
    });
  } catch (err) {
    // Best-effort: log but don't block the user.
    console.warn('[jx3] submit failed:', err);
  }
}

/**
 * Get the cached card image URL for a 推栏号.
 *
 * @throws {AppError} if the submission or image doesn't exist.
 */
export async function getCardImage(
  tuilanId: string,
): Promise<Jx3CardImageResult> {
  const res = await jx3Http.get<{ code: number; data?: Jx3CardImageResult }>(
    `/api/jx3/card/${encodeURIComponent(tuilanId)}`,
  );
  if (res.code !== 0 || !res.data) {
    throw new AppError({
      code: 'JX3_CARD_NOT_FOUND',
      message: '名片图片未找到',
      requestId: '',
      status: 404,
    });
  }
  return res.data;
}

/**
 * Submit an appeal with a screenshot upload (multipart/form-data).
 *
 * Uses raw fetch because the axios client forces JSON content-type.
 */
export async function submitJx3Appeal(
  tuilanId: string,
  screenshot: File,
  reason?: string,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('tuilanId', tuilanId);
  formData.append('screenshot', screenshot);
  if (reason) formData.append('reason', reason);

  const res = await fetch(`${JX3_API_BASE_URL}/api/jx3/appeal`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const body = await res.json();
  if (!res.ok || body.code !== 0) {
    throw new AppError({
      code: 'JX3_APPEAL_FAILED',
      message: body.message ?? '申诉提交失败',
      requestId: '',
      status: res.status,
    });
  }
  return { id: body.data?.id ?? '' };
}

// ── AI 判语生成 ──────────────────────────────────────────────────────

/** AI 判语接口的响应数据。 */
export interface Jx3JudgmentResult {
  judgment: string;
  model: string;
  latencyMs: number;
}

/** AI 判语接口的响应包络。 */
interface Jx3JudgmentResponse {
  code: number | string;
  message: string;
  data?: Jx3JudgmentResult;
}

/**
 * 调用后端 AI 服务生成社交名片判语。
 *
 * 后端再转发到火山方舟 ark-code-latest；前端不直接持有 API Key。
 *
 * @param mbti 玩家 MBTI（如 'INTJ'），可为空字符串
 * @param choices 5 道游戏观题的选项字母数组（如 ['A','B','C','D','A']）
 * @returns AI 生成的判语文本 + 元信息
 * @throws {AppError} 当后端返回 503 (AI 未配置/失败) 时抛错，调用方应回退到 getGameViewDesc
 */
export async function generateJudgment(
  mbti: string,
  choices: string[],
): Promise<Jx3JudgmentResult> {
  try {
    const res = await jx3Http.post<Jx3JudgmentResponse>('/api/jx3/judgment', {
      mbti,
      choices,
    });
    if (res.code !== 0 || !res.data) {
      throw new AppError({
        code: 'JX3_JUDGMENT_FAILED',
        message: res.message || 'AI 判语生成失败',
        requestId: '',
        status: 503,
      });
    }
    return res.data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError({
      code: 'JX3_JUDGMENT_NETWORK',
      message: err instanceof Error ? err.message : 'AI 判语服务不可达',
      requestId: '',
      status: 0,
    });
  }
}
