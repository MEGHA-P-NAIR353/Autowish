import React, { useState } from 'react';
import { Sparkles, RefreshCw, Plus } from 'lucide-react';
import { cardAIAPI } from '../../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

const TONES = ['Warm', 'Formal', 'Professional', 'Funny', 'Romantic', 'Cute', 'Emotional'];
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
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export default function AIMessagePanel({ dispatch, state }) {
  const [tone, setTone] = useState('Warm');
  const [language, setLanguage] = useState('en');
  const [length, setLength] = useState('medium');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const generateMsg = async () => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const res = await cardAIAPI.generateMessage({
        recipient_name: state?.recipientName || 'Friend',
        occasion: state?.occasion || 'Birthday',
        tone,
        language,
        custom_context: `Length preference: ${length}. ${notes}`,
      });
      const generatedMsg = res.data.greeting || res.data.message || '';
      setResult(generatedMsg);
      toast.success('Message generated!');
    } catch (err) {
      console.error('[CARD_AI_EDITOR_ERROR]', err?.response?.data || err);
      const errMsg = err?.response?.data?.error || err?.message || 'AI generation failed. Please try again.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const insertToCard = () => {
    if (!result) return;
    dispatch({
      type: 'ADD_ELEMENT',
      element: {
        id: `el_${Date.now()}`,
        type: 'text',
        content: result,
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#ffffff',
        x: 50,
        y: 180,
        width: 400,
        height: 120,
        textAlign: 'center',
      },
    });
    toast.success('Message inserted into card!');
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Recipient Name</p>
        <input
          type="text"
          value={state.recipientName}
          onChange={(e) => dispatch({ type: 'SET_CARD_PROP', key: 'recipientName', value: e.target.value })}
          placeholder="e.g. John Doe"
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-indigo-500 outline-none"
        />
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Tone</p>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-2 border border-slate-700 focus:border-indigo-500 outline-none"
        >
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Language</p>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-2 py-2 border border-slate-700 focus:border-indigo-500 outline-none"
        >
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Length</p>
        <div className="grid grid-cols-3 gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          {['short', 'medium', 'long'].map(l => (
            <button
              key={l}
              onClick={() => setLength(l)}
              className={`py-1 text-[10px] font-bold rounded-md capitalize transition-all ${
                length === l ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Additional context (optional)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. mention our recent trip to Paris..."
          rows={2}
          className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:border-indigo-500 outline-none resize-none"
        />
      </div>

      <button
        onClick={generateMsg}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {result ? 'Regenerate Message' : 'Generate AI Message'}
      </button>

      {result && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">AI Output</p>
          <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl text-xs text-slate-200 leading-relaxed max-h-[120px] overflow-y-auto">
            {result}
          </div>
          <button
            onClick={insertToCard}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all"
          >
            <Plus size={14} /> Insert into Card
          </button>
        </div>
      )}
    </div>
  );
}
