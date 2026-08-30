import { describe, it, expect } from 'vitest';
import { parseMinigameToHost } from '../src/protocols/minigameProtocol.js';

describe('minigameProtocol', () => {
  it('parses valid ready, score, and complete messages', () => {
    const readyMsg = { type: 'zorron:minigame:ready', gameId: 'sword-game' };
    expect(parseMinigameToHost(readyMsg)).toEqual(readyMsg);

    const scoreMsg = {
      type: 'zorron:minigame:score',
      payload: { score: 95, details: { combo: 12 } },
    };
    expect(parseMinigameToHost(scoreMsg)).toEqual(scoreMsg);

    const completeMsg = {
      type: 'zorron:minigame:complete',
      payload: { success: true, score: 100 },
    };
    expect(parseMinigameToHost(completeMsg)).toEqual(completeMsg);
  });

  it('returns null for unknown or malformed messages', () => {
    expect(parseMinigameToHost({ type: 'unknown:message' })).toBeNull();
    expect(parseMinigameToHost(null)).toBeNull();
    expect(parseMinigameToHost({ type: 'zorron:minigame:score', payload: 'invalid' })).toBeNull();
  });
});
