import * as tf from '@tensorflow/tfjs';
import { ExtractedGestureFeatures, HandLandmarks } from '../types';
import { ClassifierPrediction, ISignClassifier } from './classifierInterface';
import { SIGN_MEANINGS } from './labels';

export class TFJSModelClassifier implements ISignClassifier {
  public readonly modelName = 'ASL Deep Neural Classifier';
  public readonly modelVersion = '4.0.0-tfjs-mlp';
  public readonly isTrainedModel = true;

  private model: tf.LayersModel | null = null;
  private classes: string[] = [];
  private isLoaded = false;
  private loadPromise: Promise<boolean> | null = null;

  constructor() {
    this.initModel();
  }

  public async initModel(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        // Fetch model metadata & class labels
        const metaRes = await fetch('/models/asl_classifier_model/model_metadata.json');
        if (!metaRes.ok) {
          console.warn('Model metadata not found at /models/asl_classifier_model/model_metadata.json');
          return false;
        }

        const metadata = await metaRes.json();
        this.classes = metadata.classes || [];

        // Load TensorFlow.js LayersModel
        this.model = await tf.loadLayersModel('/models/asl_classifier_model/model.json');
        this.isLoaded = true;
        console.log(`TFJS ASL Classifier loaded successfully (${this.classes.length} classes).`);
        return true;
      } catch (err) {
        console.warn('Could not load TFJS model from /models/, falling back to geometric classifier:', err);
        this.isLoaded = false;
        return false;
      }
    })();

    return this.loadPromise;
  }

  public isModelReady(): boolean {
    return this.isLoaded && this.model !== null;
  }

  public getClasses(): string[] {
    return [...this.classes];
  }

  /**
   * Synchronous forward pass inference using tf.tidy for 60fps real-time camera loop
   */
  public predictSync(
    features: ExtractedGestureFeatures,
    landmarks: HandLandmarks
  ): ClassifierPrediction {
    if (!this.isLoaded || !this.model || this.classes.length === 0) {
      return {
        label: 'UNKNOWN',
        probability: 0,
        candidates: [],
        isUnknown: true,
        reason: 'Trained model is not initialized or still loading',
        modelType: 'TFJS_NEURAL_NETWORK',
        marginDelta: 0,
      };
    }

    if (!features || !features.rawFeatureVector || features.rawFeatureVector.length === 0) {
      return {
        label: 'UNKNOWN',
        probability: 0,
        candidates: [],
        isUnknown: true,
        reason: 'Missing feature vector',
        modelType: 'TFJS_NEURAL_NETWORK',
        marginDelta: 0,
      };
    }

    try {
      // 1. Safe vector dimension matching (handles model input shape dynamically)
      const expectedDim = (this.model!.inputs[0]?.shape?.[1] as number) || features.rawFeatureVector.length;
      let inputVec = features.rawFeatureVector;
      if (inputVec.length < expectedDim) {
        inputVec = [...inputVec, ...new Array(expectedDim - inputVec.length).fill(0)];
      } else if (inputVec.length > expectedDim) {
        inputVec = inputVec.slice(0, expectedDim);
      }

      // Run inference wrapped in tf.tidy to avoid WebGL / CPU memory leaks
      const probabilities = tf.tidy(() => {
        const inputTensor = tf.tensor2d([inputVec], [1, expectedDim]);
        const output = this.model!.predict(inputTensor) as tf.Tensor;
        return Array.from(output.dataSync());
      });

      // 2. Map probabilities to classes
      const candidateList = this.classes.map((cls, idx) => ({
        label: cls,
        probability: probabilities[idx] ?? 0,
      }));

      // Sort descending
      candidateList.sort((a, b) => b.probability - a.probability);

      const top1 = candidateList[0];
      const top2 = candidateList[1];
      const marginDelta = top1 && top2 ? top1.probability - top2.probability : top1 ? top1.probability : 0;

      // 3. Ambiguity & Unknown Rejection Checks (Requirement 8 & 10)
      const MIN_CONFIDENCE_THRESHOLD = 0.70;
      const MIN_MARGIN_THRESHOLD = 0.12;

      if (!top1 || top1.probability < MIN_CONFIDENCE_THRESHOLD) {
        return {
          label: 'UNKNOWN',
          probability: top1 ? top1.probability : 0,
          candidates: candidateList.slice(0, 5),
          isUnknown: true,
          reason: `Low prediction probability (${Math.round((top1?.probability ?? 0) * 100)}% < 70% threshold)`,
          modelType: 'TFJS_NEURAL_NETWORK',
          marginDelta,
        };
      }

      // Check if top 2 candidates are too close (ambiguous hand shape)
      if (top2 && top2.probability >= 0.38 && marginDelta < MIN_MARGIN_THRESHOLD) {
        return {
          label: 'UNKNOWN',
          probability: top1.probability,
          candidates: candidateList.slice(0, 5),
          isUnknown: true,
          reason: `Ambiguous between '${top1.label}' (${Math.round(top1.probability * 100)}%) and '${top2.label}' (${Math.round(top2.probability * 100)}%)`,
          modelType: 'TFJS_NEURAL_NETWORK',
          marginDelta,
        };
      }

      // If top candidate is explicitly UNKNOWN class
      if (top1.label === 'UNKNOWN') {
        return {
          label: 'UNKNOWN',
          probability: top1.probability,
          candidates: candidateList.slice(0, 5),
          isUnknown: true,
          reason: 'Hand posture does not match any known ASL sign',
          modelType: 'TFJS_NEURAL_NETWORK',
          marginDelta,
        };
      }

      return {
        label: top1.label,
        probability: top1.probability,
        candidates: candidateList.slice(0, 5),
        isUnknown: false,
        modelType: 'TFJS_NEURAL_NETWORK',
        marginDelta,
        meaning: SIGN_MEANINGS[top1.label] || `ASL sign ${top1.label}`,
      };
    } catch (err: any) {
      console.error('TFJS prediction error:', err);
      return {
        label: 'UNKNOWN',
        probability: 0,
        candidates: [],
        isUnknown: true,
        reason: `Model inference error: ${err?.message}`,
        modelType: 'TFJS_NEURAL_NETWORK',
        marginDelta: 0,
      };
    }
  }

  /**
   * Async predict wrapper satisfying ISignClassifier interface
   */
  public async predict(
    features: ExtractedGestureFeatures,
    landmarks: HandLandmarks
  ): Promise<ClassifierPrediction> {
    return this.predictSync(features, landmarks);
  }
}

export const tfjsModelClassifier = new TFJSModelClassifier();
