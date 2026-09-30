import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Trash2,
  Volume2,
  ArrowRight,
  Plus,
  BookOpen,
  Check,
  Languages,
} from 'lucide-react';

interface SentenceBuilderProps {
  sentenceTokens: string[];
  setSentenceTokens: React.Dispatch<React.SetStateAction<string[]>>;
  translatedSentence: string;
  setTranslatedSentence: React.Dispatch<React.SetStateAction<string>>;
  onSpeak: (text: string) => void;
  onSaveToHistory: (sentence: string, translated: string) => void;
  currentRecognizedSign?: string;
  isStableSign?: boolean;
}

export const SentenceBuilder: React.FC<SentenceBuilderProps> = ({
  sentenceTokens,
  setSentenceTokens,
  translatedSentence,
  setTranslatedSentence,
  onSpeak,
  onSaveToHistory,
  currentRecognizedSign,
  isStableSign = false,
}) => {
  const [manualInput, setManualInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [grammarNotes, setGrammarNotes] = useState<string | null>(null);
  const [autoAppend, setAutoAppend] = useState(false);

  // Auto-append tracking with debounce & cooldown (Req 13)
  const lastAddedSignRef = React.useRef<string | null>(null);
  const lastAddedTimeRef = React.useRef<number>(0);

  // Add token
  const addToken = React.useCallback((sign: string) => {
    if (!sign.trim()) return;
    const clean = sign.trim().toUpperCase();
    setSentenceTokens((prev) => [...prev, clean]);
    setTranslatedSentence('');
    setGrammarNotes(null);
  }, [setSentenceTokens, setTranslatedSentence]);

  // Effect to handle auto-append when sign is stable, respecting cooldown
  React.useEffect(() => {
    if (!autoAppend || !isStableSign || !currentRecognizedSign) return;
    const sign = currentRecognizedSign.toUpperCase();
    if (sign === 'UNKNOWN' || sign === 'NO_HAND') return;

    const now = Date.now();
    const COOLDOWN_MS = 2500; // 2.5 second cooldown between identical tokens

    if (sign === lastAddedSignRef.current && now - lastAddedTimeRef.current < COOLDOWN_MS) {
      return;
    }

    lastAddedSignRef.current = sign;
    lastAddedTimeRef.current = now;
    addToken(sign);
  }, [autoAppend, isStableSign, currentRecognizedSign, addToken]);

  // Undo last token
  const handleUndo = () => {
    setSentenceTokens((prev) => prev.slice(0, -1));
    setTranslatedSentence('');
    setGrammarNotes(null);
  };

  // Clear sentence
  const handleClear = () => {
    setSentenceTokens([]);
    setTranslatedSentence('');
    setGrammarNotes(null);
  };

  // Remove specific token by index
  const removeToken = (index: number) => {
    setSentenceTokens((prev) => prev.filter((_, i) => i !== index));
    setTranslatedSentence('');
    setGrammarNotes(null);
  };

  // Translate Sentence using Gemini AI
  const handleTranslateSentence = async () => {
    if (sentenceTokens.length === 0) return;
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signs: sentenceTokens }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate sentence');
      }

      const data = await response.json();
      setTranslatedSentence(data.translated_sentence || sentenceTokens.join(' '));
      if (data.grammar_notes) {
        setGrammarNotes(data.grammar_notes);
      }
    } catch (err) {
      console.error('Translation error:', err);
      // Fallback: capitalize sentence
      const raw = sentenceTokens.join(' ');
      setTranslatedSentence(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() + '.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle manual input submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      addToken(manualInput);
      setManualInput('');
    }
  };

  const currentDisplaySentence =
    translatedSentence ||
    (sentenceTokens.length > 0 ? sentenceTokens.join(' ') : 'No signs added yet.');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Card Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Sentence Builder</h2>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {sentenceTokens.length} {sentenceTokens.length === 1 ? 'sign' : 'signs'}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Token Flow Display */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span>Sign Sequence Flow:</span>
            {sentenceTokens.length > 0 && (
              <span className="text-[11px] text-slate-400">Click a sign to remove</span>
            )}
          </div>

          <div className="min-h-14 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-2">
            {sentenceTokens.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                Add recognized signs or type below to construct a sentence...
              </span>
            ) : (
              sentenceTokens.map((token, index) => (
                <React.Fragment key={`${token}-${index}`}>
                  <button
                    onClick={() => removeToken(index)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 rounded-lg text-xs font-semibold text-slate-800 hover:text-rose-700 transition-colors shadow-2xs group cursor-pointer"
                    title="Click to remove this sign"
                  >
                    <span>{token}</span>
                    <span className="text-slate-400 group-hover:text-rose-500 text-[10px]">×</span>
                  </button>
                  {index < sentenceTokens.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Generated Sentence Result */}
        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              {translatedSentence ? 'Translated English' : 'Constructed Sequence'}
            </span>
            {translatedSentence && (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-medium">
                Grammar Polished
              </span>
            )}
          </div>

          <p
            className={`text-lg font-medium leading-relaxed ${
              sentenceTokens.length > 0 ? 'text-slate-900' : 'text-slate-400 italic'
            }`}
          >
            &ldquo;{currentDisplaySentence}&rdquo;
          </p>

          {grammarNotes && (
            <p className="mt-2 text-xs text-slate-600 bg-white/60 p-2 rounded border border-indigo-100/60">
              <span className="font-semibold text-slate-700">Grammar note:</span> {grammarNotes}
            </p>
          )}
        </div>

        {/* Toolbar Buttons: Add Sign, Undo, Clear, Translate, Speak */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {currentRecognizedSign && (
            <button
              onClick={() => addToken(currentRecognizedSign)}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add &ldquo;{currentRecognizedSign}&rdquo;</span>
            </button>
          )}

          <button
            onClick={handleTranslateSentence}
            disabled={sentenceTokens.length === 0 || isTranslating}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTranslating ? 'Translating...' : 'Translate Sentence'}</span>
          </button>

          <button
            onClick={() => onSpeak(translatedSentence || sentenceTokens.join(' '))}
            disabled={sentenceTokens.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Speak</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={sentenceTokens.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Undo last added sign"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={handleClear}
            disabled={sentenceTokens.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
            title="Clear all tokens in sentence"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {sentenceTokens.length > 0 && (
            <button
              onClick={() => onSaveToHistory(sentenceTokens.join(' '), currentDisplaySentence)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ml-auto"
              title="Save this sentence to history"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Save to History</span>
            </button>
          )}

          <label className="flex items-center gap-1.5 text-xs text-indigo-800 font-medium bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200/80 cursor-pointer ml-auto select-none">
            <input
              type="checkbox"
              checked={autoAppend}
              onChange={(e) => setAutoAppend(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Auto-Append Stable Signs</span>
          </label>
        </div>

        {/* Quick Add Custom Sign Input */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            placeholder="Type a sign or word to add (e.g. HOW, YOU, FRIEND)..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};
