import { ExtractedGestureFeatures, HandLandmarks, SignType } from '../types';

export interface CandidatePrediction {
  label: string;
  probability: number;
  signType?: SignType;
}

export interface ClassifierPrediction {
  label: string;
  probability: number;
  candidates: CandidatePrediction[];
  isUnknown: boolean;
  reason?: string;
  modelType: 'TFJS_NEURAL_NETWORK' | 'DEVELOPMENT_GEOMETRIC_FALLBACK';
  marginDelta: number;
  meaning?: string;
}

export interface ISignClassifier {
  readonly modelName: string;
  readonly modelVersion: string;
  readonly isTrainedModel: boolean;
  predict(
    features: ExtractedGestureFeatures,
    landmarks: HandLandmarks,
    secondaryLandmarks?: HandLandmarks
  ): Promise<ClassifierPrediction> | ClassifierPrediction;
}
