import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { RecognitionPanel } from './components/RecognitionPanel';
import { SentenceBuilder } from './components/SentenceBuilder';
import { HistoryPanel } from './components/HistoryPanel';
import { TextToSpeechBar } from './components/TextToSpeechBar';
import { SignDictionary } from './components/SignDictionary';
import { AboutLimitations } from './components/AboutLimitations';
import { TestBenchmarkModal } from './components/TestBenchmarkModal';
import { ASLAlphabetChartModal } from './components/ASLAlphabetChartModal';
import { FingerspellingAccumulator } from './components/FingerspellingAccumulator';
import {
  SmoothedRecognitionResult,
  HistoryItem,
  CameraState,
  RecognitionMode,
} from './types';
import { AlertCircle, CheckCircle2, Sparkles, Volume2 } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { speechService } from './services/speechService';

const STORAGE_KEY = 'ai_sign_translator_history_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'translator' | 'dictionary' | 'history' | 'about'>('translator');

  // Camera State
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isRequesting: false,
    hasPermission: null,
    errorMessage: null,
    deviceId: null,
  });

  // Real-Time Recognition & Mode State
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('HYBRID');
  const [currentResult, setCurrentResult] = useState<SmoothedRecognitionResult | null>(null);
  const [isVerifyingWithGemini, setIsVerifyingWithGemini] = useState<boolean>(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);
  const [isAlphabetGuideOpen, setIsAlphabetGuideOpen] = useState<boolean>(false);

  // Sentence Builder State
  const [sentenceTokens, setSentenceTokens] = useState<string[]>([]);
  const [translatedSentence, setTranslatedSentence] = useState<string>('');

  // Speech State
  const [currentSpeechText, setCurrentSpeechText] = useState<string>('');

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Track last automatically logged history sign to prevent duplicates
  const lastHistorySignRef = useRef<string | null>(null);
  const lastHistoryTimeRef = useRef<number>(0);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Translation History from localStorage
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history from localStorage:', e);
    }
    return [
      {
        id: 'initial-1',
        sign: 'HELLO',
        meaning: 'A greeting or acknowledgment',
        confidence: 'HIGH',
        confidenceScore: 88,
        timestamp: '10:00 AM',
        type: 'sign',
      },
      {
        id: 'initial-2',
        sign: 'THANK YOU',
        meaning: 'Expression of gratitude',
        confidence: 'HIGH',
        confidenceScore: 85,
        timestamp: '10:02 AM',
        type: 'sign',
      },
    ];
  });

  // Persist history changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }, [history]);

  // Global Speech synthesis trigger using SpeechService
  const handleSpeak = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    setCurrentSpeechText(text.trim());
    speechService.speak(text.trim());
  }, []);

  // Handle Real-Time Result Update from Camera Pipeline
  const handleResultChange = useCallback((result: SmoothedRecognitionResult) => {
    setCurrentResult(result);

    // Auto-record to history only when a stable, recognized sign is held
    if (result.isStable && result.sign !== 'UNKNOWN' && result.sign !== 'NO_HAND') {
      const now = Date.now();
      const COOLDOWN_MS = 6000; // 6s between automatic duplicate history entries

      if (
        result.sign !== lastHistorySignRef.current ||
        now - lastHistoryTimeRef.current > COOLDOWN_MS
      ) {
        lastHistorySignRef.current = result.sign;
        lastHistoryTimeRef.current = now;

        const newItem: HistoryItem = {
          id: now.toString(),
          sign: result.sign,
          meaning: result.meaning || 'Recognized sign',
          confidence: result.confidenceLevel,
          confidenceScore: result.finalConfidence,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'sign',
        };

        setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
      }
    }
  }, []);

  // Handle Secondary Gemini Verification Request
  const handleRequestVerification = useCallback(
    async (result: SmoothedRecognitionResult, frameDataUrl: string) => {
      setIsVerifyingWithGemini(true);
      try {
        const verifyData = await geminiService.verifyCandidate(frameDataUrl, result.sign);
        if (verifyData) {
          setCurrentResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              verificationStatus: verifyData.agreement ? 'VERIFIED' : 'DISAGREED',
              verificationDetails: {
                verifiedSign: verifyData.recognized_sign,
                geminiConfidence: verifyData.confidence,
                agreement: verifyData.agreement,
                explanation: verifyData.explanation,
              },
            };
          });

          if (verifyData.agreement) {
            showToast(`Gemini verified: "${result.sign}"`, 'success');
          } else if (verifyData.recognized_sign) {
            showToast(`Gemini suggests: "${verifyData.recognized_sign}"`, 'info');
          }
        }
      } catch (err) {
        console.warn('Secondary verification warning:', err);
      } finally {
        setIsVerifyingWithGemini(false);
      }
    },
    [showToast]
  );

  // Add token to sentence
  const handleAddToSentence = (sign: string) => {
    if (!sign || sign === 'UNKNOWN' || sign === 'NO_HAND') return;
    const clean = sign.toUpperCase();
    setSentenceTokens((prev) => [...prev, clean]);
    setTranslatedSentence('');
    showToast(`Added "${clean}" to sentence`, 'success');
  };

  // Save full sentence to history
  const handleSaveSentenceToHistory = (rawSentence: string, translated: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      sign: rawSentence,
      meaning: translated,
      fullSentence: translated,
      confidence: 'HIGH',
      confidenceScore: 92,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sentence',
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
    showToast('Sentence saved to history!', 'success');
  };

  // Delete history item
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your translation history?')) {
      setHistory([]);
      showToast('Translation history cleared', 'info');
    }
  };

  // Practice in camera from dictionary
  const handleSelectForCameraPractice = (sign: string) => {
    setActiveTab('translator');
    showToast(`Practice mode: Form the sign for "${sign}" in front of camera`, 'info');
  };

  // Practice letter in camera from ASL alphabet chart
  const handleSelectLetterFromChart = (letter: string) => {
    setRecognitionMode('ALPHABET');
    setActiveTab('translator');
    showToast(`Fingerspelling Mode active: Practice ASL letter "${letter}" in camera`, 'info');
  };

  // Active Utterance for bottom speech synthesizer bar
  const activeUtteranceText =
    currentSpeechText ||
    translatedSentence ||
    (sentenceTokens.length > 0 ? sentenceTokens.join(' ') : currentResult?.meaning || '');

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cameraActive={cameraState.isActive}
        historyCount={history.length}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenAlphabetGuide={() => setIsAlphabetGuideOpen(true)}
      />

      {/* Accuracy Evaluation Benchmark Modal */}
      <TestBenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      {/* ASL Alphabet Reference Guide Modal */}
      <ASLAlphabetChartModal
        isOpen={isAlphabetGuideOpen}
        onClose={() => setIsAlphabetGuideOpen(false)}
        onSelectLetter={handleSelectLetterFromChart}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 transition-all transform ease-out duration-200"
        >
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-900 text-white border-rose-700'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Live Low-Latency Translator Dashboard */}
        {activeTab === 'translator' && (
          <div className="space-y-6">
            {/* 3-Column Layout: Left (Camera), Center (Recognition + Speller + Sentence), Right (History) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: Live Real-Time Camera & Tracking (5 cols) */}
              <div className="lg:col-span-5">
                <CameraView
                  cameraState={cameraState}
                  setCameraState={setCameraState}
                  onResultChange={handleResultChange}
                  onRequestVerification={handleRequestVerification}
                  onOpenBenchmark={() => setIsBenchmarkOpen(true)}
                  recognitionMode={recognitionMode}
                  setRecognitionMode={setRecognitionMode}
                  onOpenAlphabetGuide={() => setIsAlphabetGuideOpen(true)}
                />
              </div>

              {/* CENTER: Fast Recognition + Fingerspelling Speller + Sentence Builder (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                <RecognitionPanel
                  result={currentResult}
                  onAddToSentence={handleAddToSentence}
                  onSpeak={handleSpeak}
                  isVerifyingWithGemini={isVerifyingWithGemini}
                />

                {/* Dedicated Fingerspelling Word Speller & Accumulator */}
                <FingerspellingAccumulator
                  currentResult={currentResult}
                  onSendWordToSentence={handleAddToSentence}
                  onSpeak={handleSpeak}
                  onOpenAlphabetGuide={() => setIsAlphabetGuideOpen(true)}
                />

                <SentenceBuilder
                  sentenceTokens={sentenceTokens}
                  setSentenceTokens={setSentenceTokens}
                  translatedSentence={translatedSentence}
                  setTranslatedSentence={setTranslatedSentence}
                  onSpeak={handleSpeak}
                  onSaveToHistory={handleSaveSentenceToHistory}
                  currentRecognizedSign={
                    currentResult?.sign && currentResult.sign !== 'UNKNOWN' && currentResult.sign !== 'NO_HAND'
                      ? currentResult.sign
                      : undefined
                  }
                  isStableSign={currentResult?.isStable}
                />
              </div>

              {/* RIGHT: Translation History (3 cols) */}
              <div className="lg:col-span-3">
                <HistoryPanel
                  history={history}
                  onDeleteItem={handleDeleteHistoryItem}
                  onClearHistory={handleClearHistory}
                  onAddToSentence={handleAddToSentence}
                  onSpeak={handleSpeak}
                />
              </div>
            </div>

            {/* BOTTOM: Text-to-Speech Dashboard Bar */}
            <TextToSpeechBar
              currentText={activeUtteranceText}
              onTextChange={setCurrentSpeechText}
            />
          </div>
        )}

        {/* Tab 2: Text Input to Sign Meaning (Dictionary) */}
        {activeTab === 'dictionary' && (
          <SignDictionary
            onAddToSentence={handleAddToSentence}
            onSelectForCameraPractice={handleSelectForCameraPractice}
          />
        )}

        {/* Tab 3: Dedicated Translation History View */}
        {activeTab === 'history' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <HistoryPanel
              history={history}
              onDeleteItem={handleDeleteHistoryItem}
              onClearHistory={handleClearHistory}
              onAddToSentence={(sign) => {
                handleAddToSentence(sign);
                setActiveTab('translator');
              }}
              onSpeak={handleSpeak}
            />
          </div>
        )}

        {/* Tab 4: Guide, Architecture, Best Practices & Limitations */}
        {activeTab === 'about' && <AboutLimitations />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">AI Sign Language Translator</span>
            <span>·</span>
            <span>Supported Language: ASL (American Sign Language)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>MediaPipe Tasks Vision</span>
            <span>·</span>
            <span>Temporal Smoothing Engine</span>
            <span>·</span>
            <span>Gemini Vision Verification</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
