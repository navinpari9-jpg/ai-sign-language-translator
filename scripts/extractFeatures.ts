/**
 * Feature Extraction Script for Training & Evaluation
 * Maps 3D landmarks into unified 111-dimensional normalized numerical vectors.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractFeaturesFromLandmarks } from '../src/ml/featureExtractor';
import { LabeledSample } from './prepareDataset';

export interface ExtractedFeatureDataset {
  featureDimension: number;
  classes: string[];
  samples: Array<{
    id: string;
    label: string;
    classIndex: number;
    category: string;
    features: number[];
  }>;
}

export function extractDatasetFeatures(samples: LabeledSample[]): ExtractedFeatureDataset {
  // Collect distinct labels, keeping UNKNOWN at index 0
  const labelSet = new Set<string>();
  samples.forEach((s) => {
    if (s.label !== 'UNKNOWN') labelSet.add(s.label);
  });
  const classes = ['UNKNOWN', ...Array.from(labelSet).sort()];

  const featureSamples = samples.map((sample) => {
    const extracted = extractFeaturesFromLandmarks(sample.landmarks);
    const classIndex = classes.indexOf(sample.label);

    return {
      id: sample.id,
      label: sample.label,
      classIndex: classIndex >= 0 ? classIndex : 0,
      category: sample.category,
      features: extracted.rawFeatureVector,
    };
  });

  return {
    featureDimension: featureSamples[0]?.features.length || 111,
    classes,
    samples: featureSamples,
  };
}

if (process.argv[1]?.endsWith('extractFeatures.ts') || process.argv[1]?.endsWith('extractFeatures.js')) {
  const dataPath = path.resolve(process.cwd(), 'dataset', 'landmarks_dataset.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Dataset not found. Run prepareDataset first.');
    process.exit(1);
  }

  const rawData: LabeledSample[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const processed = extractDatasetFeatures(rawData);
  const outFile = path.resolve(process.cwd(), 'dataset', 'features_dataset.json');
  fs.writeFileSync(outFile, JSON.stringify(processed, null, 2), 'utf-8');
  console.log(`Extracted features for ${processed.samples.length} samples. Vector dimension: ${processed.featureDimension}`);
}
