import React from 'react';
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';

export const AboutLimitations: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Important Disclaimer Notice (Requirement 19) */}
      <div className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              Important Technical Disclaimer & Assistive Prototype Scope
            </h2>
            <p className="text-xs text-amber-900 mt-1 leading-relaxed">
              This application is designed as an <strong>assistive educational prototype</strong> powered by
              Google Gemini Vision. Computer-vision sign language recognition is subject to environmental
              factors including lighting conditions, camera frame rate, hand occlusion, background clutter,
              and motion blur.
            </p>
            <p className="text-xs text-amber-900 mt-1.5 leading-relaxed">
              This tool is not intended to replace certified human sign language interpreters in high-stakes
              medical, legal, or emergency scenarios. Do not assume 100% accuracy for all dialectal gestures.
            </p>
          </div>
        </div>
      </div>

      {/* How Recognition Works */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>How AI Sign Recognition Works</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="font-bold text-indigo-600 mb-1 block">Step 1</span>
              <h4 className="font-semibold text-slate-800 mb-1">Webcam Capture</h4>
              <p className="text-slate-600 leading-relaxed">
                High-resolution canvas frame is captured directly from your device camera.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">HTML5 MediaDevices API</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="font-bold text-indigo-600 mb-1 block">Step 2</span>
              <h4 className="font-semibold text-slate-800 mb-1">Gemini Vision AI</h4>
              <p className="text-slate-600 leading-relaxed">
                Analyzes finger configuration, palm orientation, and anatomical landmarks.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Gemini 3.8 Flash Vision</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="font-bold text-indigo-600 mb-1 block">Step 3</span>
              <h4 className="font-semibold text-slate-800 mb-1">Sentence Builder</h4>
              <p className="text-slate-600 leading-relaxed">
                Sequences sign gloss tokens and polishes grammar into natural English sentences.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Contextual AI Translation</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="font-bold text-indigo-600 mb-1 block">Step 4</span>
              <h4 className="font-semibold text-slate-800 mb-1">Voice Synthesis</h4>
              <p className="text-slate-600 leading-relaxed">
                Vocalizes the translation using natural speech synthesis with rate & pitch controls.
              </p>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Web Speech API</span>
          </div>
        </div>
      </div>

      {/* Best Practices for Accurate Recognition */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Best Practices for Clear Sign Capture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Frontal Lighting:</strong> Position light in front of you so hands and fingers are
              clearly distinguished from the background.
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Centered Framing:</strong> Keep your hands inside the framed boundary box on screen
              at chest or chin height.
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Hold Steady:</strong> Hold the gesture stationary for 1 second before capturing to
              avoid camera motion blur.
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Neutral Background:</strong> Solid or uncluttered backgrounds give the computer
              vision model maximum contrast.
            </div>
          </div>
        </div>
      </div>

      {/* Future Roadmap / Enhancements (Requirement 20) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span>Future Enhancements Roadmap (Requirement 20)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">Continuous Live Video Stream</h4>
            <p className="text-slate-600 leading-relaxed">
              Real-time frame-by-frame streaming with Gemini Live or MediaPipe hand mesh tracking for
              instant continuous sign transcription.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">Multi-Dialect Expansion (ISL, BSL, ASL)</h4>
            <p className="text-slate-600 leading-relaxed">
              Support for Indian Sign Language (ISL), British Sign Language (BSL), and regional variations
              with explicit sign system selectors.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">Two-Handed Complex Gesture Recognition</h4>
            <p className="text-slate-600 leading-relaxed">
              Advanced tracking for bilateral signs requiring coordinated spatial positioning of both
              dominant and non-dominant hands.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">3D Sign-Language Avatar</h4>
            <p className="text-slate-600 leading-relaxed">
              Interactive 3D rigged humanoid avatar rendering accurate 3D spatial signing motions for
              bilateral two-way communication.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">Voice-to-Sign Reverse Translation</h4>
            <p className="text-slate-600 leading-relaxed">
              Microphone speech-to-text pipeline that immediately translates spoken sentences into sign
              gesture illustrations for deaf individuals.
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100/70 rounded-lg">
            <h4 className="font-semibold text-indigo-950 mb-1">Offline On-Device ML Models</h4>
            <p className="text-slate-600 leading-relaxed">
              TensorFlow.js or ONNX-based lightweight gesture classifier models running locally in the
              browser without cloud latency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
