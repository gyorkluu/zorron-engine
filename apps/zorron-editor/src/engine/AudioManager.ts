/**
 * AudioManager - 4-Track Independent Audio的心流引擎.
 *
 * Provides 4 decoupled mixing channels:
 *  1. BGM: Background soundtrack with smooth crossfade & position tracking.
 *  2. Ambient: Environmental soundscapes (rain, wind, heartbeat).
 *  3. Voice: Dialogue acting with Audio Ducking (dips BGM -30% during speech).
 *  4. SFX: One-shot interactive sounds and QTE cues.
 *
 * Includes WebAudio touch unlock for iOS Safari and WeChat browser.
 */

export type AudioStateListener = (playing: boolean) => void;

/** The four independent mixing channels. */
export type AudioTrackName = 'bgm' | 'ambient' | 'voice' | 'sfx';

interface ChannelTrack {
  audio: HTMLAudioElement | null;
  url: string | null;
  baseVolume: number;
}

export class AudioManager {
  private static instance: AudioManager | null = null;

  private bgmTrack: ChannelTrack = { audio: null, url: null, baseVolume: 0.8 };
  private ambientTrack: ChannelTrack = { audio: null, url: null, baseVolume: 0.6 };
  private voiceTrack: ChannelTrack = { audio: null, url: null, baseVolume: 1.0 };
  private sfxTrack: ChannelTrack = { audio: null, url: null, baseVolume: 1.0 };

  /**
   * Player-controlled master multiplier per track (0–1). Applied on top of
   * each call's own volume so the settings dialog can rebalance the mix
   * without restarting whatever is playing.
   */
  private trackVolumes: Record<AudioTrackName, number> = {
    bgm: 1,
    ambient: 1,
    voice: 1,
    sfx: 1,
  };

  private isAudioUnlocked = false;
  private isDucking = false;
  private listeners: Set<AudioStateListener> = new Set();
  private fadeTimers: ReturnType<typeof setTimeout>[] = [];

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  static resetInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.stopAll();
    }
    AudioManager.instance = null;
  }

  private constructor() {
    if (typeof window === 'undefined') return;
    if (!this.isMobile()) {
      this.isAudioUnlocked = true;
    }
    this.setupMobileUnlock();
  }

  // ── 1. BGM 轨道 (Background Music) ────────────────────────────
  playBgm(url: string, volume = 0.8, fadeInMs = 1000): void {
    if (typeof window === 'undefined') return;
    if (this.bgmTrack.url === url && this.bgmTrack.audio && !this.bgmTrack.audio.paused) {
      return;
    }

    if (this.bgmTrack.audio) {
      this.fadeOut(this.bgmTrack.audio, fadeInMs / 2);
      this.bgmTrack.audio = null;
    }

    this.bgmTrack.url = url;
    this.bgmTrack.baseVolume = volume;
    if (!url) {
      this.notify(false);
      return;
    }

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audio.crossOrigin = 'anonymous';
    this.bgmTrack.audio = audio;

    const targetVol =
      (this.isDucking ? volume * 0.35 : volume) * this.trackVolumes.bgm;

    this.safePlay(audio)
      .then(() => {
        this.fadeIn(audio, targetVol, fadeInMs);
        this.notify(true);
      })
      .catch(() => {
        // Queue for touch unlock
      });
  }

  /**
   * Set a track's master volume multiplier (0–1).
   *
   * Takes effect immediately on anything currently playing and on every
   * subsequent `playXxx` call for that track.
   */
  setTrackVolume(track: AudioTrackName, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.trackVolumes[track] = clamped;

    const channel = this.channelFor(track);
    if (channel?.audio) {
      const duck = track === 'bgm' && this.isDucking ? 0.35 : 1;
      channel.audio.volume = channel.baseVolume * clamped * duck;
    }
  }

  /** Read a track's master volume multiplier. */
  getTrackVolume(track: AudioTrackName): number {
    return this.trackVolumes[track];
  }

  /** Resolve the channel record backing a track name. */
  private channelFor(track: AudioTrackName): ChannelTrack {
    switch (track) {
      case 'bgm':
        return this.bgmTrack;
      case 'ambient':
        return this.ambientTrack;
      case 'voice':
        return this.voiceTrack;
      default:
        return this.sfxTrack;
    }
  }

  getBgmPosition(): number {
    return this.bgmTrack.audio?.currentTime || 0;
  }

  getCurrentBgmUrl(): string | null {
    return this.bgmTrack.url;
  }

  // ── 2. Ambient 轨道 (环境音) ──────────────────────────────────
  playAmbient(url: string, volume = 0.6, fadeInMs = 1500): void {
    if (typeof window === 'undefined') return;
    if (this.ambientTrack.url === url && this.ambientTrack.audio) return;

    if (this.ambientTrack.audio) {
      this.fadeOut(this.ambientTrack.audio, 800);
      this.ambientTrack.audio = null;
    }

    this.ambientTrack.url = url;
    this.ambientTrack.baseVolume = volume;
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audio.crossOrigin = 'anonymous';
    this.ambientTrack.audio = audio;

    this.safePlay(audio)
      .then(() => {
        this.fadeIn(audio, volume * this.trackVolumes.ambient, fadeInMs);
      })
      .catch(() => {});
  }

  // ── 3. Voice 轨道与 Audio Ducking (台词配音) ────────────────────
  playVoice(url: string, volume = 1.0, onEnded?: () => void): void {
    if (typeof window === 'undefined' || !url) {
      onEnded?.();
      return;
    }

    if (this.voiceTrack.audio) {
      this.voiceTrack.audio.pause();
      this.voiceTrack.audio = null;
    }

    const audio = new Audio(url);
    audio.volume = volume * this.trackVolumes.voice;
    audio.crossOrigin = 'anonymous';
    this.voiceTrack.audio = audio;
    this.voiceTrack.url = url;

    // Apply Audio Ducking: lower BGM volume
    this.applyDucking(true);

    const handleEnded = () => {
      this.applyDucking(false);
      if (this.voiceTrack.audio === audio) {
        this.voiceTrack.audio = null;
        this.voiceTrack.url = null;
      }
      onEnded?.();
    };

    audio.addEventListener('ended', handleEnded, { once: true });
    audio.addEventListener('error', handleEnded, { once: true });

    this.safePlay(audio).catch(() => {
      handleEnded();
    });
  }

  stopVoice(): void {
    if (this.voiceTrack.audio) {
      this.voiceTrack.audio.pause();
      this.voiceTrack.audio = null;
      this.voiceTrack.url = null;
      this.applyDucking(false);
    }
  }

  // ── 4. SFX 轨道 (音效) ─────────────────────────────────────────
  playSfx(url: string, volume = 1.0): void {
    if (typeof window === 'undefined' || !url) return;
    const audio = new Audio(url);
    audio.volume = volume * this.trackVolumes.sfx;
    audio.crossOrigin = 'anonymous';
    this.sfxTrack.audio = audio;
    this.safePlay(audio).catch(() => {});
  }

  // ── Audio Ducking Controller ─────────────────────────────────
  private applyDucking(duck: boolean): void {
    this.isDucking = duck;
    if (!this.bgmTrack.audio) return;

    const base = duck
      ? this.bgmTrack.baseVolume * 0.35
      : this.bgmTrack.baseVolume;
    const targetVolume = base * this.trackVolumes.bgm;

    this.smoothVolume(this.bgmTrack.audio, targetVolume, 400);
  }

  // ── Global Controls & Lifecycle ──────────────────────────────
  stopAll(): void {
    for (const timer of this.fadeTimers) clearTimeout(timer);
    this.fadeTimers = [];

    const stopTrack = (track: ChannelTrack) => {
      if (track.audio) {
        track.audio.pause();
        track.audio.src = '';
        track.audio = null;
      }
      track.url = null;
    };

    stopTrack(this.bgmTrack);
    stopTrack(this.ambientTrack);
    stopTrack(this.voiceTrack);
    stopTrack(this.sfxTrack);

    this.isDucking = false;
    this.notify(false);
  }

  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    this.isAudioUnlocked = true;

    if (this.bgmTrack.url && (!this.bgmTrack.audio || this.bgmTrack.audio.paused)) {
      this.playBgm(this.bgmTrack.url, this.bgmTrack.baseVolume);
    }

    return Promise.resolve(true);
  }

  // ── Helpers ──────────────────────────────────────────────────
  private isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  private setupMobileUnlock(): void {
    if (typeof document === 'undefined') return;
    const unlock = () => {
      void this.unlock();
    };
    document.body.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.body.addEventListener('click', unlock, { once: true });
  }

  private fadeIn(audio: HTMLAudioElement, target: number, durationMs: number): void {
    this.smoothVolume(audio, target, durationMs);
  }

  private fadeOut(audio: HTMLAudioElement, durationMs: number): void {
    const startVolume = audio.volume;
    const steps = 10;
    const stepMs = durationMs / steps;
    const decrement = startVolume / steps;
    let current = startVolume;

    const timer = setInterval(() => {
      current -= decrement;
      if (current <= 0) {
        audio.pause();
        audio.src = '';
        clearInterval(timer);
      } else {
        audio.volume = Math.max(0, current);
      }
    }, stepMs);
    this.fadeTimers.push(timer);
  }

  private smoothVolume(audio: HTMLAudioElement, target: number, durationMs: number): void {
    const startVolume = audio.volume;
    const steps = 10;
    const stepMs = durationMs / steps;
    const delta = (target - startVolume) / steps;
    let current = startVolume;

    const timer = setInterval(() => {
      current += delta;
      if ((delta > 0 && current >= target) || (delta < 0 && current <= target)) {
        audio.volume = Math.min(1, Math.max(0, target));
        clearInterval(timer);
      } else {
        audio.volume = Math.min(1, Math.max(0, current));
      }
    }, stepMs);
    this.fadeTimers.push(timer);
  }

  private safePlay(audio: HTMLAudioElement): Promise<void> {
    try {
      const p = audio.play();
      if (p && typeof (p as any).then === 'function') {
        return p;
      }
      return Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  }

  private notify(playing: boolean): void {
    for (const listener of this.listeners) {
      listener(playing);
    }
  }
}

export function getAudioManager(): AudioManager {
  return AudioManager.getInstance();
}
