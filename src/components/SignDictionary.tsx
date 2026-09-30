import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Camera,
  CheckCircle2,
  HelpCircle,
  Layers,
  Lightbulb,
} from 'lucide-react';
import { CURATED_SIGNS } from '../data/commonSigns';
import { SignDictionaryEntry } from '../types';

interface SignDictionaryProps {
  onAddToSentence: (sign: string) => void;
  onSelectForCameraPractice: (sign: string) => void;
}

export const SignDictionary: React.FC<SignDictionaryProps> = ({
  onAddToSentence,
  onSelectForCameraPractice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeEntry, setActiveEntry] = useState<SignDictionaryEntry | null>(CURATED_SIGNS[0]);
  const [isQueryingAI, setIsQueryingAI] = useState(false);
  const [customAIResult, setCustomAIResult] = useState<SignDictionaryEntry | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const categories = [
    'All',
    'Greetings',
    'Courtesies',
    'Responses',
    'Essentials',
    'Feelings',
    'People',
  ];

  // Filter curated list
  const filteredSigns = CURATED_SIGNS.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hand_shape.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.movement.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Query Gemini Vision / AI backend for any word
  const handleQueryAI = async (queryWord: string) => {
    if (!queryWord.trim()) return;
    setIsQueryingAI(true);
    setAiError(null);

    try {
      const response = await fetch('/api/explain-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: queryWord.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sign explanation');
      }

      const data: SignDictionaryEntry = await response.json();
      setCustomAIResult(data);
      setActiveEntry(data);
    } catch (err: any) {
      console.error('Sign explain error:', err);
      setAiError('Could not retrieve AI instructional breakdown. Please check network connection.');
    } finally {
      setIsQueryingAI(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Check if exact match exists in curated
      const exact = CURATED_SIGNS.find(
        (s) => s.word.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      if (exact) {
        setActiveEntry(exact);
      } else {
        handleQueryAI(searchTerm.trim());
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Text-to-Sign Instructional Guide
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Type any English word or phrase below to learn how to produce the corresponding sign.
              Explanations emphasize clear hand shape, anatomical placement, and movement trajectories
              without misleading animations.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 sm:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search word (e.g. Hello, Water)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-indigo-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isQueryingAI || !searchTerm.trim()}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isQueryingAI ? 'Explaining...' : 'Explain'}</span>
            </button>
          </form>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-100 text-xs scrollbar-none">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid: Curated List on Left, Detailed Instructional Guide on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Browsable List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col max-h-[600px]">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Available Signs</span>
            <span className="text-slate-400 font-mono">{filteredSigns.length} items</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 scrollbar-thin">
            {filteredSigns.map((item) => {
              const isSelected = activeEntry?.word === item.word;
              return (
                <button
                  key={item.word}
                  onClick={() => {
                    setActiveEntry(item);
                    setCustomAIResult(null);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-indigo-50 border border-indigo-200/80 shadow-2xs'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        isSelected ? 'text-indigo-900' : 'text-slate-800'
                      }`}
                    >
                      {item.word}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {item.hand_shape}
                    </p>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-indigo-600' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}

            {filteredSigns.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                <p className="mb-2">No pre-curated sign matching &ldquo;{searchTerm}&rdquo;</p>
                <button
                  onClick={() => handleQueryAI(searchTerm)}
                  disabled={isQueryingAI || !searchTerm.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Gemini Vision AI to explain &ldquo;{searchTerm}&rdquo;</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Detailed Instructional Guide Card (8 cols) */}
        <div className="lg:col-span-8">
          {activeEntry ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {activeEntry.word}
                    </span>
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">
                      {activeEntry.sign_system || 'ASL'}
                    </span>
                    {activeEntry.category && (
                      <span className="text-xs text-slate-500">· {activeEntry.category}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard sign representation and anatomical execution
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAddToSentence(activeEntry.word)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add to Sentence</span>
                  </button>

                  <button
                    onClick={() => onSelectForCameraPractice(activeEntry.word)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Practice with Camera</span>
                  </button>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="p-6 space-y-5">
                {/* 3 Pillars: Hand Shape, Position, Movement */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      1. Hand Shape
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {activeEntry.hand_shape}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      2. Starting Position
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {activeEntry.position}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      3. Movement & Trajectory
                    </span>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed">
                      {activeEntry.movement}
                    </p>
                  </div>
                </div>

                {/* Step by Step Execution */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Step-by-Step Execution</span>
                  </h3>
                  <div className="space-y-2">
                    {activeEntry.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-white border border-slate-200/80 rounded-lg text-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-slate-800 font-medium leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips & Nuance */}
                {activeEntry.tips && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Signing Tip: </span>
                      <span>{activeEntry.tips}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-xs">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold">Select a sign from the list or search above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
