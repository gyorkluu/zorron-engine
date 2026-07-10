import { describe, it, expect } from 'vitest';
import { settlementStrategyRegistry, STRATEGY_IDS } from './settlementStrategies';
import type { SettlementContext } from './settlementStrategies';
import type { ResultAnchor, SettlementNodeData, Variables } from '@/types/flow';

const anchors: ResultAnchor[] = [
  { id: 'a1', name: 'Alpha', vector: { x: 1, y: 1, z: 1 }, title: 'Alpha' },
  { id: 'a2', name: 'Beta', vector: { x: -1, y: -1, z: -1 }, title: 'Beta' },
  { id: 'a3', name: 'Gamma', vector: { x: 2, y: 0, z: 0 }, title: 'Gamma' },
];

function makeCtx(overrides: Partial<SettlementContext> = {}): SettlementContext {
  return {
    finalVector: { x: 1, y: 1, z: 1 },
    magnitude: 1.732,
    quadrant: '+++',
    variables: {} as Variables,
    fragments: new Set<string>(),
    anchors,
    nodeData: { label: 'settlement', resultMapping: [] },
    ...overrides,
  };
}

describe('settlementStrategies', () => {
  describe('vector-nearest strategy', () => {
    it('finds the nearest anchor by Euclidean distance', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.VECTOR_NEAREST)!;
      const output = strategy.execute(makeCtx({ finalVector: { x: 1, y: 1, z: 1 } }));
      expect(output.anchor?.id).toBe('a1');
      expect(output.distance).toBe(0);
    });

    it('returns null anchor when no anchors exist', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.VECTOR_NEAREST)!;
      const output = strategy.execute(makeCtx({ anchors: [] }));
      expect(output.anchor).toBeNull();
      expect(output.distance).toBe(Infinity);
    });

    it('resolves mapping by anchor id', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.VECTOR_NEAREST)!;
      const nodeData = {
        label: 's',
        resultMapping: [
          { resultId: 'a2', title: 'Beta Ending' },
          { resultId: 'a1', title: 'Alpha Ending' },
        ],
      } as SettlementNodeData;
      const output = strategy.execute(makeCtx({ nodeData, finalVector: { x: 1, y: 1, z: 1 } }));
      expect(output.mapping?.title).toBe('Alpha Ending');
    });
  });

  describe('threshold strategy', () => {
    it('matches the first anchor whose threshold rule is satisfied', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.THRESHOLD)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          rules: [
            { axisId: 'x', operator: '>=', value: 2, anchorId: 'a3' },
            { axisId: 'x', operator: '>=', value: 1, anchorId: 'a1' },
          ],
        },
      } as unknown as SettlementNodeData;
      const output = strategy.execute(makeCtx({ nodeData, finalVector: { x: 3, y: 0, z: 0 } }));
      expect(output.anchor?.id).toBe('a3');
    });

    it('returns null when no rule matches', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.THRESHOLD)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          rules: [{ axisId: 'x', operator: '>=', value: 100, anchorId: 'a1' }],
        },
      } as unknown as SettlementNodeData;
      const output = strategy.execute(makeCtx({ nodeData, finalVector: { x: 1 } }));
      expect(output.anchor).toBeNull();
    });
  });

  describe('count-tally strategy', () => {
    it('matches the anchor with the most matching fragments', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.COUNT_TALLY)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          tallyBy: 'fragments',
          mappings: [
            { fragmentId: 'frag_a', anchorId: 'a1' },
            { fragmentId: 'frag_b', anchorId: 'a1' },
            { fragmentId: 'frag_c', anchorId: 'a2' },
          ],
        },
      } as unknown as SettlementNodeData;
      const fragments = new Set(['frag_a', 'frag_b']);
      const output = strategy.execute(makeCtx({ nodeData, fragments }));
      expect(output.anchor?.id).toBe('a1');
    });

    it('matches the anchor with the highest variable sum', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.COUNT_TALLY)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          tallyBy: 'variable',
          mappings: [
            { variableName: 'courage', anchorId: 'a1' },
            { variableName: 'wisdom', anchorId: 'a2' },
          ],
        },
      } as unknown as SettlementNodeData;
      const variables = { courage: 10, wisdom: 5 } as unknown as Variables;
      const output = strategy.execute(makeCtx({ nodeData, variables }));
      expect(output.anchor?.id).toBe('a1');
    });
  });

  describe('variable-map strategy', () => {
    it('matches the first anchor whose variable rule is satisfied', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.VARIABLE_MAP)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          variableName: 'alignment',
          rules: [
            { operator: '>=', value: 10, anchorId: 'a1' },
            { operator: '<', value: 0, anchorId: 'a2' },
          ],
        },
      } as unknown as SettlementNodeData;
      const variables = { alignment: 15 } as unknown as Variables;
      const output = strategy.execute(makeCtx({ nodeData, variables }));
      expect(output.anchor?.id).toBe('a1');
    });

    it('falls back to fallbackAnchorId when no rule matches', () => {
      const strategy = settlementStrategyRegistry.get(STRATEGY_IDS.VARIABLE_MAP)!;
      const nodeData = {
        label: 's',
        resultMapping: [],
        strategyConfig: {
          variableName: 'alignment',
          rules: [{ operator: '>=', value: 100, anchorId: 'a1' }],
          fallbackAnchorId: 'a3',
        },
      } as unknown as SettlementNodeData;
      const variables = { alignment: 5 } as unknown as Variables;
      const output = strategy.execute(makeCtx({ nodeData, variables }));
      expect(output.anchor?.id).toBe('a3');
    });
  });

  describe('registry', () => {
    it('resolves undefined strategy id to vector-nearest', () => {
      const strategy = settlementStrategyRegistry.resolve(undefined);
      expect(strategy.id).toBe('vector-nearest');
    });

    it('resolves unknown strategy id to vector-nearest', () => {
      const strategy = settlementStrategyRegistry.resolve('nonexistent');
      expect(strategy.id).toBe('vector-nearest');
    });

    it('lists all 4 built-in strategies', () => {
      const list = settlementStrategyRegistry.list();
      expect(list).toHaveLength(4);
      expect(list.map((s) => s.id)).toContain('vector-nearest');
      expect(list.map((s) => s.id)).toContain('threshold');
      expect(list.map((s) => s.id)).toContain('count-tally');
      expect(list.map((s) => s.id)).toContain('variable-map');
    });
  });
});
