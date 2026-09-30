/**
 * Model Training Pipeline Script using TensorFlow.js
 * Trains a Multi-Layer Perceptron (MLP) on extracted normalized hand feature vectors
 * and exports the trained model to /public/models/asl_classifier_model/
 */

import * as fs from 'fs';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';
import { buildDataset } from './prepareDataset';
import { extractDatasetFeatures } from './extractFeatures';

export async function trainAndExportASLModel(): Promise<void> {
  console.log('--- Starting ASL Model Training Pipeline ---');

  // 1. Prepare Dataset & Extract Features
  const rawSamples = buildDataset();
  console.log(`Generated ${rawSamples.length} labeled hand pose samples.`);

  const dataset = extractDatasetFeatures(rawSamples);
  const numFeatures = dataset.featureDimension;
  const classes = dataset.classes;
  const numClasses = classes.length;
  console.log(`Features dimension: ${numFeatures}, Classes count: ${numClasses}`);

  // 2. Shuffle dataset samples for proper train/val split
  const shuffledSamples = [...dataset.samples];
  for (let i = shuffledSamples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSamples[i], shuffledSamples[j]] = [shuffledSamples[j], shuffledSamples[i]];
  }

  // Prepare Tensors
  const xData: number[][] = [];
  const yData: number[][] = [];

  shuffledSamples.forEach((s) => {
    xData.push(s.features);
    // One-hot encode label
    const oneHot = new Array(numClasses).fill(0);
    oneHot[s.classIndex] = 1;
    yData.push(oneHot);
  });

  const xTensor = tf.tensor2d(xData, [xData.length, numFeatures]);
  const yTensor = tf.tensor2d(yData, [yData.length, numClasses]);

  // 3. Define Neural Network Architecture
  const model = tf.sequential();

  // Layer 1: Dense 128 + ReLU
  model.add(
    tf.layers.dense({
      inputShape: [numFeatures],
      units: 128,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    })
  );

  // Layer 2: Dropout for regularizing spatial jitter
  model.add(tf.layers.dropout({ rate: 0.15 }));

  // Layer 3: Dense 64 + ReLU
  model.add(
    tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    })
  );

  // Layer 4: Dense 32 + ReLU
  model.add(
    tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelInitializer: 'heNormal',
    })
  );

  // Output Layer: Dense Softmax across all ASL & Vocabulary classes
  model.add(
    tf.layers.dense({
      units: numClasses,
      activation: 'softmax',
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.002),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  // 4. Train
  console.log('Training neural network...');
  await model.fit(xTensor, yTensor, {
    epochs: 45,
    batchSize: 32,
    shuffle: true,
    validationSplit: 0.15,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 10 === 0 || epoch === 44) {
          console.log(
            `Epoch ${epoch + 1}: Loss = ${logs?.loss?.toFixed(4)}, Acc = ${(
              (logs?.acc ?? 0) * 100
            ).toFixed(1)}%, Val_Acc = ${((logs?.val_acc ?? 0) * 100).toFixed(1)}%`
          );
        }
      },
    },
  });

  // 5. Export Model weights & schema to public/models/
  const outDir = path.resolve(process.cwd(), 'public', 'models', 'asl_classifier_model');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Save via custom save handler using fs
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      const modelJson = {
        modelTopology: artifacts.modelTopology,
        weightsManifest: [
          {
            paths: ['./weights.bin'],
            weights: artifacts.weightSpecs,
          },
        ],
        format: artifacts.format,
        generatedBy: artifacts.generatedBy,
        convertedBy: artifacts.convertedBy,
      };

      fs.writeFileSync(path.join(outDir, 'model.json'), JSON.stringify(modelJson, null, 2), 'utf-8');

      if (artifacts.weightData) {
        let buffer: Buffer;
        if (Array.isArray(artifacts.weightData)) {
          buffer = Buffer.concat(artifacts.weightData.map((ab) => Buffer.from(ab)));
        } else {
          buffer = Buffer.from(artifacts.weightData as ArrayBuffer);
        }
        fs.writeFileSync(path.join(outDir, 'weights.bin'), buffer);
      }

      const totalWeightBytes = artifacts.weightData
        ? Array.isArray(artifacts.weightData)
          ? artifacts.weightData.reduce((acc, a) => acc + a.byteLength, 0)
          : (artifacts.weightData as ArrayBuffer).byteLength
        : 0;

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
          modelTopologyBytes: JSON.stringify(artifacts.modelTopology).length,
          weightSpecsBytes: JSON.stringify(artifacts.weightSpecs).length,
          weightDataBytes: totalWeightBytes,
        },
      };
    })
  );

  // Save classes mapping and metadata
  const metadata = {
    modelName: 'ASL Neural Classifier (TF.js)',
    version: '4.0.0-deep-asl',
    isTrainedModel: true,
    inputShape: `[1, ${numFeatures}]`,
    classesCount: numClasses,
    classes,
    trainedAt: new Date().toISOString(),
    trainingSamplesCount: rawSamples.length,
  };

  fs.writeFileSync(
    path.join(outDir, 'model_metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log(`Model successfully exported to ${outDir}`);

  // Cleanup tensors
  xTensor.dispose();
  yTensor.dispose();
}

if (process.argv[1]?.endsWith('trainModel.ts') || process.argv[1]?.endsWith('trainModel.js')) {
  trainAndExportASLModel().catch((err) => {
    console.error('Training failed:', err);
    process.exit(1);
  });
}
