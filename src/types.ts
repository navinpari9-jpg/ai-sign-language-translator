export type ConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SignType = 'STATIC' | 'DYNAMIC' | 'UNKNOWN';

export type RecognitionMode = 'VOCABULARY' | 'ALPHABET' | 'HYBRID' | 'DYNAMIC_ALPHABET' | 'UNKNOWN';

export type FingerState = 'OPEN' | 'CLOSED' | 'PARTIAL';

export interface FingerStatesAnalysis {
  thumb: FingerState;
  index: FingerState;
  middle: FingerState;
  ring: FingerState;
  pinky: FingerState;
  openCount: number;
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export type HandLandmarks = Landmark3D[];

export interface HandBoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
}

export interface HandDetectionResult {
  handsCount: number;
  landmarks: HandLandmarks[];
  handedness: Array<'Left' | 'Right'>;
  boundingBoxes: HandBoundingBox[];
  isInsideGuide: boolean;
  handSizeRatio: number;
  lightingScore: number;
  motionBlurScore: number;
  qualityMessage?: string;
  timestamp: number;
}

export interface ExtractedGestureFeatures {
  fingersExtended: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  fingerStates: FingerStatesAnalysis;
  fingerFoldRatios: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };
  fingerExtensionRatios: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };
  jointAngles: {
    thumbMcp: number;
    thumbIp: number;
    indexPip: number;
    middlePip: number;
    ringPip: number;
    pinkyPip: number;
  };
  palmOrientation: 'facing_camera' | 'facing_away' | 'side' | 'up' | 'down';
  wristTiltAngleDeg: number;
  wristToMiddleRatio: number;
  fingertipDistances: {
    thumbIndex: number;
    indexMiddle: number;
    middleRing: number;
    ringPinky: number;
    thumbPinky: number;
    thumbMiddle: number;
    thumbRing: number;
  };
  fingertipToPalmDistances: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };
  isThumbCrossedOver: boolean;
  isTwoHanded: boolean;
  twoHandDistance?: number;
  rawFeatureVector: number[];
}

export interface SignCandidate {
  sign: string;
  meaning: string;
  score: number;
  signType: SignType;
  reason?: string;
}

export interface RawClassifierResult {
  topSign: string;
  meaning: string;
  score: number;
  signType: SignType;
  allCandidates: Record<string, number>;
  explanation: string;
  isRecognized: boolean;
  mode?: RecognitionMode;
  rejectionReason?: string;
}

export interface SmoothedRecognitionResult {
  sign: string;
  meaning: string;
  status: 'STABLE' | 'TRANSITIONING' | 'UNKNOWN' | 'NO_HAND';
  stabilityScore: number; // 0 - 100
  finalConfidence: number; // 0 - 100
  confidenceLevel: ConfidenceLevel;
  isStable: boolean;
  consecutiveFrames: number;
  message: string;
  latencyMs: number;
  fps: number;
  signType: SignType;
  mode: RecognitionMode;
  fingerStates?: FingerStatesAnalysis;
  palmOrientation?: string;
  candidateScores?: Record<string, number>;
  rejectionReason?: string;
  landmarks?: HandLandmarks[];
  boundingBoxes?: HandBoundingBox[];
  verificationStatus: 'NOT_NEEDED' | 'VERIFYING' | 'VERIFIED' | 'DISAGREED' | 'FAILED';
  verificationDetails?: {
    verifiedSign: string;
    geminiConfidence: number;
    agreement: boolean;
    explanation: string;
  };
  thumbnail?: string;
  timestamp: number;
}

export interface RecognitionResult {
  recognized_sign: string;
  meaning: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  is_valid_sign: boolean;
  explanation: string;
  timestamp?: number;
  thumbnail?: string;
}

export interface HistoryItem {
  id: string;
  sign: string;
  meaning: string;
  confidence: ConfidenceLevel | 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore?: number;
  timestamp: string;
  type: 'sign' | 'sentence';
  fullSentence?: string;
  thumbnail?: string;
  verifiedByGemini?: boolean;
}

export interface SignDictionaryEntry {
  word: string;
  sign_system: string;
  hand_shape: string;
  position: string;
  movement: string;
  tips: string;
  steps: string[];
  category?: string;
  isStatic?: boolean;
}

export interface CameraState {
  isActive: boolean;
  isRequesting: boolean;
  hasPermission: boolean | null;
  errorMessage: string | null;
  deviceId: string | null;
}

export interface BenchmarkSample {
  id: string;
  name: string;
  expectedSign: string;
  description: string;
  landmarks: HandLandmarks;
  category?: 'VOCABULARY' | 'ALPHABET';
  type?: SignType;
  expectedOrientation?: string;
  expectedFingerStates?: {
    thumb: FingerState;
    index: FingerState;
    middle: FingerState;
    ring: FingerState;
    pinky: FingerState;
  };
}

export interface TestResultEntry {
  id: string;
  expectedSign: string;
  predictedSign: string;
  correct: boolean;
  confidence: number;
  latencyMs: number;
  timestamp: number;
}

export interface TestBenchmarkMetrics {
  totalSamples: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  averageLatencyMs: number;
  results: TestResultEntry[];
}
