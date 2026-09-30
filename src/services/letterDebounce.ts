export type DebounceState = 'IDLE' | 'CONFIRMING' | 'ADDED' | 'HOLDING' | 'RELEASE_DETECTED';

export interface DebounceStatus {
  shouldAdd: boolean;
  letter: string | null;
  state: DebounceState;
  message: string;
  heldLetter: string | null;
}

export class LetterDebounceManager {
  private currentHeldLetter: string | null = null;
  private isAwaitingRelease = false;
  private consecutiveFrames = 0;
  private requiredFrames = 4; // ~130ms confirmation at 30 FPS
  private lastState: DebounceState = 'IDLE';

  /**
   * Evaluates frame for letter confirmation and release detection
   * Prevents repeated additions while the user continues holding the same sign.
   */
  public processFrame(detectedLetter: string | null, isStable: boolean): DebounceStatus {
    // 1. Release detected: hand absent, transitioning, or invalid letter
    if (!detectedLetter || !isStable || detectedLetter === 'UNKNOWN' || detectedLetter === 'NO_HAND') {
      if (this.isAwaitingRelease) {
        this.isAwaitingRelease = false;
        this.currentHeldLetter = null;
        this.consecutiveFrames = 0;
        this.lastState = 'RELEASE_DETECTED';
        return {
          shouldAdd: false,
          letter: null,
          state: 'RELEASE_DETECTED',
          message: 'Hand released. Ready for next letter.',
          heldLetter: null,
        };
      }
      this.currentHeldLetter = null;
      this.consecutiveFrames = 0;
      this.lastState = 'IDLE';
      return {
        shouldAdd: false,
        letter: null,
        state: 'IDLE',
        message: 'Position hand in guide box to begin.',
        heldLetter: null,
      };
    }

    // 2. User continues holding the same letter: BLOCK duplicates
    if (this.isAwaitingRelease && this.currentHeldLetter === detectedLetter) {
      this.lastState = 'HOLDING';
      return {
        shouldAdd: false,
        letter: null,
        state: 'HOLDING',
        message: `Holding '${detectedLetter}' — release hand before typing again.`,
        heldLetter: detectedLetter,
      };
    }

    // 3. User switched to a DIFFERENT letter
    if (this.currentHeldLetter !== detectedLetter) {
      this.currentHeldLetter = detectedLetter;
      this.consecutiveFrames = 1;
      this.isAwaitingRelease = false;
      this.lastState = 'CONFIRMING';
      return {
        shouldAdd: false,
        letter: null,
        state: 'CONFIRMING',
        message: `Detecting '${detectedLetter}' (1/${this.requiredFrames})...`,
        heldLetter: detectedLetter,
      };
    }

    // 4. Accumulate confirmation frames for current letter
    this.consecutiveFrames++;
    if (this.consecutiveFrames >= this.requiredFrames && !this.isAwaitingRelease) {
      this.isAwaitingRelease = true;
      this.lastState = 'ADDED';
      return {
        shouldAdd: true,
        letter: detectedLetter,
        state: 'ADDED',
        message: `Confirmed and added letter '${detectedLetter}'.`,
        heldLetter: detectedLetter,
      };
    }

    this.lastState = 'CONFIRMING';
    return {
      shouldAdd: false,
      letter: null,
      state: 'CONFIRMING',
      message: `Confirming '${detectedLetter}' (${this.consecutiveFrames}/${this.requiredFrames})...`,
      heldLetter: detectedLetter,
    };
  }

  public reset(): void {
    this.currentHeldLetter = null;
    this.isAwaitingRelease = false;
    this.consecutiveFrames = 0;
    this.lastState = 'IDLE';
  }

  public forceAddCurrent(): string | null {
    if (!this.currentHeldLetter) return null;
    const l = this.currentHeldLetter;
    this.isAwaitingRelease = true;
    return l;
  }

  public isHolding(): boolean {
    return this.isAwaitingRelease;
  }
}

export const letterDebounce = new LetterDebounceManager();
