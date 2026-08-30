import { describe, it, expect } from 'vitest';
import { migrateV1ToV2 } from '../src/migration/migrateV1ToV2.js';

describe('migrateV1ToV2', () => {
  it('migrates legacy video, scene, and minigame nodes to stage nodes', () => {
    const v1FlowData = {
      version: '1.0.0',
      nodes: [
        {
          id: 'v1-video',
          type: 'video',
          position: { x: 100, y: 100 },
          data: {
            label: '片头视频',
            videoUrl: 'https://cdn.example.com/op.mp4',
            autoPlay: true,
            skipAllowed: true,
          },
        },
        {
          id: 'v1-scene',
          type: 'scene',
          position: { x: 300, y: 100 },
          data: {
            label: '主线对话',
            dialogue: '天下风云出我辈。',
            speaker: '东方不败',
            backgroundUrl: 'https://cdn.example.com/bg.jpg',
            bgm: 'https://cdn.example.com/bgm.mp3',
            choices: [
              { id: 'c1', text: '一剑破万法', targetNodeId: 'node-end' },
            ],
          },
        },
        {
          id: 'v1-minigame',
          type: 'minigame',
          position: { x: 500, y: 100 },
          data: {
            label: '比武切磋',
            gameUrl: 'https://cdn.example.com/game.html',
            scoreVariable: 'sword_score',
            passingScore: 80,
          },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'v1-video',
          target: 'v1-scene',
          data: { condition: 'variables.level > 1' },
        },
      ],
      variables: [
        { name: 'sword_score', type: 'number' as const, defaultValue: 0 },
      ],
      fragments: [],
    };

    const v2Data = migrateV1ToV2(v1FlowData);

    expect(v2Data.version).toBe('2.0.0');
    expect(v2Data.nodes).toHaveLength(3);

    // 1. Check video migration
    const videoStage = v2Data.nodes.find((n) => n.id === 'v1-video')!;
    expect(videoStage.type).toBe('stage');
    expect((videoStage.data as any).carrier).toEqual({
      type: 'video',
      url: 'https://cdn.example.com/op.mp4',
      loop: false,
      playbackRate: 1.0,
    });

    // 2. Check scene migration
    const sceneStage = v2Data.nodes.find((n) => n.id === 'v1-scene')!;
    expect(sceneStage.type).toBe('stage');
    expect((sceneStage.data as any).carrier).toEqual({
      type: 'image',
      url: 'https://cdn.example.com/bg.jpg',
      live2dConfigUrl: undefined,
    });
    expect((sceneStage.data as any).interaction.dialogue).toEqual({
      speaker: '东方不败',
      text: '天下风云出我辈。',
    });
    expect((sceneStage.data as any).fx.bgm).toEqual({
      url: 'https://cdn.example.com/bgm.mp3',
      fadeInMs: 1000,
      volume: 1.0,
    });

    // 3. Check minigame migration
    const minigameStage = v2Data.nodes.find((n) => n.id === 'v1-minigame')!;
    expect(minigameStage.type).toBe('stage');
    expect((minigameStage.data as any).carrier).toEqual({
      type: 'html-embed',
      url: 'https://cdn.example.com/game.html',
      sandbox: ['allow-scripts', 'allow-same-origin'],
    });

    // 4. Check edge migration
    expect(v2Data.edges[0].data?.guard).toBe('variables.level > 1');
  });

  it('preserves already version 2.0.0 data without modifications', () => {
    const v2Flow = {
      version: '2.0.0',
      nodes: [{ id: 's1', type: 'stage', position: { x: 0, y: 0 }, data: {} }],
      edges: [],
      variables: [],
      fragments: [],
    };

    const res = migrateV1ToV2(v2Flow as any);
    expect(res).toBe(v2Flow);
  });
});
