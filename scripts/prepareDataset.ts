/**
 * Dataset Preparation & Augmentation Script
 * Generates structured landmark datasets for ASL Alphabet (A-Z),
 * Common Static & Dynamic Vocabulary Signs, and Negative/Non-Sign Hand Poses.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RawLandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export type RawHandLandmarks = RawLandmarkPoint[];

export interface LabeledSample {
  id: string;
  label: string;
  category: 'ALPHABET' | 'VOCABULARY' | 'UNKNOWN_POSE';
  userVariationId: number;
  landmarks: RawHandLandmarks;
}

// 21 Landmark index constants
const WRIST = 0;
const THUMB_CMC = 1, THUMB_MCP = 2, THUMB_IP = 3, THUMB_TIP = 4;
const INDEX_MCP = 5, INDEX_PIP = 6, INDEX_DIP = 7, INDEX_TIP = 8;
const MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_DIP = 11, MIDDLE_TIP = 12;
const RING_MCP = 13, RING_PIP = 14, RING_DIP = 15, RING_TIP = 16;
const PINKY_MCP = 17, PINKY_PIP = 18, PINKY_DIP = 19, PINKY_TIP = 20;

/**
 * Creates canonical normalized 3D hand landmarks from finger states
 */
export function generateHandPose(
  fingerExtensions: [number, number, number, number, number], // 0.0 = fully curled, 1.0 = fully extended
  config: {
    thumbSpread?: number;
    thumbCrossing?: boolean;
    thumbAlongside?: boolean;
    indexHook?: boolean;
    indexMiddleSpread?: number;
    tiltAngleRad?: number;
    handScale?: number;
    wristY?: number;
    jitter?: number;
  } = {}
): RawHandLandmarks {
  const [thumbExt, indexExt, midExt, ringExt, pinkyExt] = fingerExtensions;
  const thumbSpread = config.thumbSpread ?? 0.35;
  const imSpread = config.indexMiddleSpread ?? 0;
  const tilt = config.tiltAngleRad ?? 0;
  const scale = config.handScale ?? 1.0;
  const baseY = config.wristY ?? 0.8;
  const jitter = config.jitter ?? 0;

  const pts: RawHandLandmarks = [];
  const rand = () => (Math.random() - 0.5) * jitter;

  // 0: Wrist
  pts.push({ x: 0.5 + rand(), y: baseY + rand(), z: rand() });

  // 1-4: Thumb
  if (config.thumbCrossing) {
    // Crossed horizontally across curled fingers (e.g. S)
    pts.push({ x: 0.48 + rand(), y: baseY - 0.08 * scale + rand(), z: 0.02 });
    pts.push({ x: 0.52 + rand(), y: baseY - 0.14 * scale + rand(), z: 0.04 });
    pts.push({ x: 0.54 + rand(), y: baseY - 0.17 * scale + rand(), z: 0.06 });
    pts.push({ x: 0.56 + rand(), y: baseY - 0.18 * scale + rand(), z: 0.07 });
  } else if (config.thumbAlongside) {
    // Upright alongside index MCP (e.g. A)
    pts.push({ x: 0.45 + rand(), y: baseY - 0.08 * scale + rand(), z: 0 });
    pts.push({ x: 0.43 + rand(), y: baseY - 0.14 * scale + rand(), z: 0.01 });
    pts.push({ x: 0.42 + rand(), y: baseY - 0.21 * scale + rand(), z: 0.02 });
    pts.push({ x: 0.42 + rand(), y: baseY - 0.28 * scale + rand(), z: 0.02 });
  } else if (config.thumbTuckedIndex) {
    // Tucked under index only, peeking between index and middle (e.g. T)
    pts.push({ x: 0.47 + rand(), y: baseY - 0.08 * scale + rand(), z: 0.01 });
    pts.push({ x: 0.48 + rand(), y: baseY - 0.14 * scale + rand(), z: 0.03 });
    pts.push({ x: 0.48 + rand(), y: baseY - 0.20 * scale + rand(), z: 0.05 });
    pts.push({ x: 0.48 + rand(), y: baseY - 0.24 * scale + rand(), z: 0.05 });
  } else if (config.thumbTuckedMiddle) {
    // Tucked under index and middle, peeking between middle and ring (e.g. N)
    pts.push({ x: 0.48 + rand(), y: baseY - 0.08 * scale + rand(), z: 0.01 });
    pts.push({ x: 0.50 + rand(), y: baseY - 0.14 * scale + rand(), z: 0.03 });
    pts.push({ x: 0.52 + rand(), y: baseY - 0.19 * scale + rand(), z: 0.05 });
    pts.push({ x: 0.52 + rand(), y: baseY - 0.22 * scale + rand(), z: 0.06 });
  } else if (config.thumbTuckedRing) {
    // Tucked under index, middle, ring, peeking between ring and pinky (e.g. M)
    pts.push({ x: 0.48 + rand(), y: baseY - 0.08 * scale + rand(), z: 0.01 });
    pts.push({ x: 0.52 + rand(), y: baseY - 0.13 * scale + rand(), z: 0.03 });
    pts.push({ x: 0.55 + rand(), y: baseY - 0.17 * scale + rand(), z: 0.05 });
    pts.push({ x: 0.56 + rand(), y: baseY - 0.20 * scale + rand(), z: 0.06 });
  } else if (config.fingertipsTuckedOnThumb) {
    // Thumb resting horizontally below tightly curled fingertips (e.g. E)
    pts.push({ x: 0.47 + rand(), y: baseY - 0.07 * scale + rand(), z: 0.01 });
    pts.push({ x: 0.49 + rand(), y: baseY - 0.11 * scale + rand(), z: 0.02 });
    pts.push({ x: 0.52 + rand(), y: baseY - 0.13 * scale + rand(), z: 0.03 });
    pts.push({ x: 0.54 + rand(), y: baseY - 0.14 * scale + rand(), z: 0.03 });
  } else {
    // Normal thumb extension / angle
    pts.push({ x: 0.46 + rand(), y: baseY - 0.08 * scale + rand(), z: 0 });
    pts.push({ x: 0.42 - thumbSpread * 0.1 + rand(), y: baseY - 0.14 * scale + rand(), z: 0 });
    pts.push({ x: 0.38 - thumbSpread * 0.2 + rand(), y: baseY - 0.19 * scale - (thumbExt - 0.4) * 0.08 + rand(), z: 0 });
    pts.push({ x: 0.34 - thumbSpread * 0.3 + rand(), y: baseY - 0.23 * scale - thumbExt * 0.18 + rand(), z: 0 });
  }

  // 5-8: Index
  const idxX = 0.46 - imSpread;
  pts.push({ x: idxX + rand(), y: baseY - 0.21 * scale + rand(), z: 0 });
  pts.push({ x: idxX + rand(), y: baseY - 0.29 * scale + rand(), z: 0 });
  pts.push({ x: idxX + rand(), y: baseY - 0.36 * scale + rand(), z: 0 });
  if (config.indexHook) {
    pts.push({ x: idxX + rand(), y: baseY - 0.31 * scale + rand(), z: 0.06 }); // Hooked (X)
  } else {
    pts.push({ x: idxX + rand(), y: baseY - (0.21 + indexExt * 0.34) * scale + rand(), z: 0 });
  }

  // 9-12: Middle
  const midX = 0.50 + imSpread;
  pts.push({ x: midX + rand(), y: baseY - 0.23 * scale + rand(), z: 0 });
  pts.push({ x: midX + rand(), y: baseY - 0.31 * scale + rand(), z: 0 });
  pts.push({ x: midX + rand(), y: baseY - 0.39 * scale + rand(), z: 0 });
  pts.push({ x: midX + rand(), y: baseY - (0.23 + midExt * 0.36) * scale + rand(), z: 0 });

  // 13-16: Ring
  const ringX = 0.54;
  pts.push({ x: ringX + rand(), y: baseY - 0.21 * scale + rand(), z: 0 });
  pts.push({ x: ringX + rand(), y: baseY - 0.29 * scale + rand(), z: 0 });
  pts.push({ x: ringX + rand(), y: baseY - 0.36 * scale + rand(), z: 0 });
  pts.push({ x: ringX + rand(), y: baseY - (0.21 + ringExt * 0.32) * scale + rand(), z: 0 });

  // 17-20: Pinky
  const pinkyX = 0.58;
  pts.push({ x: pinkyX + rand(), y: baseY - 0.18 * scale + rand(), z: 0 });
  pts.push({ x: pinkyX + rand(), y: baseY - 0.25 * scale + rand(), z: 0 });
  pts.push({ x: pinkyX + rand(), y: baseY - 0.31 * scale + rand(), z: 0 });
  pts.push({ x: pinkyX + rand(), y: baseY - (0.18 + pinkyExt * 0.27) * scale + rand(), z: 0 });

  // Rotation augmentation around wrist
  if (tilt !== 0) {
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    return pts.map((pt) => {
      const dx = pt.x - 0.5;
      const dy = pt.y - baseY;
      return {
        x: 0.5 + (dx * cos - dy * sin),
        y: baseY + (dx * sin + dy * cos),
        z: pt.z,
      };
    });
  }

  return pts;
}

/**
 * Creates multi-user augmented dataset
 */
export function buildDataset(): LabeledSample[] {
  const dataset: LabeledSample[] = [];
  let sampleId = 1;

  // Canonical base definitions for ASL Letters
  const alphabetBases: Record<string, { extensions: [number, number, number, number, number]; config?: any }> = {
    A: { extensions: [0.95, 0.15, 0.15, 0.15, 0.15], config: { thumbAlongside: true } },
    B: { extensions: [0.1, 1.0, 1.0, 1.0, 1.0], config: { thumbCrossing: true } },
    C: { extensions: [0.55, 0.55, 0.55, 0.55, 0.55], config: { thumbSpread: 0.3 } },
    D: { extensions: [0.35, 1.0, 0.15, 0.15, 0.15], config: { thumbCrossing: false, thumbSpread: 0.25 } },
    E: { extensions: [0.15, 0.15, 0.15, 0.15, 0.15], config: { fingertipsTuckedOnThumb: true } },
    F: { extensions: [0.35, 0.2, 1.0, 1.0, 1.0], config: { indexMiddleSpread: 0.05, thumbSpread: 0.2 } },
    G: { extensions: [0.85, 0.95, 0.1, 0.1, 0.1], config: { tiltAngleRad: 0.8, thumbSpread: 0.15 } },
    H: { extensions: [0.15, 0.95, 0.95, 0.1, 0.1], config: { tiltAngleRad: 0.8, indexMiddleSpread: 0.01 } },
    I: { extensions: [0.15, 0.15, 0.15, 0.15, 1.0], config: { thumbCrossing: true } },
    K: { extensions: [0.9, 1.0, 0.8, 0.15, 0.15], config: { indexMiddleSpread: 0.05, thumbSpread: 0.3 } },
    L: { extensions: [1.0, 1.0, 0.15, 0.15, 0.15], config: { thumbSpread: 0.65 } },
    M: { extensions: [0.2, 0.15, 0.15, 0.15, 0.15], config: { thumbTuckedRing: true } },
    N: { extensions: [0.2, 0.15, 0.15, 0.15, 0.15], config: { thumbTuckedMiddle: true } },
    O: { extensions: [0.4, 0.35, 0.35, 0.35, 0.35], config: { thumbSpread: 0.2 } },
    P: { extensions: [0.8, 0.95, 0.95, 0.15, 0.15], config: { tiltAngleRad: 1.8 } },
    Q: { extensions: [0.85, 0.95, 0.1, 0.1, 0.1], config: { tiltAngleRad: 1.8 } },
    R: { extensions: [0.15, 0.95, 0.95, 0.15, 0.15], config: { indexMiddleSpread: -0.04 } },
    S: { extensions: [0.1, 0.1, 0.1, 0.1, 0.1], config: { thumbCrossing: true } },
    T: { extensions: [0.35, 0.15, 0.15, 0.15, 0.15], config: { thumbTuckedIndex: true } },
    U: { extensions: [0.15, 1.0, 1.0, 0.15, 0.15], config: { indexMiddleSpread: 0.0 } },
    V: { extensions: [0.15, 1.0, 1.0, 0.15, 0.15], config: { indexMiddleSpread: 0.07 } },
    W: { extensions: [0.2, 1.0, 1.0, 1.0, 0.15], config: { indexMiddleSpread: 0.05 } },
    X: { extensions: [0.2, 0.5, 0.15, 0.15, 0.15], config: { indexHook: true, thumbCrossing: true } },
    Y: { extensions: [1.0, 0.15, 0.15, 0.15, 1.0], config: { thumbSpread: 0.6 } },
  };

  // Supported Vocabulary Signs
  const vocabBases: Record<string, { extensions: [number, number, number, number, number]; config?: any }> = {
    HELLO: { extensions: [1.0, 1.0, 1.0, 1.0, 1.0], config: { thumbSpread: 0.2 } },
    THANK_YOU: { extensions: [0.8, 1.0, 1.0, 1.0, 1.0], config: { thumbSpread: 0.15 } },
    PLEASE: { extensions: [0.9, 1.0, 1.0, 1.0, 1.0], config: { thumbSpread: 0.2 } },
    YES: { extensions: [0.2, 0.15, 0.15, 0.15, 0.15], config: { thumbCrossing: true } },
    NO: { extensions: [0.4, 0.35, 0.35, 0.15, 0.15], config: { thumbSpread: 0.25 } },
    SORRY: { extensions: [0.2, 0.15, 0.15, 0.15, 0.15], config: { thumbCrossing: true } },
    HELP: { extensions: [0.8, 0.2, 0.2, 0.2, 0.2], config: { thumbAlongside: true } },
    WATER: { extensions: [0.2, 1.0, 1.0, 1.0, 0.2], config: { indexMiddleSpread: 0.04 } },
    GOOD: { extensions: [0.8, 1.0, 1.0, 1.0, 1.0], config: { thumbSpread: 0.2 } },
    LOVE: { extensions: [1.0, 1.0, 0.15, 0.15, 1.0], config: { thumbSpread: 0.5 } },
    OK: { extensions: [0.4, 0.35, 1.0, 1.0, 1.0], config: { indexMiddleSpread: 0.05 } },
    PEACE: { extensions: [0.15, 1.0, 1.0, 0.15, 0.15], config: { indexMiddleSpread: 0.06 } },
  };

  // 32 Multi-user variations per sign: diverse scales, tilts, jitter, and wrist heights
  const variations: Array<{ scale: number; tilt: number; jitter: number; wristY: number }> = [];
  const scaleList = [0.82, 0.92, 1.0, 1.08, 1.18];
  const tiltList = [-0.18, -0.08, 0, 0.08, 0.18];
  const jitterList = [0.005, 0.009];
  const wristYList = [0.78, 0.81];

  let vCount = 0;
  for (const s of scaleList) {
    for (const t of tiltList) {
      if (vCount >= 32) break;
      variations.push({
        scale: s,
        tilt: t,
        jitter: jitterList[vCount % jitterList.length],
        wristY: wristYList[vCount % wristYList.length],
      });
      vCount++;
    }
    if (vCount >= 32) break;
  }
  // Fill remaining to exactly 32
  while (variations.length < 32) {
    variations.push({
      scale: 1.0 + (Math.random() - 0.5) * 0.3,
      tilt: (Math.random() - 0.5) * 0.35,
      jitter: 0.008,
      wristY: 0.80 + (Math.random() - 0.5) * 0.06,
    });
  }

  // 1. Generate Alphabet A-Z samples
  for (const [letter, base] of Object.entries(alphabetBases)) {
    variations.forEach((v, idx) => {
      const landmarks = generateHandPose(base.extensions, {
        ...base.config,
        handScale: v.scale,
        tiltAngleRad: (base.config?.tiltAngleRad || 0) + v.tilt,
        wristY: v.wristY,
        jitter: v.jitter,
      });

      dataset.push({
        id: `sample_alpha_${letter}_${idx + 1}`,
        label: letter,
        category: 'ALPHABET',
        userVariationId: idx + 1,
        landmarks,
      });
      sampleId++;
    });
  }

  // 2. Generate Vocabulary samples
  for (const [sign, base] of Object.entries(vocabBases)) {
    variations.forEach((v, idx) => {
      const landmarks = generateHandPose(base.extensions, {
        ...base.config,
        handScale: v.scale,
        tiltAngleRad: (base.config?.tiltAngleRad || 0) + v.tilt,
        wristY: v.wristY,
        jitter: v.jitter,
      });

      dataset.push({
        id: `sample_vocab_${sign}_${idx + 1}`,
        label: sign.replace('_', ' '),
        category: 'VOCABULARY',
        userVariationId: idx + 1,
        landmarks,
      });
      sampleId++;
    });
  }

  // 3. Generate Negative / Unknown / Non-Sign Hand Poses (Crucial for Requirement 8)
  const unknownPoses: Array<[number, number, number, number, number]> = [
    [0.5, 0.8, 0.3, 0.7, 0.4], // Relaxed, half-open arbitrary hand
    [0.1, 0.4, 0.8, 0.3, 0.9], // Finger wag / random finger heights
    [0.9, 0.4, 0.5, 0.4, 0.3], // Scratching motion
    [0.6, 0.6, 0.6, 0.6, 0.1], // Pinky folded, rest loose
    [0.3, 0.7, 0.2, 0.8, 0.1], // Non-standard claw
    [0.5, 0.5, 0.1, 0.5, 0.5], // Arbitrary relaxed pose
    [0.2, 0.8, 0.8, 0.2, 0.8], // Non-sign scissor
    [0.7, 0.3, 0.6, 0.2, 0.5], // Loose waving hand
    [0.4, 0.4, 0.4, 0.4, 0.4], // Semi-clenched resting hand
    [0.1, 0.2, 0.3, 0.4, 0.5], // Cascading relaxed fingers
  ];

  unknownPoses.forEach((ext, i) => {
    variations.slice(0, 12).forEach((v, idx) => {
      const landmarks = generateHandPose(ext, {
        handScale: v.scale,
        tiltAngleRad: v.tilt,
        jitter: 0.015,
      });
      dataset.push({
        id: `sample_unknown_${i + 1}_${idx + 1}`,
        label: 'UNKNOWN',
        category: 'UNKNOWN_POSE',
        userVariationId: idx + 1,
        landmarks,
      });
      sampleId++;
    });
  });

  return dataset;
}

// Execute standalone if called via CLI
if (process.argv[1]?.endsWith('prepareDataset.ts') || process.argv[1]?.endsWith('prepareDataset.js')) {
  const dataset = buildDataset();
  const outDir = path.resolve(process.cwd(), 'dataset');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'landmarks_dataset.json');
  fs.writeFileSync(outFile, JSON.stringify(dataset, null, 2), 'utf-8');
  console.log(`Generated ${dataset.length} labeled landmark samples in ${outFile}`);
}
