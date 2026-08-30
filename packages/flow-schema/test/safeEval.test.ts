import { describe, it, expect } from 'vitest';
import { evaluateGuard } from '../src/evaluator/safeEval.js';

describe('evaluateGuard', () => {
  it('evaluates simple boolean and numeric conditions', () => {
    const context = {
      variables: { affection: 85, is_vip: true, gold: 50 },
      fragments: ['sword_fragment_1', 'token_tang'],
      vector: { courage: 10 },
      history: ['node-start', 'node-choice-1'],
    };

    expect(evaluateGuard('variables.affection >= 80', context)).toBe(true);
    expect(evaluateGuard('variables.affection < 50', context)).toBe(false);
    expect(evaluateGuard('variables.is_vip == true && variables.gold >= 50', context)).toBe(true);
  });

  it('evaluates array transforms like has()', () => {
    const context = {
      variables: {},
      fragments: ['fragment_a', 'fragment_b'],
      vector: {},
      history: ['n1', 'n2'],
    };

    expect(evaluateGuard('fragments|has("fragment_a")', context)).toBe(true);
    expect(evaluateGuard('fragments|has("fragment_missing")', context)).toBe(false);
  });

  it('handles empty, null or undefined expressions gracefully by allowing transition', () => {
    const context = { variables: {} };
    expect(evaluateGuard('', context)).toBe(true);
    expect(evaluateGuard(undefined, context)).toBe(true);
    expect(evaluateGuard(null, context)).toBe(true);
  });

  it('fails safely (returns false) on invalid syntax without throwing', () => {
    const context = { variables: {} };
    expect(evaluateGuard('(((invalid &&& syntax', context)).toBe(false);
  });
});
