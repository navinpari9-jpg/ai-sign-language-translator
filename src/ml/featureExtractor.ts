import { ExtractedGestureFeatures, FingerState, FingerStatesAnalysis, HandLandmarks, Landmark3D } from '../types';

export const LANDMARK_INDEX = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

// Euclidean distance between two 3D points
export function distance3D(a: Landmark3D, b: Landmark3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 2D distance
export function distance2D(a: Landmark3D, b: Landmark3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle formed by point A, vertex B, point C in degrees
export function calculateAngleDeg(a: Landmark3D, b: Landmark3D, c: Landmark3D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function getJointAngle(norm: HandLandmarks, aIdx: number, bIdx: number, cIdx: number): number {
  if (!norm[aIdx] || !norm[bIdx] || !norm[cIdx]) return 0;
  return calculateAngleDeg(norm[aIdx], norm[bIdx], norm[cIdx]);
}

/**
 * Normalizes landmarks so they are scale-invariant and wrist-centered.
 * Scale is normalized by palm size (distance between wrist and middle MCP).
 */
export function normalizeLandmarks(landmarks: HandLandmarks): HandLandmarks {
  if (!landmarks || landmarks.length < 21) return [];

  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const middleMcp = landmarks[LANDMARK_INDEX.MIDDLE_MCP];
  const indexMcp = landmarks[LANDMARK_INDEX.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARK_INDEX.PINKY_MCP];

  const palmHeight = distance3D(wrist, middleMcp);
  const palmWidth = distance3D(indexMcp, pinkyMcp);
  // Palm scale: prioritize stable palm height, with fallback to width
  const palmScale = palmHeight > 0.02 ? palmHeight : palmWidth > 0.02 ? palmWidth : 1.0;

  return landmarks.map((pt) => ({
    x: (pt.x - wrist.x) / palmScale,
    y: (pt.y - wrist.y) / palmScale,
    z: ((pt.z || 0) - (wrist.z || 0)) / palmScale,
  }));
}

/**
 * Robust finger state classifiers with tolerance
 */
export function getFingerFoldRatio(norm: HandLandmarks, tipIdx: number, mcpIdx: number, maxExpected = 1.6): number {
  if (!norm[tipIdx] || !norm[mcpIdx]) return 0;
  const dist = distance3D(norm[tipIdx], norm[mcpIdx]);
  return Math.max(0, Math.min(1, dist / maxExpected));
}

export function getFingerExtensionRatio(norm: HandLandmarks, tipIdx: number, mcpIdx: number): number {
  if (!norm[tipIdx] || !norm[mcpIdx] || !norm[LANDMARK_INDEX.WRIST]) return 0;
  const tipWristDist = distance3D(norm[tipIdx], norm[LANDMARK_INDEX.WRIST]);
  const mcpWristDist = distance3D(norm[mcpIdx], norm[LANDMARK_INDEX.WRIST]);
  return mcpWristDist > 0 ? tipWristDist / mcpWristDist : 0;
}

export function isThumbExtended(norm: HandLandmarks): boolean {
  if (!norm[LANDMARK_INDEX.THUMB_TIP] || !norm[LANDMARK_INDEX.THUMB_MCP]) return false;
  const tipDist = distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.WRIST]);
  const ipDist = distance3D(norm[LANDMARK_INDEX.THUMB_IP], norm[LANDMARK_INDEX.WRIST]);
  const mcpDist = distance3D(norm[LANDMARK_INDEX.THUMB_MCP], norm[LANDMARK_INDEX.WRIST]);
  const thumbAngle = calculateAngleDeg(
    norm[LANDMARK_INDEX.THUMB_MCP],
    norm[LANDMARK_INDEX.THUMB_IP],
    norm[LANDMARK_INDEX.THUMB_TIP]
  );
  return tipDist > mcpDist * 1.05 && tipDist > ipDist && thumbAngle > 130;
}

export function isIndexExtended(norm: HandLandmarks): boolean {
  return isSingleFingerExtended(norm, LANDMARK_INDEX.INDEX_TIP, LANDMARK_INDEX.INDEX_PIP, LANDMARK_INDEX.INDEX_MCP);
}

export function isMiddleExtended(norm: HandLandmarks): boolean {
  return isSingleFingerExtended(norm, LANDMARK_INDEX.MIDDLE_TIP, LANDMARK_INDEX.MIDDLE_PIP, LANDMARK_INDEX.MIDDLE_MCP);
}

export function isRingExtended(norm: HandLandmarks): boolean {
  return isSingleFingerExtended(norm, LANDMARK_INDEX.RING_TIP, LANDMARK_INDEX.RING_PIP, LANDMARK_INDEX.RING_MCP);
}

export function isPinkyExtended(norm: HandLandmarks): boolean {
  return isSingleFingerExtended(norm, LANDMARK_INDEX.PINKY_TIP, LANDMARK_INDEX.PINKY_PIP, LANDMARK_INDEX.PINKY_MCP);
}

export function isFingerCurled(norm: HandLandmarks, tipIdx: number, mcpIdx: number): boolean {
  if (!norm[tipIdx] || !norm[mcpIdx]) return false;
  return distance3D(norm[tipIdx], norm[mcpIdx]) < 0.65;
}

export function isFingerHooked(norm: HandLandmarks, tipIdx: number, pipIdx: number, mcpIdx: number): boolean {
  if (!norm[tipIdx] || !norm[pipIdx] || !norm[mcpIdx]) return false;
  const jointAngle = calculateAngleDeg(norm[mcpIdx], norm[pipIdx], norm[tipIdx]);
  return jointAngle < 125 && distance3D(norm[tipIdx], norm[mcpIdx]) > 0.45;
}

export function isThumbCrossed(norm: HandLandmarks): boolean {
  if (!norm[LANDMARK_INDEX.THUMB_TIP] || !norm[LANDMARK_INDEX.INDEX_MCP] || !norm[LANDMARK_INDEX.WRIST]) return false;
  return norm[LANDMARK_INDEX.THUMB_TIP].x > norm[LANDMARK_INDEX.INDEX_MCP].x &&
    norm[LANDMARK_INDEX.THUMB_TIP].y < norm[LANDMARK_INDEX.WRIST].y;
}

export function isThumbAlongside(norm: HandLandmarks): boolean {
  if (!norm[LANDMARK_INDEX.THUMB_TIP] || !norm[LANDMARK_INDEX.INDEX_MCP]) return false;
  const dist = distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.INDEX_MCP]);
  return !isThumbCrossed(norm) && dist < 0.45;
}

export function areFingersTouching(norm: HandLandmarks, tipA: number, tipB: number, threshold = 0.22): boolean {
  if (!norm[tipA] || !norm[tipB]) return false;
  return distance3D(norm[tipA], norm[tipB]) < threshold;
}

export function areFingersSeparated(norm: HandLandmarks, tipA: number, tipB: number, threshold = 0.25): boolean {
  if (!norm[tipA] || !norm[tipB]) return false;
  return distance3D(norm[tipA], norm[tipB]) >= threshold;
}

export function isHandFacingCamera(norm: HandLandmarks): boolean {
  if (!norm || norm.length < 21) return false;
  const wrist = norm[LANDMARK_INDEX.WRIST];
  const middleMcp = norm[LANDMARK_INDEX.MIDDLE_MCP];
  const indexMcp = norm[LANDMARK_INDEX.INDEX_MCP];
  const pinkyMcp = norm[LANDMARK_INDEX.PINKY_MCP];
  const vPalmY = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  const vPalmX = { x: pinkyMcp.x - indexMcp.x, y: pinkyMcp.y - indexMcp.y };
  const normalZ = vPalmX.x * vPalmY.y - vPalmX.y * vPalmY.x;
  return normalZ > 0;
}

export function isHandInProfile(norm: HandLandmarks): boolean {
  if (!norm || norm.length < 21) return false;
  const wrist = norm[LANDMARK_INDEX.WRIST];
  const middleMcp = norm[LANDMARK_INDEX.MIDDLE_MCP];
  const indexMcp = norm[LANDMARK_INDEX.INDEX_MCP];
  const pinkyMcp = norm[LANDMARK_INDEX.PINKY_MCP];
  const vPalmY = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  const vPalmX = { x: pinkyMcp.x - indexMcp.x, y: pinkyMcp.y - indexMcp.y };
  const normalZ = vPalmX.x * vPalmY.y - vPalmX.y * vPalmY.x;
  return Math.abs(normalZ) < 0.02;
}

export function isHandPointingDown(norm: HandLandmarks): boolean {
  if (!norm || norm.length < 21) return false;
  const wrist = norm[LANDMARK_INDEX.WRIST];
  const middleMcp = norm[LANDMARK_INDEX.MIDDLE_MCP];
  return (middleMcp.y - wrist.y) > 0.1;
}

function isSingleFingerExtended(norm: HandLandmarks, tipIdx: number, pipIdx: number, mcpIdx: number): boolean {
  if (!norm[tipIdx] || !norm[pipIdx] || !norm[mcpIdx]) return false;
  const tipWristDist = distance3D(norm[tipIdx], norm[LANDMARK_INDEX.WRIST]);
  const pipWristDist = distance3D(norm[pipIdx], norm[LANDMARK_INDEX.WRIST]);
  const tipMcpDist = distance3D(norm[tipIdx], norm[mcpIdx]);
  const jointAngle = calculateAngleDeg(norm[mcpIdx], norm[pipIdx], norm[tipIdx]);
  return tipWristDist > pipWristDist * 1.12 && tipMcpDist > 0.78 && jointAngle > 135;
}

/**
 * Determines ternary finger state: OPEN | CLOSED | PARTIAL
 */
export function determineFingerState(foldRatio: number, isExt: boolean, jointAngle: number): FingerState {
  if (isExt && foldRatio > 0.65 && jointAngle > 135) {
    return 'OPEN';
  }
  if (!isExt && foldRatio < 0.42 && jointAngle < 115) {
    return 'CLOSED';
  }
  return 'PARTIAL';
}

/**
 * Core Feature Extractor for static & dynamic sign classification
 */
export function extractFeaturesFromLandmarks(
  landmarks: HandLandmarks,
  secondHandLandmarks?: HandLandmarks,
  motionVelocities?: {
    indexTip?: { vx: number; vy: number };
    pinkyTip?: { vx: number; vy: number };
    wrist?: { vx: number; vy: number };
  }
): ExtractedGestureFeatures {
  const norm = normalizeLandmarks(landmarks);
  const wrist = landmarks[LANDMARK_INDEX.WRIST];
  const middleMcp = landmarks[LANDMARK_INDEX.MIDDLE_MCP];
  const indexMcp = landmarks[LANDMARK_INDEX.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARK_INDEX.PINKY_MCP];

  const palmHeight = distance3D(wrist, middleMcp);
  const palmWidth = distance3D(indexMcp, pinkyMcp);
  const palmScale = palmHeight > 0.02 ? palmHeight : palmWidth > 0.02 ? palmWidth : 1.0;

  // Finger extension booleans
  const fingersExtended = {
    thumb: isThumbExtended(norm),
    index: isIndexExtended(norm),
    middle: isMiddleExtended(norm),
    ring: isRingExtended(norm),
    pinky: isPinkyExtended(norm),
  };

  // Continuous Fold Ratios (0 = completely curled, 1 = fully extended)
  const fingerFoldRatios = {
    thumb: getFingerFoldRatio(norm, LANDMARK_INDEX.THUMB_TIP, LANDMARK_INDEX.THUMB_MCP, 1.3),
    index: getFingerFoldRatio(norm, LANDMARK_INDEX.INDEX_TIP, LANDMARK_INDEX.INDEX_MCP),
    middle: getFingerFoldRatio(norm, LANDMARK_INDEX.MIDDLE_TIP, LANDMARK_INDEX.MIDDLE_MCP),
    ring: getFingerFoldRatio(norm, LANDMARK_INDEX.RING_TIP, LANDMARK_INDEX.RING_MCP),
    pinky: getFingerFoldRatio(norm, LANDMARK_INDEX.PINKY_TIP, LANDMARK_INDEX.PINKY_MCP),
  };

  // Extension Ratios relative to MCP
  const fingerExtensionRatios = {
    thumb: getFingerExtensionRatio(norm, LANDMARK_INDEX.THUMB_TIP, LANDMARK_INDEX.THUMB_MCP),
    index: getFingerExtensionRatio(norm, LANDMARK_INDEX.INDEX_TIP, LANDMARK_INDEX.INDEX_MCP),
    middle: getFingerExtensionRatio(norm, LANDMARK_INDEX.MIDDLE_TIP, LANDMARK_INDEX.MIDDLE_MCP),
    ring: getFingerExtensionRatio(norm, LANDMARK_INDEX.RING_TIP, LANDMARK_INDEX.RING_MCP),
    pinky: getFingerExtensionRatio(norm, LANDMARK_INDEX.PINKY_TIP, LANDMARK_INDEX.PINKY_MCP),
  };

  // Joint Angles
  const jointAngles = {
    thumbCmc: getJointAngle(norm, LANDMARK_INDEX.WRIST, LANDMARK_INDEX.THUMB_CMC, LANDMARK_INDEX.THUMB_MCP),
    thumbMcp: getJointAngle(norm, LANDMARK_INDEX.THUMB_CMC, LANDMARK_INDEX.THUMB_MCP, LANDMARK_INDEX.THUMB_IP),
    thumbIp: getJointAngle(norm, LANDMARK_INDEX.THUMB_MCP, LANDMARK_INDEX.THUMB_IP, LANDMARK_INDEX.THUMB_TIP),
    indexMcp: getJointAngle(norm, LANDMARK_INDEX.WRIST, LANDMARK_INDEX.INDEX_MCP, LANDMARK_INDEX.INDEX_PIP),
    indexPip: getJointAngle(norm, LANDMARK_INDEX.INDEX_MCP, LANDMARK_INDEX.INDEX_PIP, LANDMARK_INDEX.INDEX_TIP),
    middleMcp: getJointAngle(norm, LANDMARK_INDEX.WRIST, LANDMARK_INDEX.MIDDLE_MCP, LANDMARK_INDEX.MIDDLE_PIP),
    middlePip: getJointAngle(norm, LANDMARK_INDEX.MIDDLE_MCP, LANDMARK_INDEX.MIDDLE_PIP, LANDMARK_INDEX.MIDDLE_TIP),
    ringMcp: getJointAngle(norm, LANDMARK_INDEX.WRIST, LANDMARK_INDEX.RING_MCP, LANDMARK_INDEX.RING_PIP),
    ringPip: getJointAngle(norm, LANDMARK_INDEX.RING_MCP, LANDMARK_INDEX.RING_PIP, LANDMARK_INDEX.RING_TIP),
    pinkyMcp: getJointAngle(norm, LANDMARK_INDEX.WRIST, LANDMARK_INDEX.PINKY_MCP, LANDMARK_INDEX.PINKY_PIP),
    pinkyPip: getJointAngle(norm, LANDMARK_INDEX.PINKY_MCP, LANDMARK_INDEX.PINKY_PIP, LANDMARK_INDEX.PINKY_TIP),
  };

  // Additional DIP angles for higher geometric resolution
  const dipJointAngles = {
    indexDip: getJointAngle(norm, LANDMARK_INDEX.INDEX_PIP, LANDMARK_INDEX.INDEX_DIP, LANDMARK_INDEX.INDEX_TIP),
    middleDip: getJointAngle(norm, LANDMARK_INDEX.MIDDLE_PIP, LANDMARK_INDEX.MIDDLE_DIP, LANDMARK_INDEX.MIDDLE_TIP),
    ringDip: getJointAngle(norm, LANDMARK_INDEX.RING_PIP, LANDMARK_INDEX.RING_DIP, LANDMARK_INDEX.RING_TIP),
    pinkyDip: getJointAngle(norm, LANDMARK_INDEX.PINKY_PIP, LANDMARK_INDEX.PINKY_DIP, LANDMARK_INDEX.PINKY_TIP),
  };

  // Ternary finger states
  const thumbState: FingerState = fingersExtended.thumb
    ? 'OPEN'
    : fingerFoldRatios.thumb < 0.45
    ? 'CLOSED'
    : 'PARTIAL';

  const indexState = determineFingerState(fingerFoldRatios.index, fingersExtended.index, jointAngles.indexPip);
  const middleState = determineFingerState(fingerFoldRatios.middle, fingersExtended.middle, jointAngles.middlePip);
  const ringState = determineFingerState(fingerFoldRatios.ring, fingersExtended.ring, jointAngles.ringPip);
  const pinkyState = determineFingerState(fingerFoldRatios.pinky, fingersExtended.pinky, jointAngles.pinkyPip);

  const fingerStates: FingerStatesAnalysis = {
    thumb: thumbState,
    index: indexState,
    middle: middleState,
    ring: ringState,
    pinky: pinkyState,
    openCount: [thumbState, indexState, middleState, ringState, pinkyState].filter((s) => s === 'OPEN').length,
  };

  // Fingertip-to-Fingertip Distances (All 10 pairs)
  const fingertipDistances = {
    thumbIndex: distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.INDEX_TIP]),
    thumbMiddle: distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.MIDDLE_TIP]),
    thumbRing: distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.RING_TIP]),
    thumbPinky: distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.PINKY_TIP]),
    indexMiddle: distance3D(norm[LANDMARK_INDEX.INDEX_TIP], norm[LANDMARK_INDEX.MIDDLE_TIP]),
    indexRing: distance3D(norm[LANDMARK_INDEX.INDEX_TIP], norm[LANDMARK_INDEX.RING_TIP]),
    indexPinky: distance3D(norm[LANDMARK_INDEX.INDEX_TIP], norm[LANDMARK_INDEX.PINKY_TIP]),
    middleRing: distance3D(norm[LANDMARK_INDEX.MIDDLE_TIP], norm[LANDMARK_INDEX.RING_TIP]),
    middlePinky: distance3D(norm[LANDMARK_INDEX.MIDDLE_TIP], norm[LANDMARK_INDEX.PINKY_TIP]),
    ringPinky: distance3D(norm[LANDMARK_INDEX.RING_TIP], norm[LANDMARK_INDEX.PINKY_TIP]),
  };

  // Palm Center (average of wrist, index MCP, middle MCP, pinky MCP)
  const palmCenter: Landmark3D = {
    x: (norm[LANDMARK_INDEX.WRIST].x + norm[LANDMARK_INDEX.INDEX_MCP].x + norm[LANDMARK_INDEX.MIDDLE_MCP].x + norm[LANDMARK_INDEX.PINKY_MCP].x) / 4,
    y: (norm[LANDMARK_INDEX.WRIST].y + norm[LANDMARK_INDEX.INDEX_MCP].y + norm[LANDMARK_INDEX.MIDDLE_MCP].y + norm[LANDMARK_INDEX.PINKY_MCP].y) / 4,
    z: ((norm[LANDMARK_INDEX.WRIST].z || 0) + (norm[LANDMARK_INDEX.INDEX_MCP].z || 0) + (norm[LANDMARK_INDEX.MIDDLE_MCP].z || 0) + (norm[LANDMARK_INDEX.PINKY_MCP].z || 0)) / 4,
  };

  // Fingertip-to-Palm Distances
  const fingertipToPalmDistances = {
    thumb: distance3D(norm[LANDMARK_INDEX.THUMB_TIP], palmCenter),
    index: distance3D(norm[LANDMARK_INDEX.INDEX_TIP], palmCenter),
    middle: distance3D(norm[LANDMARK_INDEX.MIDDLE_TIP], palmCenter),
    ring: distance3D(norm[LANDMARK_INDEX.RING_TIP], palmCenter),
    pinky: distance3D(norm[LANDMARK_INDEX.PINKY_TIP], palmCenter),
  };

  // Palm Orientation & Wrist Tilt
  const vPalmY = {
    x: middleMcp.x - wrist.x,
    y: middleMcp.y - wrist.y,
    z: (middleMcp.z || 0) - (wrist.z || 0),
  };
  const vPalmX = {
    x: pinkyMcp.x - indexMcp.x,
    y: pinkyMcp.y - indexMcp.y,
    z: (pinkyMcp.z || 0) - (indexMcp.z || 0),
  };

  // Cross product to obtain palm normal
  const normalX = vPalmX.y * vPalmY.z - vPalmX.z * vPalmY.y;
  const normalY = vPalmX.z * vPalmY.x - vPalmX.x * vPalmY.z;
  const normalZ = vPalmX.x * vPalmY.y - vPalmX.y * vPalmY.x;
  const normalMag = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ) || 1;

  let palmOrientation: 'facing_camera' | 'facing_away' | 'side' | 'up' | 'down' = 'facing_camera';

  // Check vertical tilt first (pointing down, e.g. for P, Q)
  if (vPalmY.y > 0.08) {
    palmOrientation = 'down';
  } else if (Math.abs(normalZ) < 0.016) {
    palmOrientation = 'side';
  } else if (normalZ > 0) {
    palmOrientation = 'facing_camera';
  } else {
    palmOrientation = 'facing_away';
  }

  // Wrist Tilt Angle relative to vertical (in 2D space)
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const wristTiltAngleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;

  const wristToMiddleRatio = distance3D(wrist, middleMcp) / palmScale;

  // Thumb crossing check (thumb crosses over the fingers horizontally, e.g. S vs A vs T vs M vs N)
  const isThumbCrossedOver =
    norm[LANDMARK_INDEX.THUMB_TIP].x > norm[LANDMARK_INDEX.INDEX_MCP].x &&
    norm[LANDMARK_INDEX.THUMB_TIP].y < norm[LANDMARK_INDEX.WRIST].y;

  // Two-hand features
  const isTwoHanded = Boolean(secondHandLandmarks && secondHandLandmarks.length >= 21);
  let twoHandDistance: number | undefined;
  if (isTwoHanded && secondHandLandmarks) {
    const secondWrist = secondHandLandmarks[LANDMARK_INDEX.WRIST];
    twoHandDistance = distance3D(wrist, secondWrist) / palmScale;
  }

  // Disambiguation features for visually similar signs (A vs S vs E vs T vs M vs N, U vs V vs R, X):
  const thumbToIndexPip = distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.INDEX_PIP]);
  const thumbToMiddlePip = distance3D(norm[LANDMARK_INDEX.THUMB_TIP], norm[LANDMARK_INDEX.MIDDLE_PIP]);
  const indexMiddleDeltaX = norm[LANDMARK_INDEX.INDEX_TIP].x - norm[LANDMARK_INDEX.MIDDLE_TIP].x;
  const thumbRelIndexMcpX = norm[LANDMARK_INDEX.THUMB_TIP].x - norm[LANDMARK_INDEX.INDEX_MCP].x;
  const indexHookAngle = calculateAngleDeg(norm[LANDMARK_INDEX.INDEX_MCP], norm[LANDMARK_INDEX.INDEX_PIP], norm[LANDMARK_INDEX.INDEX_TIP]) / 180;
  const avgCurledDist =
    (fingertipToPalmDistances.index +
      fingertipToPalmDistances.middle +
      fingertipToPalmDistances.ring +
      fingertipToPalmDistances.pinky) /
    4;

  // Construct comprehensive 117-element normalized numerical feature vector
  const rawFeatureVector: number[] = [];

  // 1. 21 Landmarks x 3 = 63 values
  norm.forEach((pt) => {
    rawFeatureVector.push(pt.x, pt.y, pt.z);
  });

  // 2. Joint Angles (MCP/PIP/DIP) normalized by 180 = 10 values
  rawFeatureVector.push(
    jointAngles.thumbMcp / 180,
    jointAngles.thumbIp / 180,
    jointAngles.indexPip / 180,
    dipJointAngles.indexDip / 180,
    jointAngles.middlePip / 180,
    dipJointAngles.middleDip / 180,
    jointAngles.ringPip / 180,
    dipJointAngles.ringDip / 180,
    jointAngles.pinkyPip / 180,
    dipJointAngles.pinkyDip / 180
  );

  // 3. Extension Ratios = 5 values
  rawFeatureVector.push(
    fingerExtensionRatios.thumb,
    fingerExtensionRatios.index,
    fingerExtensionRatios.middle,
    fingerExtensionRatios.ring,
    fingerExtensionRatios.pinky
  );

  // 4. Fold Ratios = 5 values
  rawFeatureVector.push(
    fingerFoldRatios.thumb,
    fingerFoldRatios.index,
    fingerFoldRatios.middle,
    fingerFoldRatios.ring,
    fingerFoldRatios.pinky
  );

  // 5. Fingertip to Palm Distances = 5 values
  rawFeatureVector.push(
    fingertipToPalmDistances.thumb,
    fingertipToPalmDistances.index,
    fingertipToPalmDistances.middle,
    fingertipToPalmDistances.ring,
    fingertipToPalmDistances.pinky
  );

  // 6. Pairwise Fingertip Distances (10 pairs) = 10 values
  rawFeatureVector.push(
    fingertipDistances.thumbIndex,
    fingertipDistances.thumbMiddle,
    fingertipDistances.thumbRing,
    fingertipDistances.thumbPinky,
    fingertipDistances.indexMiddle,
    fingertipDistances.indexRing,
    fingertipDistances.indexPinky,
    fingertipDistances.middleRing,
    fingertipDistances.middlePinky,
    fingertipDistances.ringPinky
  );

  // 7. Disambiguation features = 6 values
  rawFeatureVector.push(
    thumbToIndexPip,
    thumbToMiddlePip,
    indexMiddleDeltaX,
    thumbRelIndexMcpX,
    indexHookAngle,
    avgCurledDist
  );

  // 8. Orientation & Normal features = 5 values
  rawFeatureVector.push(
    normalX / normalMag,
    normalY / normalMag,
    normalZ / normalMag,
    wristTiltAngleDeg / 180,
    isThumbCrossedOver ? 1 : 0
  );

  // 9. Relational / Multi-hand = 2 values
  rawFeatureVector.push(
    wristToMiddleRatio,
    twoHandDistance ?? 0
  );

  // 10. Motion slots (velocity / direction) = 6 values
  rawFeatureVector.push(
    motionVelocities?.indexTip?.vx ?? 0,
    motionVelocities?.indexTip?.vy ?? 0,
    motionVelocities?.pinkyTip?.vx ?? 0,
    motionVelocities?.pinkyTip?.vy ?? 0,
    motionVelocities?.wrist?.vx ?? 0,
    motionVelocities?.wrist?.vy ?? 0
  );

  return {
    fingersExtended,
    fingerStates,
    fingerFoldRatios,
    fingerExtensionRatios,
    jointAngles,
    palmCenter,
    palmWidth: palmWidth / palmScale,
    palmHeight: palmHeight / palmScale,
    palmOrientation,
    wristTiltAngleDeg,
    wristToMiddleRatio,
    fingertipDistances,
    fingertipToPalmDistances,
    isThumbCrossedOver,
    isTwoHanded,
    twoHandDistance,
    rawFeatureVector,
  };
}
