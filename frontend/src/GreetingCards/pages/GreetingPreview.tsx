import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cardsAPI } from '../../services/greetingCardsAPI';
import LivePreview from '../components/LivePreview';
import { GreetingCardData } from '../types';
import { ChevronLeft, Calendar, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GreetingPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState<GreetingCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      cardsAPI.get(id)
        .then((res) => {
          setCard(res.data);
        })
        .catch(() => {
          toast.error('Failed to load greeting card detail');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0F19]">
        <div className="animate-pulse space-y-4">
          <div className="w-40 h-40 bg-slate-800 rounded-2xl" />
          <div className="h-4 w-28 bg-slate-800 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] text-slate-400">
        <p className="mb-4">Greeting card not found.</p>
        <button
          onClick={() => navigate('/greeting-cards')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0B0F19] min-h-screen text-slate-100 space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-850">
        <button
          onClick={() => navigate('/greeting-cards')}
          className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-white transition-colors"
        >
          <ChevronLeft size={14} />
          Back to Cards
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => toast.success('Share link copied to clipboard!')}
            className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-350 hover:text-white transition-all"
            title="Share card link"
          >
            <Share2 size={13} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center py-6">
        {/* Card Mockup */}
        <div className="flex justify-center">
          <LivePreview cardData={card} />
        </div>

        {/* Metadata Details */}
        <div className="space-y-6 bg-[#131926]/40 p-6 rounded-2xl border border-slate-800/80">
          <div>
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-extrabold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/15">
              {card.occasion}
            </span>
            <h2 className="text-xl font-bold text-white mt-3">{card.title}</h2>
            {card.recipient_name && (
              <p className="text-xs text-slate-400 mt-1">For recipient: {card.recipient_name}</p>
            )}
          </div>

          <div className="border-t border-slate-850 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Calendar size={14} className="text-slate-500" />
              <span>Status: <strong className="text-indigo-400 capitalize">{card.status}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
