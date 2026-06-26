/**
 * AudioManager - DOM-aware audio manager for the player.
 *
 * Singleton that manages BGM and one-shot SFX using the native HTMLAudioElement.
 * Decoupled from the pure GameEngine so the engine stays framework-agnostic.
 *
 * Features ported from the legacy implementation:
 * - Single BGM instance with crossfade on switch.
 * - One-shot SFX with fade-out.
 * - Mobile autoplay unlock (best-effort).
 */

/** Callback type for state changes (unused externally but available). */
export type AudioStateListener = (playing: boolean) => void;

interface PendingBgm {
  url: string;
  volume: number;
}

export class AudioManager {
  private static instance: AudioManager | null = null;

  private bgm: HTMLAudioElement | null = null;
  private currentBgmUrl: string | null = null;
  private sfx: HTMLAudioElement | null = null;
  private currentSfxUrl: string | null = null;
  private isAudioUnlocked = false;
  private pendingBgm: PendingBgm | null = null;
  private listeners: Set<AudioStateListener> = new Set();
  private fadeTimers: ReturnType<typeof setTimeout>[] = [];

  /** Get the singleton instance. */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Reset the singleton (for tests). */
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
      return;
    }
    this.setupMobileUnlock();
  }

  /** Play a background music track with crossfade. */
  playBgm(url: string, volume = 0.5): void {
    if (typeof window === 'undefined') return;
    if (this.currentBgmUrl === url) return;

    // Fade out existing BGM.
    if (this.bgm) {
      this.fadeOut(this.bgm, 800);
      this.bgm = null;
    }

    this.currentBgmUrl = url;
    if (!url) return;

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    audio.crossOrigin = 'anonymous';
    this.bgm = audio;

    const attemptPlay = (): void => {
      void audio.play().then(() => {
        this.fadeIn(audio, volume, 800);
        this.notify(true);
      }).catch(() => {
        // Autoplay blocked; queue for retry on user interaction.
        this.pendingBgm = { url, volume };
      });
    };

    if (!this.isAudioUnlocked) {
      this.pendingBgm = { url, volume };
      return;
    }

    attemptPlay();
  }

  /** Play a one-shot sound effect. */
  playSfx(url: string, volume = 1): void {
    if (typeof window === 'undefined' || !url) return;
    if (this.sfx && this.currentSfxUrl !== url) {
      this.fadeOut(this.sfx, 300);
    }
    this.currentSfxUrl = url;
    const audio = new Audio(url);
    audio.volume = 0;
    audio.crossOrigin = 'anonymous';
    this.sfx = audio;
    void audio.play().then(() => {
      this.fadeIn(audio, volume, 200);
    }).catch(() => {
      // Ignore blocked autoplay.
    });
    audio.addEventListener('ended', () => {
      if (this.sfx === audio) {
        this.sfx = null;
        this.currentSfxUrl = null;
      }
    });
  }

  /** Stop and unload all audio. */
  stopAll(): void {
    for (const timer of this.fadeTimers) clearTimeout(timer);
    this.fadeTimers = [];
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.src = '';
      this.bgm = null;
    }
    if (this.sfx) {
      this.sfx.pause();
      this.sfx.src = '';
      this.sfx = null;
    }
    this.currentBgmUrl = null;
    this.currentSfxUrl = null;
    this.pendingBgm = null;
    this.notify(false);
  }

  /** Subscribe to playing-state changes. Returns an unsubscribe function. */
  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Attempt to unlock audio playback after a user gesture. */
  unlock(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }
    const resumePending = (): void => {
      this.isAudioUnlocked = true;
      if (this.pendingBgm) {
        this.playBgm(this.pendingBgm.url, this.pendingBgm.volume);
        this.pendingBgm = null;
      }
    };

    // Already unlocked: just resume any pending BGM.
    if (this.isAudioUnlocked) {
      resumePending();
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const tempAudio = new Audio();
      tempAudio.volume = 0;
      void tempAudio
        .play()
        .then(() => {
          tempAudio.pause();
          resumePending();
          resolve(true);
        })
        .catch(() => {
          // Mark unlocked anyway; user has interacted.
          resumePending();
          resolve(true);
        });
    });
  }

  // ---- Internal helpers --------------------------------------------------

  private isMobile(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  private setupMobileUnlock(): void {
    if (typeof document === 'undefined') return;
    const unlock = (): void => {
      void this.unlock();
    };
    document.body.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.body.addEventListener('click', unlock, { once: true });
  }

  private fadeIn(audio: HTMLAudioElement, target: number, durationMs: number): void {
    const steps = 10;
    const stepMs = durationMs / steps;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        audio.volume = target;
        clearInterval(timer);
      } else {
        audio.volume = current;
      }
    }, stepMs);
    this.fadeTimers.push(timer);
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
        audio.volume = current;
      }
    }, stepMs);
    this.fadeTimers.push(timer);
  }

  private notify(playing: boolean): void {
    for (const listener of this.listeners) {
      listener(playing);
    }
  }
}

/** Convenience accessor for the singleton. */
export function getAudioManager(): AudioManager {
  return AudioManager.getInstance();
}
