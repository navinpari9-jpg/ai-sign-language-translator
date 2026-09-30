import { extractFeaturesFromLandmarks } from '../ml/featureExtractor';
import { ExtractedGestureFeatures, HandLandmarks } from '../types';

export class GestureFeatureService {
  public extract(
    primaryLandmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks,
    motionVelocities?: {
      indexTip?: { vx: number; vy: number };
      pinkyTip?: { vx: number; vy: number };
      wrist?: { vx: number; vy: number };
    }
  ): ExtractedGestureFeatures {
    return extractFeaturesFromLandmarks(primaryLandmarks, secondaryLandmarks, motionVelocities);
  }
}

export const gestureFeatures = new GestureFeatureService();
