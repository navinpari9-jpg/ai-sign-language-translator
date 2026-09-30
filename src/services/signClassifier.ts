import { modelLoader } from '../ml/modelLoader';
import { aslAlphabetClassifier } from '../ml/aslAlphabetClassifier';
import { tfjsModelClassifier } from '../ml/tfjsModelClassifier';
import { prototypeClassifier } from '../ml/classifier';
import { alphabetMotionTracker } from './alphabetMotionTracker';
import { DYNAMIC_SIGNS, SIGN_MEANINGS } from '../ml/labels';
import {
  ExtractedGestureFeatures,
  HandLandmarks,
  RawClassifierResult,
  RecognitionMode,
  SignType,
} from '../types';

export class SignClassifierService {
  /**
   * Route classification using trained deep learning model where available,
   * with J/Z motion sequence detection and transparent geometric development fallbacks.
   */
  public classify(
    features: ExtractedGestureFeatures,
    primaryLandmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks,
    mode: RecognitionMode = 'VOCABULARY'
  ): RawClassifierResult {
    if (!primaryLandmarks || primaryLandmarks.length < 21) {
      return {
        topSign: 'UNKNOWN',
        meaning: SIGN_MEANINGS['UNKNOWN'],
        score: 0,
        signType: 'UNKNOWN',
        allCandidates: {},
        explanation: 'No landmarks provided for classification.',
        isRecognized: false,
        mode,
        rejectionReason: 'No hand landmarks detected',
      };
    }

    // 1. Dynamic J and Z trajectory analysis (sequence model)
    if (mode === 'ALPHABET' || mode === 'DYNAMIC_ALPHABET' || mode === 'HYBRID') {
      alphabetMotionTracker.pushFrame(primaryLandmarks);

      const isPinkyUp =
        features.fingersExtended.pinky &&
        !features.fingersExtended.index &&
        !features.fingersExtended.middle &&
        !features.fingersExtended.ring;

      const isIndexOnly =
        features.fingersExtended.index &&
        !features.fingersExtended.middle &&
        !features.fingersExtended.ring &&
        !features.fingersExtended.pinky;

      if (isPinkyUp || isIndexOnly) {
        const dynamicMatch = alphabetMotionTracker.evaluateTrajectory(isPinkyUp, isIndexOnly);
        if (dynamicMatch.isComplete && dynamicMatch.letter !== 'UNKNOWN') {
          return {
            topSign: dynamicMatch.letter,
            meaning: `ASL dynamic letter ${dynamicMatch.letter} (motion verified)`,
            score: dynamicMatch.confidence,
            signType: 'DYNAMIC',
            allCandidates: { [dynamicMatch.letter]: dynamicMatch.confidence },
            explanation: dynamicMatch.reason || `Detected complete trajectory for letter ${dynamicMatch.letter}`,
            isRecognized: true,
            mode: 'DYNAMIC_ALPHABET',
          };
        }
      }
    }

    // 2. Primary: Deep Neural Classifier (TensorFlow.js) if trained model loaded
    if (tfjsModelClassifier.isModelReady()) {
      const pred = tfjsModelClassifier.predictSync(features, primaryLandmarks);
      const allCandidates: Record<string, number> = {};
      pred.candidates.forEach((c) => {
        allCandidates[c.label] = c.probability;
      });

      const topCandidates = pred.candidates.slice(0, 3).map((c) => ({
        label: c.label,
        probability: Math.round(c.probability * 100) / 100,
      }));

      const isAlphabetLetter = pred.label.length === 1 && pred.label >= 'A' && pred.label <= 'Z';
      const isAmbiguous = Boolean(pred.reason?.includes('Ambiguous'));

      // Mode filtering for dedicated ALPHABET mode
      if (mode === 'ALPHABET' && !isAlphabetLetter && pred.label !== 'UNKNOWN') {
        const alphaCandidates = pred.candidates.filter(
          (c) => c.label.length === 1 && c.label >= 'A' && c.label <= 'Z'
        );
        const topAlpha = alphaCandidates[0];
        const secondAlpha = alphaCandidates[1];
        const alphaMargin = topAlpha && secondAlpha ? topAlpha.probability - secondAlpha.probability : topAlpha?.probability ?? 0;

        if (topAlpha && topAlpha.probability >= 0.70 && alphaMargin >= 0.10) {
          return {
            topSign: topAlpha.label,
            meaning: `ASL letter ${topAlpha.label}`,
            score: topAlpha.probability,
            signType: 'STATIC',
            allCandidates,
            topCandidates: alphaCandidates.slice(0, 3),
            marginDelta: alphaMargin,
            explanation: `Neural prediction (TF.js): ${topAlpha.label} (${(topAlpha.probability * 100).toFixed(0)}%)`,
            isRecognized: true,
            isAmbiguous: false,
            mode: 'ALPHABET',
          };
        }
      }

      if (!pred.isUnknown && pred.probability >= 0.70 && !isAmbiguous) {
        return {
          topSign: pred.label,
          meaning: pred.meaning || SIGN_MEANINGS[pred.label] || `ASL sign ${pred.label}`,
          score: pred.probability,
          signType: isAlphabetLetter ? 'STATIC' : 'STATIC',
          allCandidates,
          topCandidates,
          marginDelta: pred.marginDelta,
          explanation: `Neural prediction (TF.js): ${pred.label} (${(pred.probability * 100).toFixed(0)}%) with margin ${(pred.marginDelta * 100).toFixed(0)}%`,
          isRecognized: true,
          isAmbiguous: false,
          mode,
        };
      }

      // If neural model rejected as ambiguous or low probability
      return {
        topSign: 'UNKNOWN',
        meaning: 'Uncertain sign posture',
        score: pred.probability,
        signType: 'UNKNOWN',
        allCandidates,
        topCandidates,
        marginDelta: pred.marginDelta,
        explanation: pred.reason || 'Hand posture does not meet confidence threshold.',
        isRecognized: false,
        isAmbiguous,
        mode,
        rejectionReason: pred.reason || 'Low neural model confidence',
      };
    }

    // 3. Transparent Development Fallback (Geometric Rule-Based Baseline)
    if (mode === 'ALPHABET' || mode === 'DYNAMIC_ALPHABET') {
      const geoResult = aslAlphabetClassifier.classify(features, primaryLandmarks);
      return {
        ...geoResult,
        explanation: `[DEVELOPMENT GEOMETRIC FALLBACK] ${geoResult.explanation}`,
      };
    }

    if (mode === 'HYBRID') {
      const vocabResult = prototypeClassifier.predictRaw(features, primaryLandmarks, secondaryLandmarks);
      if (vocabResult.isRecognized && vocabResult.score >= 0.78) {
        return {
          ...vocabResult,
          mode: 'VOCABULARY',
          explanation: `[DEVELOPMENT GEOMETRIC FALLBACK] ${vocabResult.explanation}`,
        };
      }

      const alphabetResult = aslAlphabetClassifier.classify(features, primaryLandmarks);
      if (alphabetResult.isRecognized) {
        return {
          ...alphabetResult,
          explanation: `[DEVELOPMENT GEOMETRIC FALLBACK] ${alphabetResult.explanation}`,
        };
      }

      return {
        topSign: 'UNKNOWN',
        meaning: 'Unrecognized sign',
        score: Math.max(vocabResult.score, alphabetResult.score),
        signType: 'UNKNOWN',
        allCandidates: { ...vocabResult.allCandidates, ...alphabetResult.allCandidates },
        explanation: '[DEVELOPMENT FALLBACK] Hand posture does not match supported signs with confidence.',
        isRecognized: false,
        mode: 'HYBRID',
        rejectionReason: 'Below confidence threshold in both vocabulary and alphabet fallbacks',
      };
    }

    // Vocabulary Mode Fallback
    const result = prototypeClassifier.predictRaw(features, primaryLandmarks, secondaryLandmarks);
    return {
      ...result,
      mode: 'VOCABULARY',
      explanation: `[DEVELOPMENT GEOMETRIC FALLBACK] ${result.explanation}`,
    };
  }

  public checkDynamicSign(signName: string): { isDynamic: boolean; message?: string } {
    const isDynamic = DYNAMIC_SIGNS.includes(signName as any);
    if (isDynamic) {
      return {
        isDynamic: true,
        message: 'DYNAMIC SIGN — temporal movement sequence model required.',
      };
    }
    return { isDynamic: false };
  }
}

export const signClassifier = new SignClassifierService();
