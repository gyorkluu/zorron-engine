/**
 * test-jx3-api.ts
 *
 * Probe the three Xoyo endpoints used for 推栏号 → 角色信息 lookup:
 *   1. /user/s/fetch-role-person  — search by personNum (推栏号)
 *   2. /user/home-page/multi-role — fetch grade / mmr / pvpType / zone / server ...
 *   3. /badge/get-role-card-preset — fetch encrypted card-preset URL
 *
 * Run: bun run scripts/test-jx3-api.ts
 */

import crypto from 'node:crypto';

// ── Signature constants (from jx3_buy/time_sync.py, same source as rank-update.ts) ──

const SIGN_KEY = 'MaYoaMQ3zpWJFWtN9mqJqKpHrkdFwLd9DDlFWk2NnVR1mChVRI6THVe6KsCnhpoR';
const SIGN_SALT = '@#?.#@';

// Token taken from the captured http_req_*.hcy files (actual successful request).
const TOKEN = '4d4b4f79a22d4e2cb9ef86c19f1598be:pvxx103:kingsoft::oNh8++POiQjJm94+SOBJfA==';
const DEVICE_ID = 'oNh8++POiQjJm94+SOBJfA==';

const HOST = 'm.pvp.xoyo.com';
const BASE_HEADERS: Record<string, string> = {
  Host: HOST,
  accept: 'application/json',
  deviceid: DEVICE_ID,
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
  token: TOKEN,
};

/** Generate UTC timestamp string YYYYMMDDHHmmssSSS (matches rank-update.ts getts()). */
function getts(): string {
  const d = new Date();
  const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60_000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${utc.getFullYear()}${pad(utc.getMonth() + 1)}${pad(utc.getDate())}` +
    `${pad(utc.getHours())}${pad(utc.getMinutes())}${pad(utc.getSeconds())}${pad(utc.getMilliseconds(), 3)}`
  );
}

/**
 * HMAC-SHA256 signature, identical to rank-update.ts signRequest().
 *   message = JSON.stringify(body) + SIGN_SALT
 *   sig = HMAC-SHA256(SIGN_KEY, message).hex().lower()
 */
function signRequest(body: unknown): string {
  const message = JSON.stringify(body) + SIGN_SALT;
  return crypto.createHmac('sha256', SIGN_KEY).update(message, 'utf8').digest('hex').toLowerCase();
}

function buildHeaders(body: unknown): Record<string, string> {
  return { ...BASE_HEADERS, 'x-sk': signRequest(body) };
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const bodyStr = JSON.stringify(body);
  const headers = buildHeaders(body);
  const url = `https://${HOST}${path}`;
  console.log(`\n[REQ] POST ${url}`);
  console.log(`      body = ${bodyStr}`);
  console.log(`      x-sk = ${headers['x-sk']}`);
  const res = await fetch(url, { method: 'POST', headers, body: bodyStr });
  const text = await res.text();
  console.log(`[RES] status=${res.status} len=${text.length}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    return { _raw: text } as unknown as T;
  }
}

// ── Response types (from captured responses) ──

interface RolePerson {
  id: string;            // personId
  nickName: string;
  personNum: number;     // 推栏号
  avatarUrl: string;
  role: {
    zone: string;
    server: string;
    force: string;       // 门派/心法，如 "明教"
    bodyType: string;    // 体型，如 "萝莉"
    roleName: string;     // 角色名（游戏ID）
  };
}

interface FetchRolePersonRes {
  code: number;
  msg: string;
  tag?: string;
  data?: RolePerson[];
}

interface MultiRole {
  bodily: string;        // 体型
  camp: string;           // 阵营
  force: string;          // 心法
  forceId: number;
  gameGlobalRoleId: string;
  gameName: string;
  gameRoleId: string;
  grade: string;           // 段位，如 "十五段"
  mmr: string;
  name: string;
  personId: string;
  pvpType: string;          // "3v3"
  ranking: string;
  server: string;
  totalCount: string;
  winRate: string;
  zone: string;
}

interface MultiRoleRes {
  code: number;
  msg: string;
  tag?: string;
  data?: { jx3: MultiRole };
}

interface CardPresetRes {
  code: number;
  msg: string;
  tag?: string;
  data?: {
    praiseTotalCount: number;
    showCardPresetUrl: string;  // encrypted URL
  };
}

// ── Main ──

async function main(): Promise<void> {
  const personNum = process.argv[2] ?? '5209305';
  console.log(`\n=== JX3 API probe — personNum=${personNum} ===`);

  // Step 1: search by 推栏号
  const step1Body = { query: personNum, pageSize: 10, PageIndex: 1, ts: getts() };
  const step1 = await postJson<FetchRolePersonRes>('/user/s/fetch-role-person', step1Body);
  console.log('[STEP1] fetch-role-person:');
  console.log(JSON.stringify(step1, null, 2));

  if (step1.code !== 0 || !step1.data || step1.data.length === 0) {
    console.log('\n[STOP] Step 1 failed or empty.');
    return;
  }
  const person = step1.data[0];
  const personId = person.id;
  console.log(`\n  personId   = ${personId}`);
  console.log(`  nickName   = ${person.nickName}`);
  console.log(`  role.zone  = ${person.role.zone}`);
  console.log(`  role.server= ${person.role.server}`);
  console.log(`  role.force = ${person.role.force}`);
  console.log(`  role.body  = ${person.role.bodyType}`);
  console.log(`  role.name  = ${person.role.roleName}`);

  // Step 2: fetch multi-role info (grade / mmr / zone / server / etc.)
  const step2Body = { personId, ts: getts() };
  const step2 = await postJson<MultiRoleRes>('/user/home-page/multi-role', step2Body);
  console.log('\n[STEP2] home-page/multi-role:');
  console.log(JSON.stringify(step2, null, 2));

  if (step2.code === 0 && step2.data?.jx3) {
    const r = step2.data.jx3;
    console.log(`\n  grade      = ${r.grade}`);
    console.log(`  pvpType    = ${r.pvpType}`);
    console.log(`  mmr        = ${r.mmr}`);
    console.log(`  ranking    = ${r.ranking}`);
    console.log(`  winRate    = ${r.winRate}`);
    console.log(`  zone       = ${r.zone}`);
    console.log(`  server     = ${r.server}`);
    console.log(`  force      = ${r.force}`);
    console.log(`  bodily     = ${r.bodily}`);
    console.log(`  gameRoleId = ${r.gameRoleId}`);
    console.log(`  gameGlobalRoleId = ${r.gameGlobalRoleId}`);
  }

  // Step 3: fetch card-preset (needs gameGlobalRoleId + gameRoleId + zone + server)
  if (step2.code === 0 && step2.data?.jx3) {
    const r = step2.data.jx3;
    const step3Body = {
      game_global_role_id: r.gameGlobalRoleId,
      game_role_id: r.gameRoleId,
      zone: r.zone,
      server: r.server,
      ts: getts(),
    };
    const step3 = await postJson<CardPresetRes>('/badge/get-role-card-preset', step3Body);
    console.log('\n[STEP3] get-role-card-preset:');
    console.log(JSON.stringify(step3, null, 2));
  }

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
