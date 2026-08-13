import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Heart, Edit2, Copy, Trash2, Calendar } from 'lucide-react';
import { cardsAPI } from '../../services/greetingCardsAPI';
import toast from 'react-hot-toast';

export default function MyGreetingCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await cardsAPI.getMyCards({ status: 'published' });
      setCards(res.data.results || res.data);
    } catch {
      toast.error('Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async (id) => {
    try {
      const res = await cardsAPI.favorite(id);
      setCards(cards.map(c => c.id === id ? { ...c, is_favorite: res.data.is_favorite } : c));
      toast.success(res.data.is_favorite ? 'Added to Favorites' : 'Removed from Favorites');
    } catch {
      toast.error('Favorite action failed');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await cardsAPI.duplicate(id);
      toast.success('Card duplicated successfully');
      fetchCards();
    } catch {
      toast.error('Duplicate failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this card?')) return;
    try {
      await cardsAPI.delete(id);
      toast.success('Card deleted');
      setCards(cards.filter(c => c.id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = cards.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-[#0B0F19] min-h-screen text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            My Greeting Cards
          </h1>
          <p className="text-xs text-slate-400">View and manage your created templates and custom cards</p>
        </div>
        <button
          onClick={() => navigate('/greeting-cards/create')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus size={16} />
          Create New Card
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex gap-4 items-center bg-[#131926] p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 bg-[#1A2234] border border-slate-700/50 rounded-xl px-3 py-1.5 flex-1 max-w-sm">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search cards by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none text-xs text-white outline-none w-full"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#131926] rounded-2xl h-64 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-3xl bg-[#131926]/40">
          <Calendar size={48} className="mb-4 text-slate-600" />
          <h3 className="text-white font-semibold mb-1 text-sm">No Cards Found</h3>
          <p className="text-xs max-w-xs text-center">Start designing by template or creating a custom event card from scratch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131926] rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col group"
            >
              {/* Preview image */}
              <div className="relative aspect-square bg-[#0e121b] flex items-center justify-center overflow-hidden border-b border-slate-800">
                {card.preview_image_url ? (
                  <img src={card.preview_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                ) : (
                  <div className="text-slate-600 text-xs">No Preview</div>
                )}
                {/* Favorite badge */}
                <button
                  onClick={() => handleFavorite(card.id)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-slate-200 hover:text-rose-500 transition-all"
                >
                  <Heart size={14} className={card.is_favorite ? 'fill-rose-500 text-rose-500' : ''} />
                </button>
              </div>

              {/* Card Meta */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-white font-semibold text-xs truncate mb-1">{card.title}</h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/30">{card.occasion}</span>
                    <span>{card.recipient_name ? `For: ${card.recipient_name}` : ''}</span>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex justify-end gap-1.5 mt-4 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => navigate(`/greeting-cards/create/${card.id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="Edit Card"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(card.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="Duplicate Card"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                    title="Delete Card"
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
