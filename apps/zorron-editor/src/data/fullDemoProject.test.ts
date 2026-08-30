import { describe, it, expect } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { fullDemoFlowData } from './fullDemoProject';

describe('《剑网3·风起稻香》AI 互动影游 Full Demo Execution Suite', () => {
  it('executes Path A: 拔剑相助 -> 侠义赋值 -> 评分 -> 逻辑分支 -> 浩气盟终幕 -> 结算 -> 外链', () => {
    const engine = new GameEngine(fullDemoFlowData);
    engine.start();

    // 1. Start Node
    expect(engine.getState().currentNodeType).toBe('start');
    expect(engine.getState().start?.title).toBe('《风起稻香》交互试炼');

    // 2. Advance from start -> Stage 1 (Prologue)
    engine.advanceFromStart();
    expect(engine.getState().currentNodeType).toBe('stage');
    expect(engine.getState().stage?.interaction?.dialogue?.speaker).toBe('莫雨');
    expect(engine.getState().choices).toHaveLength(2);
    expect(engine.getState().choices[0].text).toContain('拔剑相助');

    // 3. Select Choice 1 (拔剑相助 -> setter_chivalry)
    engine.selectChoice('c_fight');

    // Setter executes automatically and routes to rating_eval
    expect(engine.getState().variables.chivalry).toBe(20);
    expect(engine.getState().variables.courage).toBe(15);
    expect(engine.getState().variables.faction_affinity).toBe('haogi');

    // 4. Rating Stage
    expect(engine.getState().currentNodeType).toBe('rating');
    engine.submitRating(5);
    expect(engine.getState().variables.self_rating).toBe(5);

    // 5. Logic Branch: chivalry >= 20 -> stage_haogi_end
    expect(engine.getState().currentNodeType).toBe('stage');
    expect(engine.getState().stage?.interaction?.dialogue?.speaker).toBe('谢渊');
    expect(engine.getState().stage?.fx?.filter).toBe('bloom');

    // 6. Select Settle Choice -> Settlement Node
    engine.selectChoice('c_settle_1');
    expect(engine.getState().currentNodeType).toBe('settlement');
    expect(engine.getState().settlementResult?.title).toBeDefined();

    // 7. Advance from Settlement -> Link Node
    engine.advanceFromSettlement();
    expect(engine.getState().currentNodeType).toBe('link');
    expect(engine.getState().link?.url).toBe('https://jx3.xoyo.com');
  });

  it('executes Path B: 寻找机关 -> QTE热区 -> 小游戏 -> 多选线索 -> 战术排序 -> 尊号录入 -> 评分 -> 逍遥终幕', () => {
    const engine = new GameEngine(fullDemoFlowData);
    engine.start();

    // 1. Start -> Prologue
    engine.advanceFromStart();
    expect(engine.getState().currentNodeType).toBe('stage');

    // 2. Select Choice 2 (寻找机关 -> stage_qte_hitbox)
    engine.selectChoice('c_puzzle');
    expect(engine.getState().currentNodeType).toBe('stage');
    expect(engine.getState().stage?.fx?.filter).toBe('heartbeat');
    expect(engine.getState().stage?.interaction?.hitboxes).toHaveLength(1);

    // 3. Trigger Hitbox / QTE (青龙机关石 -> minigame_lockpick)
    engine.advanceFromStage('minigame_lockpick');
    expect(engine.getState().currentNodeType).toBe('minigame');
    expect(engine.getState().minigame?.minigameId).toBe('nine-grid-puzzle');

    // 4. Complete Minigame -> multi_evidence
    engine.completeMinigame(true);
    expect(engine.getState().currentNodeType).toBe('multi-select');
    expect(engine.getState().multiSelect?.options).toHaveLength(3);

    // 5. Submit Multi-Select -> rank_tactics
    engine.submitMultiSelect(['opt_scroll']);
    expect(engine.getState().currentNodeType).toBe('rank-order');
    expect(engine.getState().rankOrder?.items).toHaveLength(3);

    // 6. Submit Rank Order -> input_name
    engine.submitRankOrder(['t1', 't2', 't3']);
    expect(engine.getState().currentNodeType).toBe('text-input');

    // 7. Submit Text Input -> rating_eval
    engine.submitTextInput('剑纯天下第一');
    expect(engine.getState().variables.player_name).toBe('剑纯天下第一');
    expect(engine.getState().currentNodeType).toBe('rating');

    // 8. Submit Rating -> Logic Branch (chivalry is not >= 20 -> stage_neutral_end)
    engine.submitRating(4);
    expect(engine.getState().currentNodeType).toBe('stage');
    expect(engine.getState().stage?.interaction?.dialogue?.speaker).toBe('东方宇轩');
    expect(engine.getState().stage?.fx?.filter).toBe('sepia');

    // 9. Select Settle Choice -> Settlement Node
    engine.selectChoice('c_settle_2');
    expect(engine.getState().currentNodeType).toBe('settlement');

    // 10. Settlement -> Link Node
    engine.advanceFromSettlement();
    expect(engine.getState().currentNodeType).toBe('link');
  });
});
