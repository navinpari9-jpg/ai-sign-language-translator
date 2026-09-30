import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  ChevronRight,
  Hand,
  Sparkles,
} from 'lucide-react';
import { SmoothedRecognitionResult } from '../types';
import { ASL_ALPHABET_LETTERS, ASLAlphabetLetter } from '../ml/aslAlphabetLabels';

interface ASLAlphabetTestQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResult: SmoothedRecognitionResult | null;
  onSwitchToAlphabetMode?: () => void;
}

interface TestTrial {
  targetLetter: ASLAlphabetLetter;
  predictedSign: string;
  confidence: number;
  isCorrect: boolean;
  timestamp: number;
}

export const ASLAlphabetTestQuizModal: React.FC<ASLAlphabetTestQuizModalProps> = ({
  isOpen,
  onClose,
  currentResult,
  onSwitchToAlphabetMode,
}) => {
  const [testLetters, setTestLetters] = useState<ASLAlphabetLetter[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [trials, setTrials] = useState<TestTrial[]>([]);
  const [isTestActive, setIsTestActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [autoCaptureStable, setAutoCaptureStable] = useState<boolean>(true);

  if (!isOpen) return null;

  const currentTarget = testLetters[currentIndex];

  // Start a new 26-letter evaluation session
  const startTest = () => {
    // Shuffle all 26 letters
    const shuffled = [...ASL_ALPHABET_LETTERS].sort(() => Math.random() - 0.5);
    setTestLetters(shuffled);
    setCurrentIndex(0);
    setTrials([]);
    setIsTestActive(true);
    setIsFinished(false);
    if (onSwitchToAlphabetMode) {
      onSwitchToAlphabetMode();
    }
  };

  // Evaluate and record user attempt for current target letter
  const recordAttempt = () => {
    if (!currentTarget) return;

    const predicted = currentResult?.sign || 'UNKNOWN';
    const confidence = currentResult?.finalConfidence || 0;
    const isCorrect = predicted === currentTarget;

    const trial: TestTrial = {
      targetLetter: currentTarget,
      predictedSign: predicted,
      confidence,
      isCorrect,
      timestamp: Date.now(),
    };

    const nextTrials = [...trials, trial];
    setTrials(nextTrials);

    if (currentIndex + 1 < testLetters.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsTestActive(false);
      setIsFinished(true);
    }
  };

  // Auto-record if user forms correct stable sign during test
  useEffect(() => {
    if (!isTestActive || !autoCaptureStable || !currentTarget || !currentResult) return;

    if (currentResult.isStable && currentResult.sign === currentTarget && currentResult.finalConfidence >= 70) {
      const timer = setTimeout(() => {
        recordAttempt();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isTestActive, autoCaptureStable, currentTarget, currentResult]);

  const correctTrials = trials.filter((t) => t.isCorrect).length;
  const accuracy = trials.length > 0 ? Math.round((correctTrials / trials.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🎯
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Interactive ASL Alphabet Test Mode
              </h3>
              <p className="text-xs text-slate-500">
                Evaluates live recognition accuracy across 26 randomized ASL letters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {!isTestActive && !isFinished && (
            <div className="text-center py-8 space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
                <Hand className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Ready to Test Your ASL Alphabet Skills?
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  The system will prompt you with letters A–Z one by one. Position your hand in front of the camera to perform each sign. Accuracy is calculated strictly from live camera predictions.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={startTest}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 26-Letter Test</span>
                </button>
              </div>
            </div>
          )}

          {isTestActive && currentTarget && (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Letter {currentIndex + 1} of {testLetters.length}</span>
                <span>Score: {correctTrials}/{trials.length} correct ({accuracy}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${((currentIndex) / testLetters.length) * 100}%` }}
                />
              </div>

              {/* Target Prompt Box */}
              <div className="bg-gradient-to-b from-indigo-50/60 to-white border-2 border-indigo-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
                <span className="text-xs uppercase font-bold text-indigo-700 tracking-wider">
                  Please show the letter
                </span>
                <div className="text-6xl font-black text-indigo-600 tracking-tight">
                  {currentTarget}
                </div>
                <p className="text-xs text-slate-500">
                  Form the sign in the camera guide box and hold it steady
                </p>
              </div>

              {/* Live Camera Feedback */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                    Current Camera Detection:
                  </span>
                  <div className="text-base font-bold text-slate-800 flex items-center gap-2 mt-0.5">
                    <span>{currentResult?.sign || 'WAITING'}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        currentResult?.sign === currentTarget
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {currentResult?.finalConfidence || 0}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={recordAttempt}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Confirm / Skip</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Score Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  Test Complete!
                </h4>
                <div className="text-3xl font-black text-indigo-600">
                  {accuracy}% Accuracy
                </div>
                <p className="text-xs text-slate-500">
                  You correctly signed {correctTrials} out of {trials.length} ASL letters based on live sensor tracking.
                </p>
              </div>

              {/* Trials Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <div className="divide-y divide-slate-100 text-xs">
                  {trials.map((t, idx) => (
                    <div key={idx} className="p-2.5 px-4 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        {t.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span className="font-bold text-slate-800">
                          Target: {t.targetLetter}
                        </span>
                      </div>

                      <div className="text-right text-[11px] font-mono">
                        <span>Predicted: </span>
                        <strong className={t.isCorrect ? 'text-emerald-700' : 'text-rose-600'}>
                          {t.predictedSign}
                        </strong>
                        <span className="text-slate-400 ml-2">({t.confidence}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={startTest}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake Test</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
