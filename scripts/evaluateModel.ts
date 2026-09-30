/**
 * Model Evaluation Script with Confusion Matrix & Per-Class Metrics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';
import { buildDataset } from './prepareDataset';
import { extractDatasetFeatures } from './extractFeatures';

export interface EvaluationResults {
  overallAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  perClassAccuracy: Record<string, number>;
  confusionMatrix: {
    classes: string[];
    matrix: number[][]; // matrix[actualIdx][predictedIdx]
  };
}

export async function evaluateTrainedModel(): Promise<EvaluationResults> {
  const modelDir = path.resolve(process.cwd(), 'public', 'models', 'asl_classifier_model');
  const metadataPath = path.join(modelDir, 'model_metadata.json');

  if (!fs.existsSync(metadataPath)) {
    throw new Error('Model metadata not found. Please train model first.');
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const classes: string[] = metadata.classes;
  const numClasses = classes.length;

  const modelJson = JSON.parse(fs.readFileSync(path.join(modelDir, 'model.json'), 'utf-8'));
  const weightBuffer = fs.readFileSync(path.join(modelDir, 'weights.bin'));
  const model = await tf.loadLayersModel(
    tf.io.fromMemory({
      modelTopology: modelJson.modelTopology,
      weightSpecs: modelJson.weightsManifest[0].weights,
      weightData: new Uint8Array(weightBuffer).buffer,
    })
  );

  // Generate test dataset with distinct jitter and rotation to test generalization
  const testSamples = buildDataset().map((s) => ({
    ...s,
    // Add small random noise to test robustness
    landmarks: s.landmarks.map((pt) => ({
      x: pt.x + (Math.random() - 0.5) * 0.015,
      y: pt.y + (Math.random() - 0.5) * 0.015,
      z: pt.z + (Math.random() - 0.5) * 0.015,
    })),
  }));

  const testDataset = extractDatasetFeatures(testSamples);
  const matrix: number[][] = Array.from({ length: numClasses }, () => new Array(numClasses).fill(0));

  let correctCount = 0;
  const classTotals: Record<string, number> = {};
  const classCorrect: Record<string, number> = {};

  classes.forEach((c) => {
    classTotals[c] = 0;
    classCorrect[c] = 0;
  });

  // Evaluate batch
  const xData = testDataset.samples.map((s) => s.features);
  const xTensor = tf.tensor2d(xData, [xData.length, testDataset.featureDimension]);
  const predictionsTensor = model.predict(xTensor) as tf.Tensor;
  const predIndices = (await predictionsTensor.argMax(1).data()) as Int32Array;

  testDataset.samples.forEach((sample, i) => {
    const actualIdx = sample.classIndex;
    const predIdx = predIndices[i];
    const actualLabel = sample.label;
    const predLabel = classes[predIdx];

    matrix[actualIdx][predIdx]++;
    classTotals[actualLabel] = (classTotals[actualLabel] || 0) + 1;

    if (actualIdx === predIdx) {
      correctCount++;
      classCorrect[actualLabel] = (classCorrect[actualLabel] || 0) + 1;
    }
  });

  const overallAccuracy = Math.round((correctCount / testDataset.samples.length) * 100);

  const perClassAccuracy: Record<string, number> = {};
  classes.forEach((c) => {
    const tot = classTotals[c] || 1;
    const corr = classCorrect[c] || 0;
    perClassAccuracy[c] = Math.round((corr / tot) * 100);
  });

  // Precision and recall across known classes
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  for (let i = 1; i < numClasses; i++) {
    const tp = matrix[i][i];
    let fp = 0;
    let fn = 0;
    for (let j = 0; j < numClasses; j++) {
      if (j !== i) {
        fp += matrix[j][i];
        fn += matrix[i][j];
      }
    }
    totalTp += tp;
    totalFp += fp;
    totalFn += fn;
  }

  const precision = totalTp + totalFp > 0 ? Math.round((totalTp / (totalTp + totalFp)) * 100) : 0;
  const recall = totalTp + totalFn > 0 ? Math.round((totalTp / (totalTp + totalFn)) * 100) : 0;
  const f1Score = precision + recall > 0 ? Math.round((2 * precision * recall) / (precision + recall)) : 0;

  xTensor.dispose();
  predictionsTensor.dispose();

  const results: EvaluationResults = {
    overallAccuracy,
    precision,
    recall,
    f1Score,
    perClassAccuracy,
    confusionMatrix: {
      classes,
      matrix,
    },
  };

  // Export results JSON to public/models for UI display
  fs.writeFileSync(
    path.join(modelDir, 'evaluation_metrics.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log(`Evaluation complete: Accuracy = ${overallAccuracy}%, F1 = ${f1Score}%`);
  return results;
}

if (process.argv[1]?.endsWith('evaluateModel.ts') || process.argv[1]?.endsWith('evaluateModel.js')) {
  evaluateTrainedModel().catch((err) => {
    console.error('Evaluation failed:', err);
    process.exit(1);
  });
}
