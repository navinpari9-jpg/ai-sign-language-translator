import { ConfidenceFactors, confidenceCalculator } from './confidenceCalculator';
import {
  ExtractedGestureFeatures,
  HandDetectionResult,
  RawClassifierResult,
  RecognitionMode,
  SmoothedRecognitionResult,
} from '../types';

export interface FramePredictionEntry {
  sign: string;
  meaning: string;
  classifierScore: number;
  timestamp: number;
  isRecognized: boolean;
  explanation: string;
  mode: RecognitionMode;
}

export class TemporalSmoother {
  private bufferSize: number;
  private minStableFrames: number;
  private buffer: FramePredictionEntry[] = [];
  private lastStableSign: string | null = null;
  private stableSince: number | null = null;

  constructor(bufferSize = 12, minStableFrames = 5) {
    this.bufferSize = bufferSize;
    this.minStableFrames = minStableFrames;
  }

  /**
   * Clears the rolling frame buffer (e.g. on camera pause or reset)
   */
  public reset(): void {
    this.buffer = [];
    this.lastStableSign = null;
    this.stableSince = null;
  }

  /**
   * Ingest a frame's raw classification and hand detection signals,
   * returning smoothed, stabilized result.
   */
  public pushFrame(
    rawResult: RawClassifierResult,
    detection: HandDetectionResult,
    latencyMs: number,
    fps: number,
    features?: ExtractedGestureFeatures,
    mode: RecognitionMode = 'VOCABULARY'
  ): SmoothedRecognitionResult {
    const now = Date.now();

    // 1. If no hand was detected in this frame
    if (detection.handsCount === 0) {
      this.buffer.push({
        sign: 'NO_HAND',
        meaning: '',
        classifierScore: 0,
        timestamp: now,
        isRecognized: false,
        explanation: 'No hand detected in the camera frame.',
        mode,
      });
      if (this.buffer.length > this.bufferSize) this.buffer.shift();

      this.lastStableSign = null;
      this.stableSince = null;

      return {
        sign: 'NO_HAND',
        meaning: '',
        status: 'NO_HAND',
        stabilityScore: 0,
        finalConfidence: 0,
        confidenceLevel: 'LOW',
        isStable: false,
        consecutiveFrames: 0,
        message: detection.qualityMessage || 'No hand detected',
        latencyMs,
        fps,
        signType: 'UNKNOWN',
        mode,
        landmarks: [],
        boundingBoxes: [],
        verificationStatus: 'NOT_NEEDED',
        timestamp: now,
        rejectionReason: 'No hand visible in frame',
      };
    }

    // 2. Immediate confirmation for verified dynamic gestures (e.g. J and Z)
    if (rawResult.signType === 'DYNAMIC' && rawResult.isRecognized) {
      const dynamicConfidence = Math.round(rawResult.score * 100);
      return {
        sign: rawResult.topSign,
        meaning: rawResult.meaning,
        status: 'STABLE',
        stabilityScore: 95,
        finalConfidence: dynamicConfidence,
        confidenceLevel: dynamicConfidence >= 75 ? 'HIGH' : 'MEDIUM',
        isStable: true,
        consecutiveFrames: 6,
        message: `Dynamic motion verified: ${rawResult.topSign}`,
        latencyMs,
        fps,
        signType: 'DYNAMIC',
        mode: 'DYNAMIC_ALPHABET',
        landmarks: detection.landmarks,
        boundingBoxes: detection.boundingBoxes,
        verificationStatus: 'NOT_NEEDED',
        timestamp: now,
        fingerStates: features?.fingerStates,
        palmOrientation: features?.palmOrientation,
        candidateScores: rawResult.allCandidates,
      };
    }

    // 3. Add current prediction to rolling buffer
    this.buffer.push({
      sign: rawResult.topSign,
      meaning: rawResult.meaning,
      classifierScore: rawResult.score,
      timestamp: now,
      isRecognized: rawResult.isRecognized,
      explanation: rawResult.explanation,
      mode,
    });
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // 4. Count occurrences of each sign in rolling window
    const counts: Record<string, number> = {};
    let totalScoreForTop = 0;
    this.buffer.forEach((entry) => {
      counts[entry.sign] = (counts[entry.sign] || 0) + 1;
    });

    // Find majority candidate in buffer
    let majoritySign = 'UNKNOWN';
    let maxCount = 0;
    for (const [sign, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        majoritySign = sign;
      }
    }

    // Compute temporal consistency ratio (0.0 to 1.0)
    const temporalConsistency = maxCount / this.buffer.length;

    // Consecutive frames of the majority sign at the end of the buffer
    let consecutiveFrames = 0;
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].sign === majoritySign) {
        consecutiveFrames++;
        totalScoreForTop += this.buffer[i].classifierScore;
      } else {
        break;
      }
    }

    const avgClassifierScore = consecutiveFrames > 0 ? totalScoreForTop / consecutiveFrames : 0;

    // Hand visibility & image quality factor
    const imageQuality = Math.min(1.0, detection.lightingScore * (detection.isInsideGuide ? 1.0 : 0.6));
    const poseStability = Math.min(1.0, detection.motionBlurScore);

    // Calculate model margin between top two candidates
    const sortedScores = Object.values(rawResult.allCandidates || {}).sort((a, b) => b - a);
    const topScore = sortedScores[0] || 0;
    const secondScore = sortedScores[1] || 0;
    const modelMargin = rawResult.marginDelta ?? Math.max(0, topScore - secondScore);

    const confidenceFactors: ConfidenceFactors = {
      landmarkConfidence: detection.isInsideGuide ? 0.95 : 0.70,
      classifierConfidence: avgClassifierScore,
      temporalConsistency,
      poseStability,
      imageQuality,
      modelMargin,
    };

    const isRecognized =
      majoritySign !== 'UNKNOWN' &&
      majoritySign !== 'NO_HAND' &&
      !rawResult.isAmbiguous &&
      rawResult.isRecognized;

    const confidence = confidenceCalculator.calculate(confidenceFactors, isRecognized);

    // Stability calculation: Requires consecutive frames and consistency
    const stabilityScore = Math.round(temporalConsistency * 100);
    const isStable =
      consecutiveFrames >= this.minStableFrames &&
      temporalConsistency >= 0.7 &&
      isRecognized &&
      detection.isInsideGuide &&
      detection.motionBlurScore >= 0.55;

    // Status assignment
    let status: 'STABLE' | 'TRANSITIONING' | 'UNKNOWN' | 'NO_HAND' = 'TRANSITIONING';
    let message = 'Hold sign steady to confirm.';

    if (!isRecognized || rawResult.isAmbiguous) {
      status = 'UNKNOWN';
      message =
        rawResult.rejectionReason ||
        (detection.qualityMessage !== 'Hand detected' ? detection.qualityMessage || 'Unclear gesture' : 'Sign not recognized');
    } else if (isStable) {
      status = 'STABLE';
      message = `Stable sign detected (${consecutiveFrames} frames)`;
      this.lastStableSign = majoritySign;
      if (!this.stableSince) this.stableSince = now;
    } else {
      status = 'TRANSITIONING';
      message = `Stabilizing... (${consecutiveFrames}/${this.minStableFrames} frames)`;
    }

    const latestMeaning = this.buffer[this.buffer.length - 1]?.meaning || rawResult.meaning;

    return {
      sign: isStable ? majoritySign : isRecognized ? majoritySign : 'UNKNOWN',
      meaning: isRecognized ? latestMeaning : '',
      status,
      stabilityScore,
      finalConfidence: confidence.score,
      confidenceLevel: confidence.level,
      isStable,
      consecutiveFrames,
      message,
      latencyMs,
      fps,
      signType: rawResult.signType,
      mode,
      fingerStates: features?.fingerStates,
      palmOrientation: features?.palmOrientation,
      candidateScores: rawResult.allCandidates,
      topCandidates: rawResult.topCandidates,
      marginDelta: modelMargin,
      isAmbiguous: rawResult.isAmbiguous,
      rejectionReason: rawResult.rejectionReason,
      landmarks: detection.landmarks,
      boundingBoxes: detection.boundingBoxes,
      verificationStatus: 'NOT_NEEDED',
      timestamp: now,
    };
  }
}

export const temporalSmoother = new TemporalSmoother(12, 5);
