import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
  HelpCircle,
  Eye,
  BookOpen,
} from 'lucide-react';
import { CameraState, ExtractedGestureFeatures, HandDetectionResult, RecognitionMode, SmoothedRecognitionResult } from '../types';
import { cameraService } from '../services/cameraService';
import { handTracker } from '../services/handTracker';
import { gestureFeatures } from '../services/gestureFeatures';
import { signClassifier } from '../services/signClassifier';
import { alphabetMotionTracker } from '../services/alphabetMotionTracker';
import { temporalSmoother } from '../services/temporalSmoother';
import { SUPPORTED_SIGN_LANGUAGE } from '../ml/labels';
import { BENCHMARK_SAMPLES } from '../data/benchmarkSamples';

interface CameraViewProps {
  cameraState: CameraState;
  setCameraState: React.Dispatch<React.SetStateAction<CameraState>>;
  onResultChange: (result: SmoothedRecognitionResult) => void;
  onRequestVerification: (result: SmoothedRecognitionResult, frameDataUrl: string) => void;
  onOpenBenchmark: () => void;
  recognitionMode?: RecognitionMode;
  setRecognitionMode?: (mode: RecognitionMode) => void;
  onOpenAlphabetGuide?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  cameraState,
  setCameraState,
  onResultChange,
  onRequestVerification,
  onOpenBenchmark,
  recognitionMode,
  setRecognitionMode,
  onOpenAlphabetGuide,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Recognition Mode state
  const [internalMode, setInternalMode] = useState<RecognitionMode>('HYBRID');
  const activeMode = recognitionMode || internalMode;

  const handleModeChange = (newMode: RecognitionMode) => {
    setInternalMode(newMode);
    if (setRecognitionMode) {
      setRecognitionMode(newMode);
    }
    temporalSmoother.reset();
  };

  // Settings
  const [isMirrored, setIsMirrored] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [autoVerifyUncertain, setAutoVerifyUncertain] = useState(true);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // UI state updated at low frequency (every ~120ms or on state change) to keep React UI 60fps
  const [displayResult, setDisplayResult] = useState<SmoothedRecognitionResult | null>(null);
  const [handMessage, setHandMessage] = useState('No hand detected');
  const [isInsideGuide, setIsInsideGuide] = useState(false);
  const [fps, setFps] = useState(0);
  const [latencyMs, setLatencyMs] = useState(0);
  const [modelStatus, setModelStatus] = useState<'INITIALIZING' | 'READY' | 'ERROR'>('INITIALIZING');

  // Animation frame & metrics refs
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);
  const lastVerifiedSignRef = useRef<string | null>(null);
  const isVerifyingRef = useRef<boolean>(false);

  // Enumerate cameras
  useEffect(() => {
    cameraService.getAvailableCameras().then((devices) => {
      setAvailableDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    });
  }, [selectedDeviceId]);

  // Initialize MediaPipe once on mount
  useEffect(() => {
    let isMounted = true;
    handTracker.initialize().then((success) => {
      if (isMounted) {
        setModelStatus(success ? 'READY' : 'ERROR');
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Capture current video frame to JPEG Data URL
  const captureFrameDataUrl = useCallback((): string | null => {
    if (!videoRef.current || !captureCanvasRef.current) return null;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [isMirrored]);

  // Main real-time processing loop running at native RAF
  const processRealtimeLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraState.isActive) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState >= 2 && ctx) {
      const now = performance.now();
      const startTime = now;

      // Ensure canvas matches video display dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Process Video Frame with MediaPipe HandTracker
      const detection: HandDetectionResult = handTracker.processFrame(video, now);

      // 2. Extract Features & Classify
      let rawPrediction;
      let features: ExtractedGestureFeatures | undefined;
      if (detection.handsCount > 0 && detection.landmarks[0]) {
        const velocities = alphabetMotionTracker.getRecentVelocities();
        features = gestureFeatures.extract(
          detection.landmarks[0],
          detection.landmarks[1],
          velocities
        );
        rawPrediction = signClassifier.classify(
          features,
          detection.landmarks[0],
          detection.landmarks[1],
          activeMode
        );
      } else {
        rawPrediction = {
          topSign: 'NO_HAND',
          meaning: '',
          score: 0,
          signType: 'UNKNOWN' as const,
          allCandidates: {},
          explanation: 'No hand detected.',
          isRecognized: false,
          mode: activeMode,
        };
      }

      // Compute processing latency for local engine
      const processLatency = Math.round(performance.now() - startTime);

      // 3. Temporal Smoothing across Rolling Prediction Window
      const smoothed = temporalSmoother.pushFrame(
        rawPrediction,
        detection,
        processLatency,
        fps,
        features,
        activeMode
      );

      // 4. Render Landmark Overlays & Guide Box on Canvas
      renderOverlays(ctx, canvas.width, canvas.height, detection, smoothed, features);

      // 5. FPS Counter Calculation
      frameCountRef.current++;
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      // 6. Throttled UI state synchronization (every ~100ms)
      if (now - lastUiUpdateRef.current > 100) {
        lastUiUpdateRef.current = now;
        setDisplayResult(smoothed);
        setHandMessage(detection.qualityMessage || 'No hand detected');
        setIsInsideGuide(detection.isInsideGuide);
        setLatencyMs(processLatency);
        onResultChange(smoothed);

        // 7. Optional Secondary Verification Trigger for Stable Candidate Signs
        if (
          autoVerifyUncertain &&
          smoothed.isStable &&
          smoothed.sign !== 'UNKNOWN' &&
          smoothed.sign !== 'NO_HAND' &&
          smoothed.sign !== lastVerifiedSignRef.current &&
          !isVerifyingRef.current
        ) {
          const frameSnapshot = captureFrameDataUrl();
          if (frameSnapshot) {
            isVerifyingRef.current = true;
            lastVerifiedSignRef.current = smoothed.sign;
            onRequestVerification(smoothed, frameSnapshot);
            setTimeout(() => {
              isVerifyingRef.current = false;
            }, 3000); // 3-second cooldown between verifications
          }
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processRealtimeLoop);
  }, [
    cameraState.isActive,
    activeMode,
    fps,
    isMirrored,
    autoVerifyUncertain,
    captureFrameDataUrl,
    onResultChange,
    onRequestVerification,
  ]);

  // Draw Hand Skeleton & Landmarks on overlay canvas
  const renderOverlays = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    detection: HandDetectionResult,
    smoothed: SmoothedRecognitionResult,
    features?: ExtractedGestureFeatures
  ) => {
    // 1. Draw Centered Guide Box
    if (showGuidelines) {
      const boxX = width * 0.18;
      const boxY = height * 0.12;
      const boxW = width * 0.64;
      const boxH = height * 0.76;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = detection.isInsideGuide
        ? 'rgba(34, 197, 94, 0.85)' // Emerald green when inside
        : 'rgba(234, 179, 8, 0.75)'; // Amber when outside
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.restore();
    }

    // 2. Draw Hand Landmarks & Bones
    if (showSkeleton && detection.landmarks.length > 0) {
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm base
        [5, 9], [9, 13], [13, 17],
      ];

      detection.landmarks.forEach((hand) => {
        // Draw bones
        ctx.save();
        ctx.lineWidth = 3;
        ctx.strokeStyle = smoothed.isStable ? '#22c55e' : '#6366f1';

        connections.forEach(([i, j]) => {
          const ptA = hand[i];
          const ptB = hand[j];
          if (!ptA || !ptB) return;

          const ax = isMirrored ? (1 - ptA.x) * width : ptA.x * width;
          const ay = ptA.y * height;
          const bx = isMirrored ? (1 - ptB.x) * width : ptB.x * width;
          const by = ptB.y * height;

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        });

        // Draw joint points with finger-state cues
        hand.forEach((pt, idx) => {
          const px = isMirrored ? (1 - pt.x) * width : pt.x * width;
          const py = pt.y * height;

          ctx.beginPath();
          const isFingertip = [4, 8, 12, 16, 20].includes(idx);
          ctx.arc(px, py, isFingertip ? 6 : 3.5, 0, Math.PI * 2);

          // Color-code fingertips based on extension state
          let fillColor = '#ffffff';
          if (isFingertip && features?.fingerStates) {
            let state = 'CLOSED';
            if (idx === 4) state = features.fingerStates.thumb;
            else if (idx === 8) state = features.fingerStates.index;
            else if (idx === 12) state = features.fingerStates.middle;
            else if (idx === 16) state = features.fingerStates.ring;
            else if (idx === 20) state = features.fingerStates.pinky;

            fillColor = state === 'OPEN' ? '#22c55e' : state === 'PARTIAL' ? '#f59e0b' : '#6366f1';
          } else if (isFingertip) {
            fillColor = '#6366f1';
          }

          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
        });
        ctx.restore();
      });

      // 3. Draw Dynamic Motion Trajectory Trail (for J and Z gestures)
      const trajectory = alphabetMotionTracker.getTrajectory();
      if (trajectory.length > 2) {
        ctx.save();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#c084fc';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        trajectory.forEach((pt, i) => {
          // Track tip based on gesture type
          const tip = pt.pinkyTip.y > pt.indexTip.y ? pt.indexTip : pt.pinkyTip;
          const tx = isMirrored ? (1 - tip.x) * width : tip.x * width;
          const ty = tip.y * height;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        });
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  // Start Camera Stream
  const startCamera = async (deviceId?: string) => {
    setCameraState((prev) => ({ ...prev, isRequesting: true, errorMessage: null }));
    try {
      const stream = await cameraService.startStream(deviceId);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState({
        isActive: true,
        isRequesting: false,
        hasPermission: true,
        errorMessage: null,
        deviceId: deviceId || selectedDeviceId || null,
      });
      temporalSmoother.reset();
    } catch (err: any) {
      console.error('Camera start error:', err);
      let message = 'Could not access the camera. Please check browser permissions.';
      if (err.name === 'NotAllowedError') {
        message = 'Camera permission was denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        message = 'No camera device found. You can test with benchmark samples or sample cards below.';
      }
      setCameraState({
        isActive: false,
        isRequesting: false,
        hasPermission: false,
        errorMessage: message,
        deviceId: null,
      });
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    cameraService.stopStream();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    temporalSmoother.reset();
    setDisplayResult(null);
    setCameraState((prev) => ({ ...prev, isActive: false, isRequesting: false }));
  };

  // Start / Stop animation loop depending on camera active state
  useEffect(() => {
    if (cameraState.isActive) {
      animationFrameIdRef.current = requestAnimationFrame(processRealtimeLoop);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [cameraState.isActive, processRealtimeLoop]);

  // Quick Synthetic Benchmark Tester for instant camera-less verification
  const injectSampleSign = (sampleId: string) => {
    const sample = BENCHMARK_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;

    const features = gestureFeatures.extract(sample.landmarks);
    const rawResult = signClassifier.classify(features, sample.landmarks);

    const syntheticDetection: HandDetectionResult = {
      handsCount: 1,
      landmarks: [sample.landmarks],
      handedness: ['Right'],
      boundingBoxes: [{ xMin: 0.3, yMin: 0.3, xMax: 0.7, yMax: 0.8, width: 0.4, height: 0.5 }],
      isInsideGuide: true,
      handSizeRatio: 0.2,
      lightingScore: 0.9,
      motionBlurScore: 1.0,
      qualityMessage: 'Synthetic sample loaded',
      timestamp: Date.now(),
    };

    // Push multiple frames to test temporal stability
    let smoothed: SmoothedRecognitionResult = {} as any;
    for (let i = 0; i < 7; i++) {
      smoothed = temporalSmoother.pushFrame(rawResult, syntheticDetection, 8, 30);
    }

    setDisplayResult(smoothed);
    setHandMessage('Synthetic gesture test sample active');
    setIsInsideGuide(true);
    setLatencyMs(8);
    onResultChange(smoothed);
  };

  // Stability progress bar string: ████████░░ 82%
  const renderStabilityMeter = (pct: number) => {
    const blocks = Math.round(pct / 10);
    const filled = '█'.repeat(blocks);
    const empty = '░'.repeat(10 - blocks);
    return `${filled}${empty} ${pct}%`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Top Card Bar with Language Scope Indicator */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Real-Time Vision Stream</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
            ASL
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              cameraState.isActive ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cameraState.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            {cameraState.isActive ? `${fps} FPS` : 'Offline'}
          </span>
        </div>
      </div>

      {/* Recognition Mode Selector & Quick Alphabet Guide Bar */}
      <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => handleModeChange('VOCABULARY')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeMode === 'VOCABULARY'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Vocabulary
          </button>
          <button
            onClick={() => handleModeChange('ALPHABET')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeMode === 'ALPHABET'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Fingerspelling (A–Z)
          </button>
          <button
            onClick={() => handleModeChange('HYBRID')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
              activeMode === 'HYBRID'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Hybrid / Auto
          </button>
        </div>

        {onOpenAlphabetGuide && (
          <button
            onClick={onOpenAlphabetGuide}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>A–Z Chart</span>
          </button>
        )}
      </div>

      {/* Camera Viewport Canvas */}
      <div className="relative bg-slate-950 aspect-4/3 sm:aspect-16/10 flex items-center justify-center overflow-hidden">
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${
            isMirrored ? 'scale-x-[-1]' : 'scale-x-100'
          } ${cameraState.isActive ? 'block' : 'hidden'}`}
        />

        {/* Real-time Skeleton Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            cameraState.isActive ? 'block' : 'hidden'
          }`}
        />

        {/* Hidden Canvas for JPEG Snapshotting */}
        <canvas ref={captureCanvasRef} className="hidden" />

        {/* Live HUD Overlay: Hand Guide Box, Stability & Detection */}
        {cameraState.isActive && (
          <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
            {/* Top HUD Badges */}
            <div className="flex items-center justify-between">
              <div className="bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-700/60 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isInsideGuide ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>Detection: {handMessage}</span>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-xs text-cyan-300 px-2.5 py-1 rounded-lg text-[11px] font-mono border border-slate-700/60">
                Latency: {latencyMs}ms
              </div>
            </div>

            {/* Bottom HUD: Live Stability & Recognized Sign Preview */}
            <div className="bg-slate-950/85 backdrop-blur-md rounded-xl p-3 border border-slate-800 text-white space-y-1.5 pointer-events-auto">
              {/* Conflict banner if Gemini verification disagreed (Requirement 15) */}
              {displayResult?.verificationStatus === 'DISAGREED' && (
                <div className="p-2 bg-rose-950/80 border border-rose-500/50 rounded-lg text-rose-200 text-xs mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Local: <strong className="text-white">{displayResult.sign}</strong> | AI Verification: <strong className="text-amber-300">{displayResult.verificationDetails?.verifiedSign || 'Different'}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded uppercase">
                    CONFLICT — PLEASE RETRY
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">
                  Stability: {renderStabilityMeter(displayResult?.stabilityScore ?? 0)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    displayResult?.confidenceLevel === 'VERY_HIGH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : displayResult?.confidenceLevel === 'HIGH'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : displayResult?.confidenceLevel === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {displayResult?.confidenceLevel || 'LOW'} CONFIDENCE
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Recognition:
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {displayResult?.sign && displayResult.sign !== 'NO_HAND'
                      ? displayResult.sign
                      : 'WAITING FOR GESTURE'}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    AI Confidence:
                  </span>
                  <span className="text-base font-extrabold text-cyan-400 font-mono">
                    {displayResult?.finalConfidence ?? 0}%
                  </span>
                </div>
              </div>

              {/* Prototype transparency notice */}
              <div className="text-[10px] text-slate-500 pt-0.5 flex justify-between items-center">
                <span>AI recognition confidence</span>
                <span className="italic">Prototype — results may vary.</span>
              </div>
            </div>
          </div>
        )}

        {/* Offline / Idle State */}
        {!cameraState.isActive && (
          <div className="p-6 text-center max-w-sm flex flex-col items-center justify-center">
            {cameraState.errorMessage ? (
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Camera Notice</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {cameraState.errorMessage}
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  Real-Time Local Camera
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fast client-side landmark tracking at ~30 FPS with temporal smoothing.
                </p>
              </div>
            )}

            <button
              onClick={() => startCamera(selectedDeviceId)}
              disabled={cameraState.isRequesting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {cameraState.isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Requesting Access...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Camera Controls & Settings Bar */}
      <div className="p-4 space-y-3 bg-slate-50/50 border-t border-slate-100 text-xs">
        <div className="flex items-center justify-between gap-2">
          {cameraState.isActive ? (
            <button
              onClick={stopCamera}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CameraOff className="w-4 h-4 text-slate-600" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={() => startCamera(selectedDeviceId)}
              disabled={cameraState.isRequesting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenBenchmark}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Run quantitative accuracy & precision tests"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Test Benchmark</span>
            </button>

            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Technical</span>
              {showTechnicalDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Toggles: Mirror, Skeleton, Guide Box */}
        {cameraState.isActive && (
          <div className="flex flex-wrap items-center justify-between pt-1 text-slate-600">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isMirrored}
                  onChange={(e) => setIsMirrored(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Mirror View</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSkeleton}
                  onChange={(e) => setShowSkeleton(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Skeleton</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGuidelines}
                  onChange={(e) => setShowGuidelines(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Guide Box</span>
              </label>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-indigo-700 font-medium">
              <input
                type="checkbox"
                checked={autoVerifyUncertain}
                onChange={(e) => setAutoVerifyUncertain(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span>Gemini Auto-Verify</span>
            </label>
          </div>
        )}

        {/* Expandable Developer Mode / Technical Diagnostics Section (Requirement 23) */}
        {showTechnicalDetails && (
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs space-y-3 mt-2 font-mono">
            <div className="flex justify-between items-center text-slate-300 font-semibold border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Sliders className="w-4 h-4" />
                <span>Developer Diagnostics & Pipeline</span>
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
                TFJS Deep Classifier + MediaPipe
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Frame Rate</span>
                <span className="font-bold text-emerald-400 text-sm">{fps} FPS</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Latency</span>
                <span className="font-bold text-cyan-300 text-sm">{latencyMs} ms</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Landmark Quality</span>
                <span className={`font-bold text-sm ${isInsideGuide ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isInsideGuide ? 'GOOD' : 'FAIR (Outside Box)'}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Recognition Mode</span>
                <span className="font-bold text-indigo-300 text-sm">{activeMode}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Palm Orientation</span>
                <span className="font-bold text-slate-200 text-sm">
                  {displayResult?.palmOrientation || 'facing_camera'}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Temporal Agreement</span>
                <span className="font-bold text-slate-200 text-sm">
                  {displayResult?.consecutiveFrames ?? 0}/12 frames ({displayResult?.stabilityScore ?? 0}%)
                </span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Model Probability</span>
                <span className="font-bold text-cyan-400 text-sm">
                  {displayResult?.topCandidates?.[0]
                    ? `${(displayResult.topCandidates[0].probability * 100).toFixed(0)}%`
                    : `${displayResult?.finalConfidence ?? 0}%`}
                </span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                <span className="text-slate-400 block text-[10px] uppercase">Final Confidence</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {displayResult?.finalConfidence ?? 0}%
                </span>
              </div>
            </div>

            {/* Top 3 Candidate Probabilities */}
            <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
                Top Model Candidates & Disambiguation Margin:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {displayResult?.topCandidates && displayResult.topCandidates.length > 0 ? (
                  displayResult.topCandidates.slice(0, 3).map((cand, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded text-xs ${
                        idx === 0
                          ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/60 font-bold'
                          : 'bg-slate-700/50 text-slate-300 border border-slate-600/40'
                      }`}
                    >
                      {idx === 0 ? 'Top: ' : idx === 1 ? 'Second: ' : 'Third: '}
                      {cand.label} ({(cand.probability * 100).toFixed(0)}%)
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs italic">Awaiting hand posture...</span>
                )}
                {typeof displayResult?.marginDelta === 'number' && (
                  <span className="text-[11px] text-slate-400 ml-auto font-mono">
                    Margin: {(displayResult.marginDelta * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Sample Gesture Buttons for Testing without camera */}
        <div className="pt-2 border-t border-slate-200/60">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>Test benchmark samples directly:</span>
            <span className="text-[10px] text-indigo-600 font-medium">Bypasses camera</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => injectSampleSign('sample-ily-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              🤟 I Love You
            </button>
            <button
              onClick={() => injectSampleSign('sample-peace-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              ✌️ Peace
            </button>
            <button
              onClick={() => injectSampleSign('sample-thumbsup-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              👍 Thumbs Up / Yes
            </button>
            <button
              onClick={() => injectSampleSign('sample-hello-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              👋 Hello
            </button>
            <button
              onClick={() => injectSampleSign('sample-water-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              💧 Water
            </button>
            <button
              onClick={() => injectSampleSign('sample-unknown-1')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              ❓ Ambiguous Pose (Unknown)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
