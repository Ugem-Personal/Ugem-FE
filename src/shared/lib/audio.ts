/**
 * Web Audio API based chime/notification sound player.
 * Uses native browser oscillators to produce a crisp 2-tone "Ding-Dong" POS order chime
 * without requiring any external MP3/WAV assets.
 */
class NotificationSoundEngine {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }

    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }

    return this.audioContext;
  }

  /**
   * Plays a pleasant 3-tone chime for incoming new orders (similar to Grab / ShopeeFood POS).
   */
  public playNewOrderSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      this.playTone(ctx, 659.25, now, 0.18, 0.3);

      // Note 2: G#5 (830.61 Hz)
      this.playTone(ctx, 830.61, now + 0.14, 0.18, 0.35);

      // Note 3: B5 (987.77 Hz)
      this.playTone(ctx, 987.77, now + 0.28, 0.45, 0.4);
    } catch (err) {
      console.warn("[AUDIO] Failed to play order chime:", err);
    }
  }

  /**
   * Plays a subtle notification beep for general updates.
   */
  public playNotificationSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      this.playTone(ctx, 587.33, now, 0.12, 0.2); // D5
      this.playTone(ctx, 880.0, now + 0.1, 0.25, 0.25); // A5
    } catch (err) {
      console.warn("[AUDIO] Failed to play notification sound:", err);
    }
  }

  private playTone(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const soundEngine = new NotificationSoundEngine();
