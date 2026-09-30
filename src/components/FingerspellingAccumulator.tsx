import React, { useState, useEffect } from 'react';
import {
  Type,
  Delete,
  CornerDownLeft,
  Volume2,
  Trash2,
  BookOpen,
  Plus,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { SmoothedRecognitionResult } from '../types';
import { letterDebounce, DebounceStatus } from '../services/letterDebounce';

interface FingerspellingAccumulatorProps {
  currentResult: SmoothedRecognitionResult | null;
  onSendWordToSentence: (word: string) => void;
  onSpeak: (text: string) => void;
  onOpenAlphabetGuide: () => void;
}

export const FingerspellingAccumulator: React.FC<FingerspellingAccumulatorProps> = ({
  currentResult,
  onSendWordToSentence,
  onSpeak,
  onOpenAlphabetGuide,
}) => {
  const [letters, setLetters] = useState<string[]>([]);
  const [autoAddLetter, setAutoAddLetter] = useState<boolean>(true);
  const [debounceInfo, setDebounceInfo] = useState<DebounceStatus>({
    shouldAdd: false,
    letter: null,
    state: 'IDLE',
    message: 'Position hand in guide box.',
    heldLetter: null,
  });

  // Current detected letter if single character
  const isCurrentLetter =
    Boolean(currentResult) &&
    Boolean(currentResult?.sign) &&
    currentResult!.sign.length === 1 &&
    currentResult!.sign >= 'A' &&
    currentResult!.sign <= 'Z';

  const detectedLetter = isCurrentLetter ? currentResult!.sign : null;

  // Top candidate pairs sorted descending
  const sortedCandidates = Object.entries(currentResult?.candidateScores || {})
    .filter(([label]) => label !== 'UNKNOWN')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Release Detection & Debounce logic (Requirement 12 & 13)
  useEffect(() => {
    if (!autoAddLetter) return;

    const status = letterDebounce.processFrame(
      detectedLetter,
      currentResult?.isStable ?? false
    );
    setDebounceInfo(status);

    if (status.shouldAdd && status.letter) {
      setLetters((prev) => [...prev, status.letter!]);
    }
  }, [autoAddLetter, currentResult, detectedLetter]);

  const handleManualAdd = () => {
    if (!detectedLetter) return;
    setLetters((prev) => [...prev, detectedLetter]);
    letterDebounce.forceAddCurrent();
  };

  const handleBackspace = () => {
    setLetters((prev) => prev.slice(0, -1));
  };

  const handleAddSpace = () => {
    setLetters((prev) => [...prev, ' ']);
  };

  const handleClear = () => {
    setLetters([]);
    letterDebounce.reset();
  };

  const fullWord = letters.join('');
  const trimmedWord = fullWord.trim();

  const handleSendToSentence = () => {
    if (!trimmedWord) return;
    onSendWordToSentence(trimmedWord);
    setLetters([]);
    letterDebounce.reset();
  };

  const handleSpeakWord = () => {
    if (!trimmedWord) return;
    onSpeak(trimmedWord);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            ASL Alphabet Fingerspelling Mode
          </h2>
        </div>
        <button
          onClick={onOpenAlphabetGuide}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors border border-indigo-200/60 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>A–Z Chart</span>
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Real-Time Detection & Top Candidates Bar (Requirement 12) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-xs">
              {detectedLetter || '—'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  {detectedLetter ? `Letter ${detectedLetter}` : 'No Letter Detected'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    currentResult?.isStable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {currentResult?.isStable ? 'STABLE' : 'SEARCHING'}
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-mono">
                  {currentResult?.finalConfidence ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {debounceInfo.message}
              </p>
            </div>
          </div>

          {/* Top Candidates Probability Breakdown */}
          {sortedCandidates.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Top Candidates
              </span>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                {sortedCandidates.map(([cand, prob]) => (
                  <span
                    key={cand}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                  >
                    <strong>{cand}</strong> {Math.round(prob * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Spelled Word Output Accumulator */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1 text-slate-500 font-medium">
            <span>Spelled Word:</span>
            <span>{letters.length} characters</span>
          </div>

          <div className="min-h-14 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5 font-mono">
            {letters.length === 0 ? (
              <span className="text-xs text-slate-400 font-sans italic">
                Show letters in camera (e.g. H - E - L - L - O) or use [Add Letter] below...
              </span>
            ) : (
              letters.map((char, index) =>
                char === ' ' ? (
                  <span
                    key={index}
                    className="w-3 h-6 border-b-2 border-slate-300 mx-0.5 inline-block"
                  />
                ) : (
                  <span
                    key={index}
                    className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-bold rounded-md shadow-2xs animate-in zoom-in-95 duration-100"
                  >
                    {char}
                  </span>
                )
              )
            )}
          </div>
        </div>

        {/* Action Controls & Release Debounce Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none text-xs">
              <input
                type="checkbox"
                checked={autoAddLetter}
                onChange={(e) => setAutoAddLetter(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="text-[11px] font-medium">
                Auto-add (with release detection)
              </span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualAdd}
              disabled={!detectedLetter}
              className="py-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Letter {detectedLetter ? `(${detectedLetter})` : ''}</span>
            </button>

            <button
              onClick={handleAddSpace}
              className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              title="Add Space"
            >
              ␣ Space
            </button>

            <button
              onClick={handleBackspace}
              disabled={letters.length === 0}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs disabled:opacity-40 transition-colors cursor-pointer"
              title="Backspace"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClear}
              disabled={letters.length === 0}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs disabled:opacity-40 transition-colors cursor-pointer"
              title="Clear"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Word Complete Actions */}
        {trimmedWord.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="text-xs text-slate-700">
              Word: <strong className="text-indigo-600 font-mono text-sm">{trimmedWord}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSpeakWord}
                className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Speak</span>
              </button>

              <button
                onClick={handleSendToSentence}
                className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Push to Sentence</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
