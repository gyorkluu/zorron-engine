import { describe, it, expect } from 'vitest';
import { GameEngine } from './GameEngine';
import type { FlowData } from '@/types/flow';

describe('GameEngine - Stage 2.0 & Snapshot Hardening', () => {
  const createTestFlowData = (): FlowData => ({
    nodes: [
      {
        id: 'start_0',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { label: 'Start' },
      },
      {
        id: 'stage_intro',
        type: 'stage',
        position: { x: 200, y: 0 },
        data: {
          label: 'Opening Stage',
          carrier: {
            type: 'video',
            url: 'https://example.com/intro.mp4',
            timeRange: [0, 5],
          },
          interaction: {
            dialogue: {
              speaker: 'Guider',
              text: 'Welcome to the martial arts world.',
              voiceUrl: 'https://example.com/voice1.mp3',
            },
            choices: [
              {
                id: 'choice_swordsman',
                text: 'Join Swordsman Sect',
                targetNodeId: 'stage_sword',
              },
              {
                id: 'choice_locked',
                text: 'Secret Route (Need 80 Love)',
                targetNodeId: 'stage_secret',
                guard: 'variables.love >= 80',
              },
            ],
          },
          flow: {
            mutations: [{ variable: 'visited_intro', operator: 'set', value: true }],
            preloadNext: ['stage_sword'],
          },
        },
      },
      {
        id: 'stage_sword',
        type: 'stage',
        position: { x: 400, y: -100 },
        data: {
          label: 'Sword Mountain',
          carrier: {
            type: 'image',
            url: 'https://example.com/sword.png',
          },
          interaction: {
            dialogue: {
              speaker: 'Master',
              text: 'You have chosen the path of the sword.',
            },
            choices: [],
          },
          flow: {
            mutations: [{ variable: 'sect', operator: 'set', value: 'sword' }],
          },
        },
      },
      {
        id: 'stage_secret',
        type: 'stage',
        position: { x: 400, y: 100 },
        data: {
          label: 'Hidden Cave',
          carrier: {
            type: 'image',
            url: 'https://example.com/secret.png',
          },
          interaction: {
            dialogue: {
              speaker: 'Mystery Elder',
              text: 'You discovered the hidden truth.',
            },
            choices: [],
          },
          flow: {
            mutations: [{ variable: 'found_secret', operator: 'set', value: true }],
          },
        },
      },
    ],
    edges: [
      { id: 'e0', source: 'start_0', target: 'stage_intro' },
      { id: 'e1', source: 'stage_intro', target: 'stage_sword', sourceHandle: 'choice_swordsman' },
      { id: 'e2', source: 'stage_intro', target: 'stage_secret', sourceHandle: 'choice_locked' },
    ],
    variables: { love: 50 },
    settings: {},
    version: '2.0.0',
  });

  it('enters stage node, applies mutations, records backlog, and locks guarded choices', () => {
    const flowData = createTestFlowData();
    const engine = new GameEngine(flowData);

    const state = engine.start();
    expect(state.currentNodeId).toBe('start_0');

    // Advance to stage_intro
    engine.advanceFromStart();
    const introState = engine.getState();
    expect(introState.currentNodeId).toBe('stage_intro');
    expect(introState.currentNodeType).toBe('stage');
    expect(introState.stage?.carrier.url).toBe('https://example.com/intro.mp4');
    expect(introState.variables.visited_intro).toBe(true);

    // Backlog verification
    const backlog = engine.getBacklog();
    expect(backlog.length).toBe(1);
    expect(backlog[0].speaker).toBe('Guider');
    expect(backlog[0].text).toBe('Welcome to the martial arts world.');

    // Choices verification: choice_locked is locked because love is 50 (< 80)
    expect(introState.choices.length).toBe(2);
    expect(introState.choices[0].id).toBe('choice_swordsman');
    expect(introState.choices[0].isLocked).toBe(false);
    expect(introState.choices[1].id).toBe('choice_locked');
    expect(introState.choices[1].isLocked).toBe(true);
  });

  it('prevents selecting a locked choice until condition is met', () => {
    const flowData = createTestFlowData();
    const engine = new GameEngine(flowData);
    engine.start();
    (engine as any).enterNode('stage_intro');

    // Attempt to select locked choice
    const beforeState = engine.getState();
    engine.selectChoice('choice_locked');
    expect(engine.getState().currentNodeId).toBe('stage_intro'); // Remains on intro

    // Modify variables to satisfy guard
    engine.applyVariables({ love: 90 });
    // Re-evaluate or select
    (engine as any).enterNode('stage_intro');
    expect(engine.getState().choices[1].isLocked).toBe(false);

    engine.selectChoice('choice_locked');
    expect(engine.getState().currentNodeId).toBe('stage_secret');
    expect(engine.getState().variables.found_secret).toBe(true);
  });

  it('creates full snapshot and accurately restores engine state', () => {
    const flowData = createTestFlowData();
    const engine = new GameEngine(flowData);
    engine.start();
    (engine as any).enterNode('stage_intro');
    engine.selectChoice('choice_swordsman');

    expect(engine.getState().currentNodeId).toBe('stage_sword');
    expect(engine.getState().variables.sect).toBe('sword');

    // Snapshot
    const snap = engine.snapshot({ bgmUrl: 'https://example.com/bgm.mp3', bgmPositionSec: 12.5 });
    expect(snap.schemaVersion).toBe('2.0.0');
    expect(snap.currentNodeId).toBe('stage_sword');
    expect(snap.variables.sect).toBe('sword');
    expect(snap.backlog.length).toBe(2); // intro + sword
    expect(snap.bgmPositionSec).toBe(12.5);

    // Create fresh engine instance and restore
    const freshEngine = new GameEngine(flowData);
    freshEngine.restore(snap);

    const restoredState = freshEngine.getState();
    expect(restoredState.currentNodeId).toBe('stage_sword');
    expect(restoredState.variables.sect).toBe('sword');
    expect(freshEngine.getBacklog().length).toBe(2);
  });
});
