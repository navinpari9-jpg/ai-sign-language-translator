export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class SpeechService {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    return window.speechSynthesis.getVoices();
  }

  public speak(text: string, options: SpeechOptions = {}): boolean {
    if (!this.isSupported || !text.trim()) return false;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    if (options.voiceURI) {
      const voices = this.getVoices();
      const match = voices.find((v) => v.voiceURI === options.voiceURI);
      if (match) utterance.voice = match;
    }

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
    return true;
  }

  public pause(): void {
    if (this.isSupported) window.speechSynthesis.pause();
  }

  public resume(): void {
    if (this.isSupported) window.speechSynthesis.resume();
  }

  public stop(): void {
    if (this.isSupported) window.speechSynthesis.cancel();
  }

  public getSupported(): boolean {
    return this.isSupported;
  }
}

export const speechService = new SpeechService();
