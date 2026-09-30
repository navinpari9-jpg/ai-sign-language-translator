import { PrototypeSignClassifier } from './classifier';
import { tfjsModelClassifier } from './tfjsModelClassifier';
import { ISignClassifier } from './classifierInterface';

export interface ModelMetadata {
  modelName: string;
  version: string;
  isTrainedModel: boolean;
  inputShape: string;
  classesCount: number;
  status: 'READY' | 'LOADING' | 'FALLBACK';
  modelType: 'TFJS_NEURAL_NETWORK' | 'DEVELOPMENT_GEOMETRIC_FALLBACK';
}

class ModelLoaderService {
  private fallbackClassifier: PrototypeSignClassifier = new PrototypeSignClassifier();
  private metadata: ModelMetadata = {
    modelName: 'ASL Neural Classifier (TF.js)',
    version: '4.0.0-deep-asl',
    isTrainedModel: false,
    inputShape: '[1, 111] (21x3 3D normalized landmarks + 48 joint/angle/motion features)',
    classesCount: 37,
    status: 'LOADING',
    modelType: 'DEVELOPMENT_GEOMETRIC_FALLBACK',
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const ready = await tfjsModelClassifier.initModel();
      if (ready) {
        this.metadata = {
          modelName: tfjsModelClassifier.modelName,
          version: tfjsModelClassifier.modelVersion,
          isTrainedModel: true,
          inputShape: '[1, 111]',
          classesCount: tfjsModelClassifier.getClasses().length || 37,
          status: 'READY',
          modelType: 'TFJS_NEURAL_NETWORK',
        };
      } else {
        this.metadata.status = 'FALLBACK';
        this.metadata.modelType = 'DEVELOPMENT_GEOMETRIC_FALLBACK';
      }
    } catch {
      this.metadata.status = 'FALLBACK';
      this.metadata.modelType = 'DEVELOPMENT_GEOMETRIC_FALLBACK';
    }
  }

  public getClassifier(): ISignClassifier {
    if (tfjsModelClassifier.isModelReady()) {
      return tfjsModelClassifier;
    }
    return this.fallbackClassifier;
  }

  public getTFJSClassifier(): typeof tfjsModelClassifier {
    return tfjsModelClassifier;
  }

  public getMetadata(): ModelMetadata {
    return { ...this.metadata };
  }
}

export const modelLoader = new ModelLoaderService();
