import { extractFeaturesFromLandmarks } from '../ml/featureExtractor';
import { ExtractedGestureFeatures, HandLandmarks } from '../types';

export class GestureFeatureService {
  public extract(primaryLandmarks: HandLandmarks, secondaryLandmarks?: HandLandmarks): ExtractedGestureFeatures {
    return extractFeaturesFromLandmarks(primaryLandmarks, secondaryLandmarks);
  }
}

export const gestureFeatures = new GestureFeatureService();
