import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Pause,
  Sliders,
  Settings2,
  Radio,
} from 'lucide-react';

interface TextToSpeechBarProps {
  currentText: string;
  onTextChange?: (text: string) => void;
}

export const TextToSpeechBar: React.FC<TextToSpeechBarProps> = ({
  currentText,
  onTextChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Initialize SpeechSynthesis and voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (available.length > 0 && !selectedVoiceURI) {
        // Prefer natural / English voice
        const defaultVoice =
          available.find((v) => v.lang.startsWith('en') && v.name.includes('Natural')) ||
          available.find((v) => v.lang.startsWith('en')) ||
          available[0];
        if (defaultVoice) {
          setSelectedVoiceURI(defaultVoice.voiceURI);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoiceURI]);

  // Handle Play
  const handlePlay = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = currentText.trim() || 'No sentence or sign text to speak.';
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoiceURI && voices.length > 0) {
      const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Handle Pause
  const handlePause = () => {
    if ('speechSynthesis' in window && isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  // Handle Stop
  const handleStop = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800 flex items-center gap-2">
        <VolumeX className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Web Speech API is not supported in this browser.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Status & Current Utterance */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Text-to-Speech Synthesizer
            </h3>
            {isPlaying && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Speaking...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 truncate font-mono bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200/70">
            {currentText ? `"${currentText}"` : 'No text selected (Translate or select a sign to vocalize)'}
          </p>
        </div>

        {/* Center / Right: Audio Action Controls & Rate Presets */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Play Button */}
          <button
            onClick={handlePlay}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
              isPlaying
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? 'Resume' : 'Play Speech'}</span>
          </button>

          {/* Pause Button */}
          {isPlaying && (
            <button
              onClick={handlePause}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Square className="w-3.5 h-3.5 fill-current text-slate-500" />
            <span>Stop</span>
          </button>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[10px] text-slate-400 px-1 font-semibold">Speed:</span>
            {[0.75, 1.0, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                onClick={() => setRate(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  rate === speed
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Voice/Pitch Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              showSettings
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Speech settings (voices, pitch)"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Voice & Pitch Config Drawer */}
      {showSettings && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Speech Voice ({voices.length} detected)
            </label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-indigo-500"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-medium">Pitch: {pitch.toFixed(1)}</label>
              <button
                onClick={() => {
                  setPitch(1.0);
                  setRate(1.0);
                }}
                className="text-[10px] text-indigo-600 hover:underline"
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
      )}
    </div>
  );
};
