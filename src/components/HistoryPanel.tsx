import React, { useState } from 'react';
import {
  History,
  Trash2,
  Volume2,
  PlusCircle,
  Clock,
  Sparkles,
  Layers,
  Search,
} from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
  onAddToSentence: (sign: string) => void;
  onSpeak: (text: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onDeleteItem,
  onClearHistory,
  onAddToSentence,
  onSpeak,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'sign' | 'sentence'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = history.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      item.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fullSentence && item.fullSentence.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
      {/* Panel Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Translation History</h2>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
            title="Clear all saved history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 space-y-2">
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({history.length})
          </button>
          <button
            onClick={() => setFilterType('sign')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors cursor-pointer ${
              filterType === 'sign'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Signs ({history.filter((h) => h.type === 'sign').length})
          </button>
          <button
            onClick={() => setFilterType('sentence')}
            className={`flex-1 py-1 text-center font-medium rounded-md transition-colors cursor-pointer ${
              filterType === 'sentence'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sentences ({history.filter((h) => h.type === 'sentence').length})
          </button>
        </div>

        {history.length > 4 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-indigo-500"
            />
          </div>
        )}
      </div>

      {/* History Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[460px] scrollbar-thin">
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No history yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
              Recognized signs and generated sentences will be stored locally in this panel.
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all shadow-2xs group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        item.type === 'sentence'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.type === 'sentence' ? 'SENTENCE' : 'SIGN'}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {item.timestamp}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {item.sign}
                  </h4>

                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                    {item.meaning}
                  </p>
                </div>

                {item.thumbnail && (
                  <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 shrink-0">
                    <img
                      src={item.thumbnail}
                      alt="Gesture"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSpeak(item.meaning || item.sign)}
                    className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                    title="Speak text aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onAddToSentence(item.sign)}
                    className="px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-50 rounded font-medium transition-colors cursor-pointer flex items-center gap-1"
                    title="Add this sign to the Sentence Builder"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Use in sentence</span>
                  </button>
                </div>

                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                  title="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
