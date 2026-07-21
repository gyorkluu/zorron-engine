/**
 * jx3.route.ts
 *
 * Routes for the JX3 推栏号 lookup, submission, and appeal endpoints.
 *
 *   POST /api/jx3/lookup         — query Xoyo servers by 推栏号, return profile.
 *   GET  /api/jx3/check/:tuilanId — check if a submission already exists.
 *   POST /api/jx3/submit          — save a completed submission (downloads card image).
 *   POST /api/jx3/appeal          — submit an appeal with a screenshot.
 *   GET  /api/jx3/card/:tuilanId  — get the cached card image path.
 */

import { Elysia, t } from 'elysia';
import { logger } from '../../shared/logger';
import {
  lookupJx3Profile,
  checkJx3Submission,
  saveJx3Submission,
} from './jx3.service';
import { Jx3LookupError, type Jx3Profile } from './jx3.types';
import { Jx3LookupRequestSchema } from './jx3.schema';
import { jx3Appeals } from '../../db/schema';
import { db } from '../../config/database';
import { env } from '../../config/env';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const jx3Route = new Elysia({ prefix: '/api/jx3' })
  // ── POST /lookup — query Xoyo by 推栏号 ──
  .post(
    '/lookup',
    async ({ body, set }) => {
      const parsed = Jx3LookupRequestSchema.safeParse(body);
      if (!parsed.success) {
        set.status = 400;
        return {
          code: 'JX3_001',
          message: parsed.error.issues[0]?.message ?? '请求参数无效',
        };
      }

      try {
        const profile = await lookupJx3Profile(parsed.data.tuilanId);
        set.status = 200;
        return {
          code: 0,
          message: 'success',
          data: profile,
        };
      } catch (err) {
        if (err instanceof Jx3LookupError) {
          if (err.code === 'NOT_FOUND') {
            set.status = 404;
          } else {
            set.status = 502;
          }
          logger.warn(
            { tag: 'jx3.route', code: err.code, msg: err.message },
            'JX3 lookup failed',
          );
          return {
            code: err.code,
            message: err.message,
          };
        }
        logger.error(
          { tag: 'jx3.route', err: (err as Error).message },
          'JX3 lookup unexpected error',
        );
        set.status = 500;
        return {
          code: 'INTERNAL',
          message: '服务器内部错误',
        };
      }
    },
    {
      body: t.Object({
        tuilanId: t.String(),
      }),
      detail: {
        summary: '查询推栏号对应的 JX3 玩家资料',
        description:
          '通过推栏号调用西山居 m.pvp.xoyo.com 三步接口链，聚合返回玩家资料（区服、门派、体型、段位等），供前端自动跳过已知节点。',
        tags: ['JX3'],
      },
    },
  )

  // ── GET /check/:tuilanId — duplicate detection ──
  .get(
    '/check/:tuilanId',
    async ({ params }) => {
      const submission = await checkJx3Submission(params.tuilanId);
      if (submission) {
        return {
          code: 0,
          exists: true,
          data: {
            tuilanId: submission.tuilanId,
            cardImagePath: submission.cardImagePath,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt,
          },
        };
      }
      return { code: 0, exists: false };
    },
    {
      detail: {
        summary: '检查推栏号是否已有提交记录',
        description: '用于重复检测：如果推栏号已存在提交，前端显示"修改信息"或"申诉"按钮。',
        tags: ['JX3'],
      },
    },
  )

  // ── POST /submit — save a completed submission ──
  .post(
    '/submit',
    async ({ body, set }) => {
      const { tuilanId, profile, variables, settlementResult } = body;
      if (!tuilanId || !tuilanId.trim()) {
        set.status = 400;
        return { code: 'JX3_002', message: '推栏号不能为空' };
      }
      try {
        const saved = await saveJx3Submission(
          tuilanId,
          (profile as Jx3Profile | null) ?? null,
          variables as Record<string, unknown>,
          settlementResult,
        );
        return { code: 0, message: 'success', data: saved };
      } catch (err) {
        logger.error(
          { tag: 'jx3.route', err: (err as Error).message },
          'JX3 submit failed',
        );
        set.status = 500;
        return { code: 'INTERNAL', message: '保存提交失败' };
      }
    },
    {
      body: t.Object({
        tuilanId: t.String(),
        profile: t.Optional(t.Any()),
        variables: t.Any(),
        settlementResult: t.Optional(t.Any()),
      }),
      detail: {
        summary: '保存完成的 JX3 社交名片测试结果',
        description:
          '用户完成测试后调用。后端会下载并缓存推栏名片图片，然后将提交记录保存到数据库。',
        tags: ['JX3'],
      },
    },
  )

  // ── GET /card/:tuilanId — get cached card image path ──
  .get(
    '/card/:tuilanId',
    async ({ params, set }) => {
      // 1. Check if the file physically exists first to support proactive lookup preview
      const filename = `${params.tuilanId}.png`;
      const localPath = join(env.STORAGE_LOCAL_ROOT, 'jx3-cards', filename);
      const fileExists = await access(localPath).then(() => true).catch(() => false);
      
      if (fileExists) {
        return {
          code: 0,
          data: {
            tuilanId: params.tuilanId,
            cardImagePath: `/uploads/jx3-cards/${filename}`,
            cardImageUrl: `${env.STORAGE_BASE_URL.replace('/uploads', '')}/uploads/jx3-cards/${filename}`,
          },
        };
      }

      // 2. Fall back to checking the database submission record
      const submission = await checkJx3Submission(params.tuilanId);
      if (!submission) {
        set.status = 404;
        return { code: 'NOT_FOUND', message: '未找到该推栏号的提交记录' };
      }
      if (!submission.cardImagePath) {
        set.status = 404;
        return { code: 'NOT_FOUND', message: '名片图片尚未下载' };
      }
      return {
        code: 0,
        data: {
          tuilanId: submission.tuilanId,
          cardImagePath: submission.cardImagePath,
          cardImageUrl: `${env.STORAGE_BASE_URL.replace('/uploads', '')}${submission.cardImagePath}`,
        },
      };
    },
    {
      detail: {
        summary: '获取推栏名片图片路径',
        tags: ['JX3'],
      },
    },
  )

  // ── POST /appeal — submit an appeal with screenshot ──
  .post(
    '/appeal',
    async ({ body, set }) => {
      const { tuilanId, reason } = body;
      const screenshot = body.screenshot as File;

      if (!tuilanId || !tuilanId.trim()) {
        set.status = 400;
        return { code: 'JX3_003', message: '推栏号不能为空' };
      }
      if (!screenshot || screenshot.size === 0) {
        set.status = 400;
        return { code: 'JX3_004', message: '请上传截图' };
      }

      try {
        // Save screenshot to uploads/jx3-appeals/
        const ext = screenshot.name
          ? screenshot.name.slice(screenshot.name.lastIndexOf('.'))
          : '.png';
        const filename = `${tuilanId}_${randomUUID().slice(0, 8)}${ext}`;
        const dir = join(env.STORAGE_LOCAL_ROOT, 'jx3-appeals');
        await mkdir(dir, { recursive: true });
        const buffer = Buffer.from(await screenshot.arrayBuffer());
        await writeFile(join(dir, filename), buffer);

        const screenshotPath = `/uploads/jx3-appeals/${filename}`;

        // Insert appeal record
        const [appeal] = await db
          .insert(jx3Appeals)
          .values({
            tuilanId,
            screenshotPath,
            reason: reason ?? null,
            status: 'pending',
          })
          .returning();

        logger.info(
          { tag: 'jx3.route', tuilanId, appealId: appeal.id },
          'JX3 appeal submitted',
        );

        return { code: 0, message: '申诉已提交，我们会尽快处理', data: { id: appeal.id } };
      } catch (err) {
        logger.error(
          { tag: 'jx3.route', err: (err as Error).message },
          'JX3 appeal failed',
        );
        set.status = 500;
        return { code: 'INTERNAL', message: '申诉提交失败' };
      }
    },
    {
      body: t.Object({
        tuilanId: t.String(),
        reason: t.Optional(t.String()),
        screenshot: t.Any(),
      }),
      type: 'multipart/form-data',
      detail: {
        summary: '提交申诉（含截图）',
        description:
          '当推栏号已有提交记录但用户认为数据有误或账号归属有争议时，提交申诉截图供人工审核。',
        tags: ['JX3'],
      },
    },
  );
