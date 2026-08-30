import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager, getAudioManager } from './AudioManager';

describe('AudioManager - 4-Channel Mixing & Audio Ducking', () => {
  beforeEach(() => {
    AudioManager.resetInstance();
  });

  it('provides singleton instance and allows track assignment', () => {
    const manager = getAudioManager();
    expect(manager).toBeDefined();

    manager.playBgm('https://example.com/bgm.mp3', 0.8);
    expect(manager.getCurrentBgmUrl()).toBe('https://example.com/bgm.mp3');

    manager.playAmbient('https://example.com/rain.mp3', 0.5);
    manager.playSfx('https://example.com/click.mp3');

    manager.stopAll();
    expect(manager.getCurrentBgmUrl()).toBeNull();
  });
});
