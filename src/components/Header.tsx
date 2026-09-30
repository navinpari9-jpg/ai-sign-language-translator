import React from 'react';
import { Camera, BookOpen, History, Info, Volume2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'translator' | 'dictionary' | 'history' | 'about';
  setActiveTab: (tab: 'translator' | 'dictionary' | 'history' | 'about') => void;
  cameraActive: boolean;
  historyCount: number;
  onOpenBenchmark?: () => void;
  onOpenAlphabetGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cameraActive,
  historyCount,
  onOpenBenchmark,
  onOpenAlphabetGuide,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              🤟
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                AI Sign Language Translator
              </span>
              <span className="text-xs text-slate-500 hidden sm:block">
                Real-Time Local Vision & Gemini Verification
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links / Segmented Tabs */}
          <nav className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab('translator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'translator'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Translator</span>
            </button>
            <button
              onClick={() => setActiveTab('dictionary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'dictionary'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sign Dictionary</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-200 text-slate-700 rounded-full font-mono">
                  {historyCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Guide & Limitations</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action / Camera Status Indicator */}
          <div className="flex items-center gap-2">
            {onOpenAlphabetGuide && (
              <button
                onClick={onOpenAlphabetGuide}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/70 rounded-lg transition-colors cursor-pointer"
                title="Open ASL Fingerspelling A-Z Reference"
              >
                <span>A–Z Chart</span>
              </button>
            )}
            {onOpenBenchmark && (
              <button
                onClick={onOpenBenchmark}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors cursor-pointer"
                title="Run empirical benchmark accuracy test"
              >
                <span>Accuracy Benchmark</span>
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
                aria-hidden="true"
              />
              <span className="hidden md:inline font-medium">
                {cameraActive ? 'Camera Live' : 'Camera Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
