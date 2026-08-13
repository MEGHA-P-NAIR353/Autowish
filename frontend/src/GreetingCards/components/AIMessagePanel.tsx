import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2, Undo2, Redo2, RotateCcw, Check, AlertTriangle, Edit3 } from 'lucide-react';
import { cardAIAPI } from '../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

const INPUT_CLS =
  'w-full bg-[#111827] text-[#F8FAFC] placeholder-[#94A3B8] text-xs rounded-xl px-3 py-2.5 border border-[#334155] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const LABEL_CLS =
  'text-[10px] text-[#CBD5E1] uppercase tracking-wider font-semibold mb-1.5 block';
const SELECT_CLS =
  `${INPUT_CLS} cursor-pointer appearance-none`;

const TONES = ['Warm', 'Friendly', 'Formal', 'Funny', 'Romantic', 'Inspirational', 'Professional', 'Casual'];

const RELATIONSHIPS = ['Friend', 'Brother', 'Sister', 'Mother', 'Father', 'Teacher', 'Colleague', 'Boss', 'Spouse', 'Partner', 'Customer', 'Client'];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'te', name: 'Telugu' },
  { code: 'kn', name: 'Kannada' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

const AI_MODIFIERS = [
  { label: '✨ Rewrite', val: 'Rewrite' },
  { label: '💖 Emotional', val: 'Emotional' },
  { label: '😂 Funny', val: 'Funny' },
  { label: '🌹 Romantic', val: 'Romantic' },
  { label: '💼 Professional', val: 'Professional' },
  { label: '✂️ Shorten', val: 'Shorten' },
  { label: '📖 Expand', val: 'Expand' },
  { label: '🌍 Translate', val: 'Translate' },
];

const MAX_WORDS = 60;
const MAX_CHARS = 400;
const WARN_WORDS = 50;
const WARN_CHARS = 350;

interface AIMessagePanelProps {
  recipientName: string;
  occasion: string;
  currentMessage: string;
  onUpdateMessage: (msg: string) => void;
  recipientAge?: number;
  interests?: string[];
}

export default function AIMessagePanel({
  recipientName,
  occasion,
  currentMessage,
  onUpdateMessage,
  recipientAge,
  interests = [],
}: AIMessagePanelProps) {
  const [tone, setTone] = useState('Warm');
  const [language, setLanguage] = useState('en');
  const [relationship, setRelationship] = useState('Friend');
  const [age, setAge] = useState(recipientAge?.toString() || '');
  const [interestsText, setInterestsText] = useState(interests?.join(', ') || '');
  const [customContext, setCustomContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeModifier, setActiveModifier] = useState<string | null>(null);

  // Editable message state
  const [editableMessage, setEditableMessage] = useState(currentMessage);
  const [aiVersion, setAiVersion] = useState(currentMessage);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showWarning, setShowWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editableMessage when currentMessage changes externally (e.g., AI generate)
  useEffect(() => {
    if (currentMessage && currentMessage !== editableMessage) {
      setEditableMessage(currentMessage);
      setAiVersion(currentMessage);
      setHistory([currentMessage]);
      setHistoryIndex(0);
    }
  }, [currentMessage]);

  // Word and char count
  const wordCount = editableMessage.trim() ? editableMessage.trim().split(/\s+/).length : 0;
  const charCount = editableMessage.length;
  const isOverWordLimit = wordCount > MAX_WORDS;
  const isOverCharLimit = charCount > MAX_CHARS;
  const isWarnWordLimit = wordCount > WARN_WORDS && wordCount <= MAX_WORDS;
  const isWarnCharLimit = charCount > WARN_CHARS && charCount <= MAX_CHARS;

  const pushHistory = useCallback((newText: string) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      const next = [...sliced, newText].slice(-50);
      return next;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setEditableMessage(history[newIndex]);
      onUpdateMessage(history[newIndex]);
    }
  }, [history, historyIndex, onUpdateMessage]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setEditableMessage(history[newIndex]);
      onUpdateMessage(history[newIndex]);
    }
  }, [history, historyIndex, onUpdateMessage]);

  const handleRestoreAI = useCallback(() => {
    if (aiVersion) {
      setEditableMessage(aiVersion);
      onUpdateMessage(aiVersion);
      pushHistory(aiVersion);
      toast.success('Restored to AI version');
    }
  }, [aiVersion, onUpdateMessage, pushHistory]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditableMessage(val);
    onUpdateMessage(val);
    setShowWarning(val.length > WARN_CHARS || val.split(/\s+/).filter(Boolean).length > WARN_WORDS);
  }, [onUpdateMessage]);

  const callAI = async (modifier?: string) => {
    setLoading(true);
    setActiveModifier(modifier || null);
    const startTime = Date.now();

    let combinedContext = customContext;
    if (modifier && currentMessage) {
      // Modifier only changes the tone — do NOT add rewrite instructions to user prompt.
      // The system prompt handles the tone; the user prompt must only contain the message content.
      combinedContext = customContext ? `${customContext} (Modifier: ${modifier})` : `Modifier: ${modifier}`;
    } else if (modifier) {
      combinedContext = customContext ? `${customContext} (Modifier: ${modifier})` : `Modifier: ${modifier}`;
    }

    const payload = {
      recipient_name: recipientName || 'Friend',
      occasion: occasion || 'Birthday',
      tone: modifier && ['Funny', 'Professional', 'Romantic', 'Emotional', 'Warm', 'Friendly', 'Formal'].includes(modifier) ? modifier : tone,
      language,
      relationship,
      age: age ? parseInt(age, 10) : undefined,
      interests: interestsText ? interestsText.split(',').map(i => i.trim()).filter(Boolean) : [],
      custom_context: combinedContext,
      mode: 'card',
    };

    console.log('[CARD_AI_FRONTEND_REQUEST]', {
      endpoint: '/api/ai/generate/',
      payload,
      timestamp: new Date().toISOString(),
    });

    try {
      const res = await cardAIAPI.generateMessage(payload);
      const duration = Date.now() - startTime;
      console.log('[CARD_AI_FRONTEND_RESPONSE]', {
        status: res.status,
        durationMs: duration,
        data: res.data,
      });

      let generatedMsg = res.data.greeting || res.data.message || '';

      // UI Safety Guard: Ensure text stays within card preview limits (~3-4 sentences / max 65 words)
      // Trim at nearest sentence boundary if AI exceeds expected word count.
      const words = generatedMsg.trim().split(/\s+/);
      if (words.length > 65) {
        const sentences = generatedMsg.match(/[^.!?]+[.!?]+/g) || [];
        if (sentences.length > 0) {
          let trimmed = '';
          for (const sentence of sentences) {
            if ((trimmed + sentence).trim().split(/\s+/).length <= 60) {
              trimmed += sentence;
            } else {
              break;
            }
          }
          if (trimmed.trim()) {
            generatedMsg = trimmed.trim();
          }
        }
      }

      setEditableMessage(generatedMsg);
      setAiVersion(generatedMsg);
      pushHistory(generatedMsg);
      onUpdateMessage(generatedMsg);
      toast.success(modifier ? `Applied: ${modifier}` : '✨ Message generated!', {
        style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' },
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const status = err?.response?.status;
      const backendErr = err?.response?.data;

      console.error('[CARD_AI_FRONTEND_ERROR]', {
        status,
        durationMs: duration,
        error: backendErr || err.message,
      });

      let errMsg = 'AI service failed. Please try again.';
      if (status === 401) {
        errMsg = '401 Unauthorized: Session expired. Please log in again.';
      } else if (status === 403) {
        errMsg = '403 Forbidden: You do not have permission to access AI generation.';
      } else if (status === 429) {
        errMsg = '429 Quota Exceeded: Gemini/OpenRouter rate limit reached. Please wait a moment.';
      } else if (status === 500) {
        errMsg = backendErr?.error ? `500 Server Error: ${backendErr.error}` : '500 Internal Server Error: AI service failed on backend.';
      } else if (backendErr?.error) {
        errMsg = backendErr.details
          ? `${backendErr.error}: ${typeof backendErr.details === 'object' ? JSON.stringify(backendErr.details) : backendErr.details}`
          : backendErr.error;
      } else if (err.message) {
        errMsg = err.message;
      }

      toast.error(errMsg, {
        style: { background: '#1E293B', color: '#F43F5E', border: '1px solid #334155' },
      });
    } finally {
      setLoading(false);
      setActiveModifier(null);
    }
  };

  const handleReset = useCallback(() => {
    setEditableMessage('');
    setAiVersion('');
    setHistory([]);
    setHistoryIndex(-1);
    onUpdateMessage('');
    toast.success('Message cleared');
  }, [onUpdateMessage]);

  return (
    <div className="space-y-4">
      {/* Tone + Language row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ai-tone" className={LABEL_CLS}>Tone</label>
          <select
            id="ai-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className={SELECT_CLS}
          >
            {TONES.map((t) => (
              <option key={t} value={t} className="bg-[#111827] text-[#F8FAFC]">{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-language" className={LABEL_CLS}>Language</label>
          <select
            id="ai-language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={SELECT_CLS}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#111827] text-[#F8FAFC]">{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Relationship */}
      <div>
        <label htmlFor="ai-relationship" className={LABEL_CLS}>Relationship</label>
        <select
          id="ai-relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className={SELECT_CLS}
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r} className="bg-[#111827] text-[#F8FAFC]">{r}</option>
          ))}
        </select>
      </div>

      {/* Age */}
      <div>
        <label htmlFor="ai-age" className={LABEL_CLS}>Age (optional)</label>
        <input
          id="ai-age"
          type="number"
          min="0"
          max="120"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="e.g. 25"
          className={INPUT_CLS}
        />
      </div>

      {/* Interests */}
      <div>
        <label htmlFor="ai-interests" className={LABEL_CLS}>Interests (optional)</label>
        <input
          id="ai-interests"
          type="text"
          value={interestsText}
          onChange={(e) => setInterestsText(e.target.value)}
          placeholder="e.g. Travel, Music, Photography"
          className={INPUT_CLS}
        />
      </div>

      {/* Custom Context */}
      <div>
        <label htmlFor="ai-custom-context" className={LABEL_CLS}>Custom Context (optional)</label>
        <textarea
          id="ai-custom-context"
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          placeholder="e.g. Celebrating 5 years together, loves cricket, turning 30 this year..."
          rows={2}
          className={`${INPUT_CLS} resize-none`}
        />
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={() => callAI()}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      >
        {loading && !activeModifier ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        {loading && !activeModifier ? 'Generating...' : '✨ Generate AI Message'}
      </button>

      {/* Quick modifier buttons */}
      <div>
        <label className={`${LABEL_CLS} mb-2`}>Quick Modifiers</label>
        <div className="grid grid-cols-2 gap-1.5">
          {AI_MODIFIERS.map((mod) => (
            <button
              key={mod.val}
              type="button"
              onClick={() => callAI(mod.val)}
              disabled={loading}
              className={`py-2 px-2.5 rounded-xl border text-[10px] font-semibold text-left flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                activeModifier === mod.val
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-[#111827] border-[#334155] text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#CBD5E1] hover:border-[#475569]'
              }`}
            >
              {loading && activeModifier === mod.val ? (
                <Loader2 size={10} className="animate-spin text-indigo-400 flex-shrink-0" />
              ) : null}
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Output with Editable Text Area */}
      {(editableMessage || loading) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">AI Generated Message</p>
            <div className="flex items-center gap-1.5">
              {/* Undo / Redo / Restore / Reset */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0 || loading}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Undo"
              >
                <Undo2 size={12} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1 || loading}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Redo"
              >
                <Redo2 size={12} />
              </button>
              <button
                type="button"
                onClick={handleRestoreAI}
                disabled={!aiVersion || loading}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Restore AI Version"
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Reset"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <textarea
            ref={textareaRef}
            value={editableMessage}
            onChange={handleTextChange}
            placeholder="AI-generated message will appear here — edit freely..."
            rows={4}
            maxLength={MAX_CHARS}
            className={`${INPUT_CLS} resize-none min-h-[80px] ${editableMessage ? 'border-indigo-500/50' : ''}`}
          />

          {/* Character/Word Count & Warning */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-semibold ${isOverCharLimit ? 'text-rose-400' : isWarnCharLimit ? 'text-amber-400' : 'text-slate-500'}`}>
                {charCount}/{MAX_CHARS} chars
              </span>
              <span className={`text-[10px] font-semibold ${isOverWordLimit ? 'text-rose-400' : isWarnWordLimit ? 'text-amber-400' : 'text-slate-500'}`}>
                {wordCount}/{MAX_WORDS} words
              </span>
            </div>
            {isOverWordLimit || isOverCharLimit ? (
              <span className="text-[10px] text-rose-400 flex items-center gap-1">
                <AlertTriangle size={10} /> Too long — recommended 40–60 words
              </span>
            ) : isWarnWordLimit || isWarnCharLimit ? (
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <AlertTriangle size={10} /> Approaching limit
              </span>
            ) : (
              <span className="text-[10px] text-emerald-400">Good length ✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}