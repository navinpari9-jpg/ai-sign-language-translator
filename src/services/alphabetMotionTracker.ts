import { HandLandmarks, Landmark3D } from '../types';
import { LANDMARK_INDEX, distance2D } from '../ml/featureExtractor';

export interface TrajectoryPoint {
  indexTip: Landmark3D;
  pinkyTip: Landmark3D;
  wrist: Landmark3D;
  timestamp: number;
}

export interface DynamicLetterMatch {
  letter: 'J' | 'Z' | 'UNKNOWN';
  confidence: number;
  isComplete: boolean;
  reason?: string;
}

export class AlphabetMotionTracker {
  private bufferSize: number;
  private history: TrajectoryPoint[] = [];
  private lastTriggerTime = 0;

  constructor(bufferSize = 25) {
    this.bufferSize = bufferSize;
  }

  public reset(): void {
    this.history = [];
    this.lastTriggerTime = 0;
  }

  public getTrajectory(): TrajectoryPoint[] {
    return [...this.history];
  }

  /**
   * Push current frame landmarks to trajectory buffer
   */
  public pushFrame(landmarks: HandLandmarks): void {
    if (!landmarks || landmarks.length < 21) {
      return;
    }

    const indexTip = landmarks[LANDMARK_INDEX.INDEX_TIP];
    const pinkyTip = landmarks[LANDMARK_INDEX.PINKY_TIP];
    const wrist = landmarks[LANDMARK_INDEX.WRIST];

    this.history.push({
      indexTip: { ...indexTip },
      pinkyTip: { ...pinkyTip },
      wrist: { ...wrist },
      timestamp: Date.now(),
    });

    if (this.history.length > this.bufferSize) {
      this.history.shift();
    }
  }

  /**
   * Analyze trajectory for J or Z motion
   * @param isPinkyUp true if pinky is extended and other fingers curled (J candidate)
   * @param isIndexOnly true if index is extended and other fingers curled (Z candidate)
   */
  public evaluateTrajectory(isPinkyUp: boolean, isIndexOnly: boolean): DynamicLetterMatch {
    const now = Date.now();
    // 1.5s cooldown after a successful dynamic letter recognition
    if (now - this.lastTriggerTime < 1500) {
      return { letter: 'UNKNOWN', confidence: 0, isComplete: false, reason: 'Motion cooldown active' };
    }

    if (this.history.length < 10) {
      return { letter: 'UNKNOWN', confidence: 0, isComplete: false, reason: 'Gathering motion frames...' };
    }

    // 1. Check for "J" Motion (Pinky traces a downward hook/curve)
    if (isPinkyUp) {
      const jResult = this.detectJTrajectory();
      if (jResult.isComplete && jResult.confidence >= 0.75) {
        this.lastTriggerTime = now;
        this.reset();
        return jResult;
      }
      if (jResult.confidence > 0.4) {
        return { letter: 'UNKNOWN', confidence: jResult.confidence, isComplete: false, reason: 'Incomplete J swoop gesture' };
      }
    }

    // 2. Check for "Z" Motion (Index traces zig-zag: right -> diagonal down-left -> right)
    if (isIndexOnly) {
      const zResult = this.detectZTrajectory();
      if (zResult.isComplete && zResult.confidence >= 0.75) {
        this.lastTriggerTime = now;
        this.reset();
        return zResult;
      }
      if (zResult.confidence > 0.4) {
        return { letter: 'UNKNOWN', confidence: zResult.confidence, isComplete: false, reason: 'Incomplete Z zig-zag gesture' };
      }
    }

    return { letter: 'UNKNOWN', confidence: 0, isComplete: false, reason: 'No dynamic gesture match' };
  }

  /**
   * Detects the J-shaped swoop: downward vertical movement followed by an upward/inward curve
   */
  private detectJTrajectory(): DynamicLetterMatch {
    const pts = this.history.map((h) => h.pinkyTip);
    if (pts.length < 10) {
      return { letter: 'UNKNOWN', confidence: 0, isComplete: false };
    }

    const startPt = pts[0];
    const midIdx = Math.floor(pts.length * 0.6);
    const midPt = pts[midIdx];
    const endPt = pts[pts.length - 1];

    // Downward movement in first half
    const deltaYDown = midPt.y - startPt.y; // positive Y is downward
    // Upward curve in second half
    const deltaYUp = midPt.y - endPt.y; // positive means end is higher than lowest dip
    // Lateral curve
    const deltaXCurve = Math.abs(endPt.x - midPt.x);

    let confidence = 0.5;
    if (deltaYDown > 0.08) confidence += 0.22;
    if (deltaYUp > 0.03) confidence += 0.15;
    if (deltaXCurve > 0.04) confidence += 0.12;

    const isComplete = deltaYDown > 0.08 && deltaYUp > 0.02 && deltaXCurve > 0.03;

    return {
      letter: isComplete ? 'J' : 'UNKNOWN',
      confidence: Math.min(0.96, confidence),
      isComplete,
      reason: isComplete ? 'Complete J swoop trajectory verified' : 'Incomplete J motion',
    };
  }

  /**
   * Detects the Z zig-zag:
   * Stroke 1: horizontal movement
   * Stroke 2: diagonal movement down & left
   * Stroke 3: horizontal movement right
   */
  private detectZTrajectory(): DynamicLetterMatch {
    const pts = this.history.map((h) => h.indexTip);
    if (pts.length < 12) {
      return { letter: 'UNKNOWN', confidence: 0, isComplete: false };
    }

    const n = pts.length;
    const seg1 = pts.slice(0, Math.floor(n * 0.35));
    const seg2 = pts.slice(Math.floor(n * 0.35), Math.floor(n * 0.70));
    const seg3 = pts.slice(Math.floor(n * 0.70));

    // Stroke 1: predominantly horizontal displacement
    const dx1 = seg1[seg1.length - 1].x - seg1[0].x;
    const dy1 = Math.abs(seg1[seg1.length - 1].y - seg1[0].y);

    // Stroke 2: diagonal down and reverse X
    const dx2 = seg2[seg2.length - 1].x - seg2[0].x;
    const dy2 = seg2[seg2.length - 1].y - seg2[0].y; // downward

    // Stroke 3: horizontal displacement in original direction
    const dx3 = seg3[seg3.length - 1].x - seg3[0].x;
    const dy3 = Math.abs(seg3[seg3.length - 1].y - seg3[0].y);

    let confidence = 0.45;
    // Check direction reversals and vertical drop
    const hasHorizontal1 = Math.abs(dx1) > 0.04 && dy1 < 0.08;
    const hasDiagonal2 = dy2 > 0.04 && Math.sign(dx2) !== Math.sign(dx1);
    const hasHorizontal3 = Math.abs(dx3) > 0.03 && Math.sign(dx3) === Math.sign(dx1);

    if (hasHorizontal1) confidence += 0.2;
    if (hasDiagonal2) confidence += 0.2;
    if (hasHorizontal3) confidence += 0.15;

    const isComplete = hasHorizontal1 && hasDiagonal2 && hasHorizontal3;

    return {
      letter: isComplete ? 'Z' : 'UNKNOWN',
      confidence: Math.min(0.95, confidence),
      isComplete,
      reason: isComplete ? 'Complete Z zig-zag trajectory verified' : 'Incomplete Z motion',
    };
  }
}

export const alphabetMotionTracker = new AlphabetMotionTracker(25);
