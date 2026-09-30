import { BenchmarkSample, FingerState, HandLandmarks, SignType } from '../types';

/**
 * Helper to construct normalized synthetic hand landmarks for evaluation
 */
function createSyntheticLandmarks(
  fingerExtensions: [number, number, number, number, number], // 0.0 (curled) to 1.0 (extended) for [thumb, index, middle, ring, pinky]
  options: {
    thumbSpread?: number;
    indexMiddleSpread?: number;
    tiltAngleRad?: number;
    wristY?: number;
    indexHook?: boolean;
    thumbCrossing?: boolean;
    thumbAlongside?: boolean;
    thumbTuckedIndex?: boolean;
    thumbTuckedMiddle?: boolean;
    thumbTuckedRing?: boolean;
    fingertipsTuckedOnThumb?: boolean;
  } = {}
): HandLandmarks {
  const [thumbExt, indexExt, midExt, ringExt, pinkyExt] = fingerExtensions;
  const thumbSpread = options.thumbSpread ?? 0.4;
  const imSpread = options.indexMiddleSpread ?? 0;
  const tilt = options.tiltAngleRad ?? 0;
  const baseY = options.wristY ?? 0.8;

  const pts: HandLandmarks = [];

  // 0: Wrist
  pts.push({ x: 0.5, y: baseY, z: 0 });

  // 1-4: Thumb
  if (options.thumbCrossing) {
    // Thumb crossed across palm horizontally (e.g. S)
    pts.push({ x: 0.48, y: baseY - 0.08, z: 0.02 });
    pts.push({ x: 0.52, y: baseY - 0.14, z: 0.04 });
    pts.push({ x: 0.54, y: baseY - 0.17, z: 0.06 });
    pts.push({ x: 0.56, y: baseY - 0.18, z: 0.07 });
  } else if (options.thumbAlongside) {
    // Thumb alongside index MCP upright (e.g. A)
    pts.push({ x: 0.45, y: baseY - 0.08, z: 0 });
    pts.push({ x: 0.43, y: baseY - 0.14, z: 0.01 });
    pts.push({ x: 0.42, y: baseY - 0.21, z: 0.02 });
    pts.push({ x: 0.42, y: baseY - 0.28, z: 0.02 });
  } else if (options.thumbTuckedIndex) {
    // Thumb tucked between index and middle (e.g. T)
    pts.push({ x: 0.47, y: baseY - 0.08, z: 0.01 });
    pts.push({ x: 0.48, y: baseY - 0.14, z: 0.03 });
    pts.push({ x: 0.48, y: baseY - 0.20, z: 0.05 });
    pts.push({ x: 0.48, y: baseY - 0.24, z: 0.05 });
  } else if (options.thumbTuckedMiddle) {
    // Thumb tucked under index and middle (e.g. N)
    pts.push({ x: 0.48, y: baseY - 0.08, z: 0.01 });
    pts.push({ x: 0.50, y: baseY - 0.14, z: 0.03 });
    pts.push({ x: 0.52, y: baseY - 0.19, z: 0.05 });
    pts.push({ x: 0.52, y: baseY - 0.22, z: 0.06 });
  } else if (options.thumbTuckedRing) {
    // Thumb tucked under index, middle, ring (e.g. M)
    pts.push({ x: 0.48, y: baseY - 0.08, z: 0.01 });
    pts.push({ x: 0.52, y: baseY - 0.13, z: 0.03 });
    pts.push({ x: 0.55, y: baseY - 0.17, z: 0.05 });
    pts.push({ x: 0.56, y: baseY - 0.20, z: 0.06 });
  } else if (options.fingertipsTuckedOnThumb) {
    // Thumb tucked horizontally below curled fingertips (e.g. E)
    pts.push({ x: 0.47, y: baseY - 0.07, z: 0.01 });
    pts.push({ x: 0.49, y: baseY - 0.11, z: 0.02 });
    pts.push({ x: 0.52, y: baseY - 0.13, z: 0.03 });
    pts.push({ x: 0.54, y: baseY - 0.14, z: 0.03 });
  } else {
    // Standard thumb spreading out
    pts.push({ x: 0.45, y: baseY - 0.08, z: 0 });
    pts.push({ x: 0.40 - thumbSpread * 0.1, y: baseY - 0.15, z: 0 });
    pts.push({ x: 0.35 - thumbSpread * 0.2, y: baseY - 0.20 - (thumbExt - 0.4) * 0.1, z: 0 });
    pts.push({ x: 0.30 - thumbSpread * 0.3, y: baseY - 0.25 - thumbExt * 0.2, z: 0 });
  }

  // 5-8: Index
  const idxBaseX = 0.46 - imSpread;
  pts.push({ x: idxBaseX, y: baseY - 0.22, z: 0 });
  pts.push({ x: idxBaseX, y: baseY - 0.30, z: 0 });
  pts.push({ x: idxBaseX, y: baseY - 0.38, z: 0 });
  if (options.indexHook) {
    pts.push({ x: idxBaseX, y: baseY - 0.34, z: 0.08 }); // hooked
  } else {
    pts.push({ x: idxBaseX, y: baseY - 0.22 - indexExt * 0.35, z: 0 });
  }

  // 9-12: Middle
  const midBaseX = 0.50 + imSpread;
  pts.push({ x: midBaseX, y: baseY - 0.24, z: 0 });
  pts.push({ x: midBaseX, y: baseY - 0.32, z: 0 });
  pts.push({ x: midBaseX, y: baseY - 0.40, z: 0 });
  pts.push({ x: midBaseX, y: baseY - 0.24 - midExt * 0.37, z: options.indexMiddleSpread && options.indexMiddleSpread < 0 ? 0.04 : 0 });

  // 13-16: Ring
  pts.push({ x: 0.54, y: baseY - 0.22, z: 0 });
  pts.push({ x: 0.54, y: baseY - 0.30, z: 0 });
  pts.push({ x: 0.54, y: baseY - 0.38, z: 0 });
  pts.push({ x: 0.54, y: baseY - 0.22 - ringExt * 0.33, z: 0 });

  // 17-20: Pinky
  pts.push({ x: 0.58, y: baseY - 0.18, z: 0 });
  pts.push({ x: 0.58, y: baseY - 0.25, z: 0 });
  pts.push({ x: 0.58, y: baseY - 0.32, z: 0 });
  pts.push({ x: 0.58, y: baseY - 0.18 - pinkyExt * 0.28, z: 0 });

  // Apply 2D tilt rotation if specified
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

export const BENCHMARK_SAMPLES: BenchmarkSample[] = [
  // ==========================================
  // VOCABULARY SAMPLES
  // ==========================================
  {
    id: 'vocab-ily',
    name: 'I Love You (ASL Vocabulary)',
    expectedSign: 'I LOVE YOU',
    description: 'Thumb, index, and pinky extended; middle and ring curled.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([1.0, 1.0, 0.2, 0.2, 1.0]),
  },
  {
    id: 'vocab-peace',
    name: 'Peace / V-Sign (ASL Vocabulary)',
    expectedSign: 'PEACE',
    description: 'Index and middle extended with spread; thumb, ring, pinky curled.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 0.2, 0.2], { indexMiddleSpread: 0.05 }),
  },
  {
    id: 'vocab-thumbsup',
    name: 'Thumbs Up / Yes (ASL Vocabulary)',
    expectedSign: 'THUMBS UP',
    description: 'Thumb upright, index, middle, ring, pinky curled into fist.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([1.0, 0.2, 0.2, 0.2, 0.2]),
  },
  {
    id: 'vocab-hello',
    name: 'Hello / Open B-Hand (ASL Vocabulary)',
    expectedSign: 'HELLO',
    description: 'All five fingers extended flat together.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([1.0, 1.0, 1.0, 1.0, 1.0], { thumbSpread: 0.1 }),
  },
  {
    id: 'vocab-water',
    name: 'Water / W-Hand (ASL Vocabulary)',
    expectedSign: 'WATER',
    description: 'Index, middle, and ring upright; pinky and thumb curled.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 1.0, 0.2]),
  },
  {
    id: 'vocab-yes',
    name: 'Yes (Fist / S-Hand)',
    expectedSign: 'YES',
    description: 'All five fingers folded into a fist.',
    category: 'VOCABULARY',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.2, 0.2, 0.2, 0.2]),
  },

  // ==========================================
  // ASL ALPHABET SAMPLES (A - Z)
  // ==========================================
  {
    id: 'alpha-a',
    name: 'ASL Letter A',
    expectedSign: 'A',
    description: 'Fingers curled into palm; thumb straight upright along side of index finger.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.9, 0.2, 0.2, 0.2, 0.2], { thumbSpread: 0.05 }),
  },
  {
    id: 'alpha-b',
    name: 'ASL Letter B',
    expectedSign: 'B',
    description: 'Four fingers upright together; thumb folded flat across palm.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.1, 1.0, 1.0, 1.0, 1.0], { thumbCrossing: true }),
  },
  {
    id: 'alpha-c',
    name: 'ASL Letter C',
    expectedSign: 'C',
    description: 'All fingers curved into a C arch viewed from side.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'side',
    landmarks: createSyntheticLandmarks([0.5, 0.5, 0.5, 0.5, 0.5], { thumbSpread: 0.3 }),
  },
  {
    id: 'alpha-d',
    name: 'ASL Letter D',
    expectedSign: 'D',
    description: 'Index straight up; middle, ring, pinky touch thumb tip.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.4, 1.0, 0.2, 0.2, 0.2]),
  },
  {
    id: 'alpha-e',
    name: 'ASL Letter E',
    expectedSign: 'E',
    description: 'All fingertips tightly curled down resting on top of thumb.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.1, 0.1, 0.1, 0.1]),
  },
  {
    id: 'alpha-f',
    name: 'ASL Letter F',
    expectedSign: 'F',
    description: 'Index touches thumb; middle, ring, pinky fan straight up.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.4, 0.3, 1.0, 1.0, 1.0]),
  },
  {
    id: 'alpha-g',
    name: 'ASL Letter G',
    expectedSign: 'G',
    description: 'Index and thumb pointing horizontally parallel; others curled.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'side',
    landmarks: createSyntheticLandmarks([0.8, 0.9, 0.2, 0.2, 0.2], { tiltAngleRad: Math.PI / 3 }),
  },
  {
    id: 'alpha-h',
    name: 'ASL Letter H',
    expectedSign: 'H',
    description: 'Index and middle fingers extended together horizontally.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'side',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 0.2, 0.2], { tiltAngleRad: Math.PI / 3 }),
  },
  {
    id: 'alpha-i',
    name: 'ASL Letter I',
    expectedSign: 'I',
    description: 'Pinky finger straight up; others curled with thumb across.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.2, 0.2, 0.2, 1.0]),
  },
  {
    id: 'alpha-k',
    name: 'ASL Letter K',
    expectedSign: 'K',
    description: 'Index upright, middle pointing forward, thumb wedged between.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.8, 1.0, 0.8, 0.2, 0.2]),
  },
  {
    id: 'alpha-l',
    name: 'ASL Letter L',
    expectedSign: 'L',
    description: 'Index finger straight up, thumb extended sideways in right angle.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([1.0, 1.0, 0.2, 0.2, 0.2], { thumbSpread: 0.7 }),
  },
  {
    id: 'alpha-m',
    name: 'ASL Letter M',
    expectedSign: 'M',
    description: 'Thumb tucked under index, middle, ring fingers; peeking at pinky.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.15, 0.15, 0.15, 0.15], { thumbTuckedRing: true }),
  },
  {
    id: 'alpha-n',
    name: 'ASL Letter N',
    expectedSign: 'N',
    description: 'Thumb tucked under index and middle fingers; peeking between middle and ring.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.15, 0.15, 0.15, 0.15], { thumbTuckedMiddle: true }),
  },
  {
    id: 'alpha-o',
    name: 'ASL Letter O',
    expectedSign: 'O',
    description: 'All fingertips touch thumb tip forming a closed circle.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'side',
    landmarks: createSyntheticLandmarks([0.4, 0.35, 0.35, 0.35, 0.35]),
  },
  {
    id: 'alpha-p',
    name: 'ASL Letter P',
    expectedSign: 'P',
    description: 'K-handshape pointing downward toward the floor.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'down',
    landmarks: createSyntheticLandmarks([0.8, 0.95, 0.95, 0.15, 0.15], { tiltAngleRad: 1.8 }),
  },
  {
    id: 'alpha-q',
    name: 'ASL Letter Q',
    expectedSign: 'Q',
    description: 'G-handshape pointing downward toward the floor.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'down',
    landmarks: createSyntheticLandmarks([0.85, 0.95, 0.1, 0.1, 0.1], { tiltAngleRad: 1.8 }),
  },
  {
    id: 'alpha-r',
    name: 'ASL Letter R',
    expectedSign: 'R',
    description: 'Index and middle fingers crossed like good-luck fingers.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.15, 0.95, 0.95, 0.15, 0.15], { indexMiddleSpread: -0.04 }),
  },
  {
    id: 'alpha-s',
    name: 'ASL Letter S',
    expectedSign: 'S',
    description: 'Tight fist with thumb folded horizontally across all fingers.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.2, 0.2, 0.2, 0.2], { thumbCrossing: true }),
  },
  {
    id: 'alpha-t',
    name: 'ASL Letter T',
    expectedSign: 'T',
    description: 'Thumb tucked under index finger only, peeking between index and middle.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.35, 0.15, 0.15, 0.15, 0.15], { thumbTuckedIndex: true }),
  },
  {
    id: 'alpha-u',
    name: 'ASL Letter U',
    expectedSign: 'U',
    description: 'Index and middle upright touching tightly.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 0.2, 0.2], { indexMiddleSpread: 0 }),
  },
  {
    id: 'alpha-v',
    name: 'ASL Letter V',
    expectedSign: 'V',
    description: 'Index and middle fingers spread apart in prominent V.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 0.2, 0.2], { indexMiddleSpread: 0.06 }),
  },
  {
    id: 'alpha-w',
    name: 'ASL Letter W',
    expectedSign: 'W',
    description: 'Index, middle, ring fingers spread upright.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 1.0, 1.0, 1.0, 0.2]),
  },
  {
    id: 'alpha-x',
    name: 'ASL Letter X',
    expectedSign: 'X',
    description: 'Index finger hooked; other fingers curled.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([0.2, 0.5, 0.2, 0.2, 0.2], { indexHook: true }),
  },
  {
    id: 'alpha-y',
    name: 'ASL Letter Y',
    expectedSign: 'Y',
    description: 'Thumb and pinky extended outward; index, middle, ring curled.',
    category: 'ALPHABET',
    type: 'STATIC',
    expectedOrientation: 'facing_camera',
    landmarks: createSyntheticLandmarks([1.0, 0.2, 0.2, 0.2, 1.0], { thumbSpread: 0.6 }),
  },

  // ==========================================
  // UNKNOWN / NEGATIVE SAMPLES
  // ==========================================
  {
    id: 'unknown-ring-only',
    name: 'Ambiguous Ring Finger Only',
    expectedSign: 'UNKNOWN',
    description: 'Only ring finger extended; does not correspond to standard ASL sign.',
    category: 'VOCABULARY',
    type: 'UNKNOWN',
    landmarks: createSyntheticLandmarks([0.2, 0.2, 0.2, 1.0, 0.2]),
  },
  {
    id: 'unknown-limp',
    name: 'Limp / Resting Hand Pose',
    expectedSign: 'UNKNOWN',
    description: 'Limp hand with no clear intentional sign geometry.',
    category: 'VOCABULARY',
    type: 'UNKNOWN',
    landmarks: createSyntheticLandmarks([0.3, 0.35, 0.35, 0.3, 0.3]),
  },
];
