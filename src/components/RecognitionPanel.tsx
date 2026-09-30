import React from 'react';
import {
  Sparkles,
  PlusCircle,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { ConfidenceLevel, SmoothedRecognitionResult } from '../types';

interface RecognitionPanelProps {
  result: SmoothedRecognitionResult | null;
  onAddToSentence: (sign: string) => void;
  onSpeak: (text: string) => void;
  isVerifyingWithGemini?: boolean;
}

export const RecognitionPanel: React.FC<RecognitionPanelProps> = ({
  result,
  onAddToSentence,
  onSpeak,
  isVerifyingWithGemini = false,
}) => {
  const renderConfidenceBadge = (level: ConfidenceLevel, score: number) => {
    switch (level) {
      case 'VERY_HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300/80 px-2.5 py-0.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Very High ({score}%)</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-800 bg-indigo-50 border border-indigo-300/80 px-2.5 py-0.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>High ({score}%)</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300/80 px-2.5 py-0.5 rounded-md">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Medium ({score}%)</span>
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300/80 px-2.5 py-0.5 rounded-md">
            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Low ({score}%)</span>
          </span>
        );
    }
  };

  const isSignValid =
    Boolean(result) &&
    result!.sign !== 'UNKNOWN' &&
    result!.sign !== 'NO_HAND' &&
    result!.sign.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Panel Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Sign Recognition Engine</h2>
        </div>
        {result && isSignValid && renderConfidenceBadge(result.confidenceLevel, result.finalConfidence)}
      </div>

      {/* Body Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Verification Loader Badge */}
        {isVerifyingWithGemini && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Gemini Vision secondary verification in progress...</span>
          </div>
        )}

        {!result || result.status === 'NO_HAND' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">
              No Hand Detected
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Start the camera and position your hand in the center guide box to recognize ASL signs.
            </p>
          </div>
        ) : !isSignValid ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Sign not recognized. Please try again.
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mb-4 leading-relaxed">
              {result.message || 'Hold your hand steady and form a standard ASL sign posture.'}
            </p>

            <div className="p-3 bg-slate-50 rounded-lg text-left text-xs text-slate-600 border border-slate-100 space-y-1 w-full max-w-md">
              <p className="font-semibold text-slate-800">Recognition Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                <li>Keep hand centered inside the green dotted guide box</li>
                <li>Hold the sign steady for 4–5 frames to stabilize recognition</li>
                <li>Make sure fingers are distinct and not obstructed by clothing</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Recognized Sign Display Card */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100/80">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                      Recognized Sign
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        result.status === 'STABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {result.status === 'STABLE' ? 'STABLE' : 'STABILIZING'}
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                    {result.sign}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Stability
                  </span>
                  <span className="text-sm font-extrabold text-slate-700 font-mono">
                    {result.stabilityScore}%
                  </span>
                </div>
              </div>

              {/* English Meaning */}
              <div className="mt-3 pt-3 border-t border-indigo-100/80">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  Meaning
                </span>
                <p className="text-base font-semibold text-slate-800 mt-0.5">
                  &ldquo;{result.meaning}&rdquo;
                </p>
              </div>

              {/* Top Candidates & Disambiguation Breakdown (Requirement 10) */}
              {result.topCandidates && result.topCandidates.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-indigo-100/60">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Candidate Probabilities</span>
                    {typeof result.marginDelta === 'number' && (
                      <span className="text-indigo-600 font-mono">
                        Margin: {(result.marginDelta * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {result.topCandidates.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className={`p-1.5 rounded-lg border text-center ${
                          i === 0
                            ? 'bg-indigo-100/70 border-indigo-200 text-indigo-900 font-bold'
                            : 'bg-white/80 border-slate-200/80 text-slate-600'
                        }`}
                      >
                        <div className="text-[10px] text-slate-400">
                          {i === 0 ? 'Top 1' : i === 1 ? 'Top 2' : 'Top 3'}
                        </div>
                        <div className="text-sm font-black">{c.label}</div>
                        <div className="text-[10px] font-mono">{(c.probability * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Verification Conflict State (Requirement 15) */}
              {result.verificationStatus === 'DISAGREED' && (
                <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Verification Conflict</span>
                  </div>
                  <div className="text-[11px] text-slate-700 flex justify-between">
                    <span>Local: <strong>{result.sign}</strong></span>
                    <span>AI Verification: <strong>{result.verificationDetails?.verifiedSign || 'Different'}</strong></span>
                  </div>
                  <div className="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">
                    STATUS: CONFLICT — PLEASE RETRY
                  </div>
                </div>
              )}

              {/* Status Note & Classification Source */}
              <div className="mt-3 pt-2 border-t border-indigo-100/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{result.message}</span>
                </span>

                {result.verificationDetails?.agreement && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified by Gemini</span>
                  </span>
                )}
              </div>
            </div>

            {/* Honesty disclaimer (Requirement 26) */}
            <div className="text-[10px] text-slate-400 text-center italic">
              AI recognition confidence — Prototype — results may vary.
            </div>

            {/* Action Bar for Recognized Sign */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onAddToSentence(result.sign)}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add to Sentence</span>
              </button>

              <button
                onClick={() => onSpeak(result.meaning || result.sign)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Speak gesture meaning aloud"
              >
                <Volume2 className="w-4 h-4 text-indigo-600" />
                <span>Speak</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
