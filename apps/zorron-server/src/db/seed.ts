import { db } from '../config/database';
import { users, projects, assets } from './schema';
import { logger } from '../shared/logger';
import { hash } from 'bcrypt';
import sampleProject from './sample-project.json';
import { FlowDataSchema } from '../modules/project/flow-data.schema';

/**
 * Converts the legacy project.json (exported from the Chinese Vue 3 editor)
 * into the FlowData shape used by the React editor, while preserving all
 * original extension fields (fragments, sectAnchors, meta, viewport).
 */
function convertLegacyProject(input: typeof sampleProject) {
  const nodes = input.nodes.map((node: any) => {
    const { initialized, ...rest } = node;
    const { data } = rest;

    switch (rest.type) {
      case 'start': {
        data.coverUrl = data.coverUrl ?? data.cover ?? data.background ?? undefined;
        break;
      }
      case 'scene': {
        data.backgroundUrl = data.backgroundUrl ?? data.background ?? undefined;
        data.characterUrl = data.characterUrl ?? data.character ?? undefined;
        data.spiritGuide = data.spiritGuide ?? undefined;
        data.focusObject = data.focusObject ?? undefined;
        data.isBackgroundRemote = data.isBackgroundRemote ?? undefined;
        data.isSpiritGuideRemote = data.isSpiritGuideRemote ?? undefined;
        data.isFocusObjectRemote = data.isFocusObjectRemote ?? undefined;
        data.interaction = data.interaction ?? data.interactionType ?? 'tap';
        if (Array.isArray(data.choices)) {
          data.choices = data.choices.map((choice: any) => ({
            ...choice,
            interaction: choice.interaction ?? choice.interactionType ?? 'tap',
          }));
        }
        break;
      }
      case 'setter': {
        data.assignments = [
          {
            variable: data.varName ?? '',
            value: data.value ?? 0,
            operator: data.operator ?? data.action ?? 'set',
          },
        ];
        break;
      }
      case 'calculator': {
        data.vector = data.vector ?? { x: 0, y: 0, z: 0 };
        break;
      }
      case 'settlement': {
        const resultMapping: any[] = [];
        if (Array.isArray(data.buttons)) {
          for (const btn of data.buttons) {
            resultMapping.push({
              resultId: btn.id,
              title: btn.label,
              description: '',
              condition: '',
            });
          }
        }
        if (resultMapping.length === 0 && Array.isArray(data.variableModifiers)) {
          for (const mod of data.variableModifiers) {
            resultMapping.push({
              resultId: mod.variableName ?? 'result',
              title: mod.variableName ?? '结果',
              description: '',
              condition: '',
            });
          }
        }
        data.resultMapping = resultMapping;
        break;
      }
      case 'video': {
        data.videoUrl = data.videoUrl ?? data.videoSrc ?? '';
        data.skipAllowed = data.skipAllowed ?? data.skipable ?? true;
        break;
      }
      case 'link': {
        data.title = data.title ?? data.label ?? '';
        break;
      }
      default:
        break;
    }

    return rest;
  });

  const edges = input.edges.map((edge: any) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
  }));

  const variables: Record<string, number> = {};
  for (const v of input.globalVariables ?? []) {
    variables[v.name] = Number(v.initialValue) ?? 0;
  }

  const settings = {
    title: input.meta?.title ?? '示例项目',
    description: input.meta?.version ?? '',
    bgmUrl: input.globalBgm ?? '',
    vectorSpace: {
      enabled: (input.sectAnchors ?? []).length > 0,
      dimensions: { x: 'X', y: 'Y', z: 'Z' },
      sects: (input.sectAnchors ?? []).map((sect: any) => ({
        id: sect.id,
        name: sect.name,
        vector: sect.anchor,
        title: sect.name,
        description: '',
        resultTexts: sect.resultTexts,
      })),
    },
  };

  return {
    nodes,
    edges,
    variables,
    settings,
    version: input.meta?.version ?? '1.0.0',
    // Preserve legacy extension fields so the sample content is fully copied.
    position: input.position,
    zoom: input.zoom,
    viewport: input.viewport,
    meta: input.meta,
    fragments: input.fragments,
    sectAnchors: input.sectAnchors,
    savedAt: input.savedAt,
    globalBgm: input.globalBgm,
    globalVariables: input.globalVariables,
  };
}

/**
 * Seeds the local development database with a sample user, project, and asset.
 *
 * Run with `pnpm --filter zorron-server db:seed`.
 */
async function seed() {
  logger.info('Seeding development data from legacy sample project...');

  // Clean up previous seed data so the sample can be fully re-imported.
  await db.delete(users);

  const passwordHash = await hash('dev123456', 10);

  const [user] = await db
    .insert(users)
    .values({
      email: 'dev@zorron.io',
      passwordHash,
      nickname: 'Zorron Dev',
    })
    .returning();

  const flowData = convertLegacyProject(sampleProject as any);

  const parsed = FlowDataSchema.safeParse(flowData);
  if (!parsed.success) {
    logger.error({ errors: parsed.error.errors }, 'FlowData validation failed');
    throw new Error('FlowData validation failed');
  }

  const [project] = await db
    .insert(projects)
    .values({
      ownerId: user.id,
      title: flowData.settings.title,
      description: '从旧版中文 Vue3 编辑器迁移的完整示例项目',
      coverUrl: null,
      isPublished: true,
      data: flowData as any,
    })
    .returning();

  await db.insert(assets).values({
    ownerId: user.id,
    projectId: project.id,
    name: 'placeholder.png',
    type: 'image',
    mimeType: 'image/png',
    size: 0,
    storageKey: 'placeholders/placeholder.png',
    url: 'http://localhost:3000/uploads/placeholders/placeholder.png',
    metadata: {},
  });

  logger.info({ userId: user.id, projectId: project.id }, 'Seed complete');
}

seed()
  .then(async () => {
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error(err, 'Seed failed');
    process.exit(1);
  });
