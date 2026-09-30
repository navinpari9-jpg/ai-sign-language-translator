import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  Info,
  CheckCircle2,
  Activity,
  ArrowRight,
  Hand,
} from 'lucide-react';
import {
  ASL_ALPHABET_DEFINITIONS,
  ASL_ALPHABET_LETTERS,
  ASLAlphabetLetter,
} from '../ml/aslAlphabetLabels';

interface ASLAlphabetChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLetter?: (letter: string) => void;
}

export const ASLAlphabetChartModal: React.FC<ASLAlphabetChartModalProps> = ({
  isOpen,
  onClose,
  onSelectLetter,
}) => {
  const [selectedLetter, setSelectedLetter] = useState<ASLAlphabetLetter>('A');

  if (!isOpen) return null;

  const currentDef = ASL_ALPHABET_DEFINITIONS[selectedLetter];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              A-Z
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ASL Alphabet Fingerspelling Guide (A–Z)
              </h3>
              <p className="text-xs text-slate-500">
                American Sign Language 26-Letter reference with 3D joint configurations & motion trajectories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: 26-Letter Grid (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select a Letter to View Details
              </span>
              <span className="text-xs text-indigo-600 font-medium">
                24 Static · 2 Dynamic (J, Z)
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
              {ASL_ALPHABET_LETTERS.map((letter) => {
                const def = ASL_ALPHABET_DEFINITIONS[letter];
                const isSelected = selectedLetter === letter;
                const isDynamic = def.type === 'DYNAMIC';

                return (
                  <button
                    key={letter}
                    onClick={() => setSelectedLetter(letter)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl border text-base font-black transition-all transform active:scale-95 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <span>{letter}</span>
                    {isDynamic && (
                      <span
                        className={`text-[9px] font-bold px-1 rounded-full uppercase tracking-tighter ${
                          isSelected ? 'bg-indigo-800 text-indigo-200' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        Motion
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Tips for Accurate Fingerspelling in Camera:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] leading-relaxed">
                <li>Keep your hand within the center guide box at chest/shoulder height.</li>
                <li>Hold static letters steady for ~300ms for stable confidence confirmation.</li>
                <li>For <strong>J</strong>, trace a downward hook with your pinky tip.</li>
                <li>For <strong>Z</strong>, trace a zig-zag in the air with your index finger.</li>
              </ul>
            </div>
          </div>

          {/* Right: Selected Letter Inspector (5 cols) */}
          <div className="md:col-span-5 bg-gradient-to-b from-indigo-50/40 to-slate-50/80 rounded-2xl border border-indigo-100 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl font-black text-indigo-600 tracking-tight">
                    Letter {selectedLetter}
                  </div>
                  <span
                    className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      currentDef.type === 'DYNAMIC'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {currentDef.type === 'DYNAMIC' ? 'Dynamic Motion Gesture' : 'Static Handshape'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Min Confidence
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {Math.round(currentDef.minimumConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  How to Form:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-slate-200/80">
                  {currentDef.description}
                </p>
              </div>

              {/* Finger States Breakdown */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Finger Configurations:
                </span>
                <div className="grid grid-cols-5 gap-1 text-center">
                  {(['thumb', 'index', 'middle', 'ring', 'pinky'] as const).map((finger) => {
                    const state = currentDef.expectedFingerStates[finger];
                    const stateColor =
                      state === 'OPEN'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : state === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200';
                    return (
                      <div key={finger} className="p-1.5 rounded-lg bg-white border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 capitalize block truncate">
                          {finger}
                        </span>
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded-sm block mt-0.5 ${stateColor}`}>
                          {state}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pro Tips */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Clarity Note:
                </span>
                <p className="text-[11px] text-indigo-950/80 italic bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100/70">
                  "{currentDef.tips}"
                </p>
              </div>
            </div>

            {/* Practice Action */}
            {onSelectLetter && (
              <button
                onClick={() => {
                  onSelectLetter(selectedLetter);
                  onClose();
                }}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Hand className="w-4 h-4" />
                <span>Practice Letter "{selectedLetter}" in Camera</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
