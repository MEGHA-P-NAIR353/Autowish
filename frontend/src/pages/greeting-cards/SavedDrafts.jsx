import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Archive, Edit2, Trash2 } from 'lucide-react';
import { cardsAPI } from '../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

export default function SavedDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [imgErrors, setImgErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await cardsAPI.getDrafts();
      setDrafts(res.data.results || res.data);
    } catch {
      toast.error('Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await cardsAPI.delete(id);
      toast.success('Draft deleted');
      setDrafts(drafts.filter(d => d.id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = drafts.filter(d => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-inset min-h-screen text-slate-100 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
          Saved Drafts
        </h1>
        <p className="text-xs text-slate-400">Cards currently in progress that have not been published</p>
      </div>

      {/* Filter and search */}
      <div className="flex gap-4 items-center bg-inset p-3 rounded-2xl border border-line-soft">
        <div className="flex items-center gap-2 bg-surface border border-line/50 rounded-xl px-3 py-1.5 flex-1 max-w-sm">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search drafts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs text-fg outline-none w-full"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-inset rounded-2xl h-64 border border-line-soft animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-line-soft rounded-3xl bg-inset/40">
          <Archive size={48} className="mb-4 text-slate-600" />
          <h3 className="text-fg font-semibold mb-1 text-sm">No Drafts Found</h3>
          <p className="text-xs max-w-xs text-center">Use templates or start a blank canvas to draft greeting creations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((card) => (
            <motion.div
              key={card.id}
              layout
              className="bg-inset rounded-2xl border border-line-soft overflow-hidden flex flex-col group hover:border-line transition-all"
            >
              {/* Preview */}
              <div className="relative aspect-square bg-surface/50 flex items-center justify-center border-b border-line-soft overflow-hidden">
                {card.preview_image_url && !imgErrors[card.id] ? (
                  <img
                    src={card.preview_image_url}
                    alt={card.title}
                    onError={() => setImgErrors(prev => ({ ...prev, [card.id]: true }))}
                    className="w-full h-full object-contain p-1.5 transition-all duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-3xl mb-1">📝</span>
                    <span className="text-[11px] text-slate-400 font-medium truncate max-w-[140px]">{card.title}</span>
                    <span className="text-[9px] text-slate-500 capitalize">{card.occasion}</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-fg font-semibold text-xs truncate mb-1">{card.title}</h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="bg-raised/80 px-2 py-0.5 rounded-full border border-line/30">{card.occasion}</span>
                    <span>{card.recipient_name ? `For: ${card.recipient_name}` : ''}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-line-soft/60">
                  <button
                    onClick={() => navigate(`/greeting-cards/edit/${card.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all border border-indigo-500/20"
                  >
                    <Edit2 size={12} />
                    Edit Draft
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-2 rounded-xl bg-surface hover:bg-raised text-slate-400 hover:text-rose-400 transition-all border border-line-soft"
                    title="Delete Draft"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
