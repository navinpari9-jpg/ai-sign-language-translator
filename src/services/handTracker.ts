import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandBoundingBox, HandDetectionResult, HandLandmarks, Landmark3D } from '../types';

export class HandTrackerService {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;
  private isReady = false;
  private initError: string | null = null;

  // Offscreen canvas for lighting & blur analysis
  private checkCanvas: HTMLCanvasElement | null = null;
  private checkCtx: CanvasRenderingContext2D | null = null;

  // Track previous landmarks for motion blur estimation
  private lastLandmarks: HandLandmarks | null = null;
  private lastTimestamp = 0;

  constructor() {
    if (typeof document !== 'undefined') {
      this.checkCanvas = document.createElement('canvas');
      this.checkCanvas.width = 48;
      this.checkCanvas.height = 36;
      this.checkCtx = this.checkCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      console.log('Initializing MediaPipe HandLandmarker...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });

      this.isReady = true;
      this.isInitializing = false;
      console.log('MediaPipe HandLandmarker ready.');
      return true;
    } catch (err: any) {
      console.warn('GPU delegate failed or CDN fetch warning, attempting CPU fallback:', err);
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
        });
        this.isReady = true;
        this.isInitializing = false;
        return true;
      } catch (cpuErr: any) {
        this.initError = cpuErr?.message || 'Failed to initialize hand tracking model.';
        this.isInitializing = false;
        console.error('MediaPipe HandLandmarker init error:', cpuErr);
        return false;
      }
    }
  }

  public getStatus() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      error: this.initError,
    };
  }

  /**
   * Evaluates lighting from video frame using sampled luminance
   */
  private assessLighting(video: HTMLVideoElement): number {
    if (!this.checkCtx || !this.checkCanvas) return 0.75;
    try {
      this.checkCtx.drawImage(video, 0, 0, 48, 36);
      const imgData = this.checkCtx.getImageData(0, 0, 48, 36).data;
      let totalLuminance = 0;
      const count = imgData.length / 4;

      for (let i = 0; i < imgData.length; i += 4) {
        // Standard perceived luminance: 0.299 R + 0.587 G + 0.114 B
        totalLuminance += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      const avg = totalLuminance / count; // 0 to 255
      return Math.min(1.0, Math.max(0, avg / 220));
    } catch (e) {
      return 0.75;
    }
  }

  /**
   * Process a single video frame with MediaPipe and compute quality signals
   */
  public processFrame(video: HTMLVideoElement, timestampMs: number): HandDetectionResult {
    const defaultResult: HandDetectionResult = {
      handsCount: 0,
      landmarks: [],
      handedness: [],
      boundingBoxes: [],
      isInsideGuide: false,
      handSizeRatio: 0,
      lightingScore: 0.75,
      motionBlurScore: 1.0,
      qualityMessage: 'No hand detected',
      timestamp: timestampMs,
    };

    if (!this.handLandmarker || !this.isReady || video.readyState < 2) {
      return defaultResult;
    }

    const lightingScore = this.assessLighting(video);

    try {
      const results = this.handLandmarker.detectForVideo(video, timestampMs);

      if (!results.landmarks || results.landmarks.length === 0) {
        return {
          ...defaultResult,
          lightingScore,
          qualityMessage: lightingScore < 0.22 ? 'Lighting is too low' : 'No hand detected',
        };
      }

      const landmarks: HandLandmarks[] = results.landmarks.map((hand) =>
        hand.map((pt) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z ?? 0,
        }))
      );

      const handedness: Array<'Left' | 'Right'> = (results.handednesses || []).map((h) => {
        const cat = h[0]?.categoryName;
        return cat === 'Left' ? 'Left' : 'Right';
      });

      // Calculate bounding boxes for all detected hands
      const boundingBoxes: HandBoundingBox[] = landmarks.map((hand) => {
        let xMin = 1;
        let yMin = 1;
        let xMax = 0;
        let yMax = 0;
        for (const pt of hand) {
          if (pt.x < xMin) xMin = pt.x;
          if (pt.y < yMin) yMin = pt.y;
          if (pt.x > xMax) xMax = pt.x;
          if (pt.y > yMax) yMax = pt.y;
        }
        return {
          xMin,
          yMin,
          xMax,
          yMax,
          width: Math.max(0.01, xMax - xMin),
          height: Math.max(0.01, yMax - yMin),
        };
      });

      // Primary hand check
      const primaryBox = boundingBoxes[0];
      const primaryHand = landmarks[0];

      // Hand Size Check (bounding box area ratio)
      const handSizeRatio = primaryBox.width * primaryBox.height;

      // Guide Box Check: Recommended area is center 70% of frame [0.15, 0.10, 0.85, 0.90]
      const isInsideGuide =
        primaryBox.xMin >= 0.05 &&
        primaryBox.xMax <= 0.95 &&
        primaryBox.yMin >= 0.05 &&
        primaryBox.yMax <= 0.95;

      // Motion / stability score calculation
      let motionBlurScore = 0.95;
      if (this.lastLandmarks && this.lastLandmarks.length >= 21) {
        const dt = Math.max(1, timestampMs - this.lastTimestamp);
        // Measure movement of wrist and middle MCP
        const dxWrist = primaryHand[0].x - this.lastLandmarks[0].x;
        const dyWrist = primaryHand[0].y - this.lastLandmarks[0].y;
        const dist = Math.sqrt(dxWrist * dxWrist + dyWrist * dyWrist);
        const velocity = (dist / dt) * 1000; // movement per second in normalized coords

        if (velocity > 1.2) {
          motionBlurScore = Math.max(0.2, 1.0 - (velocity - 1.2) * 0.5);
        }
      }

      this.lastLandmarks = primaryHand;
      this.lastTimestamp = timestampMs;

      // Quality message prioritization
      let qualityMessage = 'Hand detected';
      if (lightingScore < 0.2) {
        qualityMessage = 'Lighting is too low';
      } else if (!isInsideGuide) {
        qualityMessage = 'Move your hand into the guide box';
      } else if (handSizeRatio < 0.04) {
        qualityMessage = 'Move slightly closer';
      } else if (handSizeRatio > 0.65) {
        qualityMessage = 'Move slightly back';
      } else if (motionBlurScore < 0.55) {
        qualityMessage = 'Hold your hand steady';
      }

      return {
        handsCount: landmarks.length,
        landmarks,
        handedness,
        boundingBoxes,
        isInsideGuide,
        handSizeRatio,
        lightingScore,
        motionBlurScore,
        qualityMessage,
        timestamp: timestampMs,
      };
    } catch (err) {
      console.warn('HandLandmarker inference warning:', err);
      return defaultResult;
    }
  }
}

export const handTracker = new HandTrackerService();
