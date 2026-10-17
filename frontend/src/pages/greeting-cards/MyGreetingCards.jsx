import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Heart, Edit2, Copy, Trash2, Calendar, Download, Send, X, Mail } from 'lucide-react';
import { cardsAPI } from '../../services/greetingCardsAPI';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';

export default function MyGreetingCards() {
  const [searchParams] = useSearchParams();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [cardToSend, setCardToSend] = useState(null);
  const [sendContactId, setSendContactId] = useState('');
  const [sending, setSending] = useState(false);

  const { contacts = [], refetchGreetingAnalytics, fetchNotifications } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== search) {
      setSearch(q);
    }
  }, [searchParams]);

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

  const handleExportCard = async (card) => {
    const toastId = toast.loading('Exporting greeting card...');
    const safeTitle = (card.title || 'greeting-card').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'greeting-card';
    try {
      if (card.preview_image_url) {
        const res = await fetch(card.preview_image_url);
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success('Card downloaded successfully!');
      } else {
        const res = await cardsAPI.exportCard(card.id, 'png');
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.dismiss(toastId);
        toast.success('Card downloaded successfully!');
      }
    } catch {
      toast.dismiss(toastId);
      toast('Opening editor to export card...', { icon: 'ℹ️' });
      navigate(`/greeting-cards/edit/${card.id}`);
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

  const handleOpenSendModal = (card) => {
    setCardToSend(card);
    // Auto-select contact if card already has a contact_id or matching recipient
    if (card.contact) {
      setSendContactId(String(card.contact));
    } else if (card.recipient_name && contacts.length > 0) {
      const match = contacts.find(c => c.name?.toLowerCase() === card.recipient_name.toLowerCase());
      setSendContactId(match ? String(match.id) : (contacts[0] ? String(contacts[0].id) : ''));
    } else if (contacts.length > 0) {
      setSendContactId(String(contacts[0].id));
    } else {
      setSendContactId('');
    }
  };

  const handleSendCardSubmit = async () => {
    if (!cardToSend || !sendContactId) {
      toast.error('Please select a recipient contact.');
      return;
    }
    const targetContact = contacts.find(c => String(c.id) === String(sendContactId));
    if (!targetContact?.email) {
      toast.error('Selected contact has no email address.');
      return;
    }

    setSending(true);
    try {
      await cardsAPI.sendCard(cardToSend.id, sendContactId);
      toast.success(`🎉 Greeting card sent to ${targetContact.name}!`);
      setCardToSend(null);
      if (refetchGreetingAnalytics) refetchGreetingAnalytics();
      if (fetchNotifications) fetchNotifications();
      fetchCards();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || 'Failed to send card.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const filtered = cards.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-inset min-h-screen text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
            My Greeting Cards
          </h1>
          <p className="text-xs text-slate-400">View, edit, and instantly send your personalized cards</p>
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
      <div className="flex gap-4 items-center bg-inset p-3 rounded-2xl border border-line-soft">
        <div className="flex items-center gap-2 bg-surface border border-line/50 rounded-xl px-3 py-1.5 flex-1 max-w-sm">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search cards by title..."
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
          <Calendar size={48} className="mb-4 text-slate-600" />
          <h3 className="text-fg font-semibold mb-1 text-sm">No Cards Found</h3>
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
              className="bg-inset rounded-2xl border border-line-soft overflow-hidden hover:border-line transition-all flex flex-col group"
            >
              {/* Preview image */}
              <div className="relative aspect-square bg-inset flex items-center justify-center overflow-hidden border-b border-line-soft">
                {card.preview_image_url ? (
                  <img
                    src={card.preview_image_url}
                    alt={card.title}
                    className="w-full h-full object-contain p-1.5 transition-all duration-300"
                    onError={(e) => {
                      // If the preview URL has a temporary issue, fetch afresh
                      console.warn('Card image load issue:', card.id);
                    }}
                  />
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center gap-1.5">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading preview...</span>
                  </div>
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
                  <h3 className="text-fg font-semibold text-xs truncate mb-1">{card.title}</h3>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="bg-raised/80 px-2 py-0.5 rounded-full border border-line/30">{card.occasion}</span>
                    <span>{card.recipient_name ? `For: ${card.recipient_name}` : ''}</span>
                  </div>
                </div>

                {/* Card actions */}
                <div className="flex justify-end items-center gap-1.5 mt-4 pt-3 border-t border-line-soft/60">
                  <button
                    onClick={() => handleOpenSendModal(card)}
                    className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all"
                    title="Send Card by Email"
                  >
                    <Send size={13} />
                  </button>
                  <button
                    onClick={() => navigate(`/greeting-cards/edit/${card.id}`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-fg hover:bg-raised transition-all"
                    title="Edit Card"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(card.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-fg hover:bg-raised transition-all"
                    title="Duplicate Card"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => handleExportCard(card)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-raised transition-all"
                    title="Export / Download Card"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-raised transition-all"
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

      {/* Instant Send Modal */}
      <AnimatePresence>
        {cardToSend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setCardToSend(null)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 14 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-md bg-surface border border-line rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-line-soft">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Send size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-fg">Send Greeting Card</h3>
                    <p className="text-[10px] text-muted">Email card with high-resolution image attachment</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCardToSend(null)}
                  className="p-1.5 rounded-lg bg-inset hover:bg-raised text-muted hover:text-fg transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Preview card small */}
                <div className="flex items-center gap-3 p-3 bg-inset/60 rounded-xl border border-line-soft">
                  <div className="w-16 h-16 rounded-lg bg-surface overflow-hidden border border-line-soft flex items-center justify-center flex-shrink-0">
                    {cardToSend.preview_image_url ? (
                      <img src={cardToSend.preview_image_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Mail size={20} className="text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-fg truncate">{cardToSend.title}</h4>
                    <span className="text-[10px] text-indigo-400 font-semibold">{cardToSend.occasion}</span>
                    {cardToSend.recipient_name && (
                      <p className="text-[10px] text-muted truncate">Recipient: {cardToSend.recipient_name}</p>
                    )}
                  </div>
                </div>

                {/* Contact Selection */}
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-muted mb-1.5 block">
                    Select Recipient Contact *
                  </label>
                  <select
                    value={sendContactId}
                    onChange={(e) => setSendContactId(e.target.value)}
                    className="w-full bg-surface text-fg text-xs rounded-xl px-3 py-2.5 border border-line outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="">-- Choose Contact --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : '(No Email)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warning if selected contact has no email */}
                {sendContactId && !contacts.find(c => String(c.id) === String(sendContactId))?.email && (
                  <p className="text-xs text-rose-400 font-medium">
                    ⚠️ The selected contact has no email address. Please update contact details or choose another contact.
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setCardToSend(null)}
                    className="flex-1 py-2 bg-inset hover:bg-raised text-muted hover:text-fg text-xs font-semibold rounded-xl border border-line-soft transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendCardSubmit}
                    disabled={sending || !sendContactId || !contacts.find(c => String(c.id) === String(sendContactId))?.email}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
