import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Heart, Copy, Plus, Filter, Trash2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  
  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newOccasion, setNewOccasion] = useState('Birthday');
  const [newTone, setNewTone] = useState('Friendly');
  const [newContent, setNewContent] = useState('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('templates/');
      setTemplates(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Template copied to clipboard!');
  };

  const handleToggleFavorite = async (id, currentVal) => {
    try {
      const res = await api.patch(`templates/${id}/`, { is_favorite: !currentVal });
      setTemplates(templates.map(t => t.id === id ? { ...t, is_favorite: res.data.is_favorite } : t));
      toast.success(res.data.is_favorite ? 'Added to favorites!' : 'Removed from favorites.');
    } catch (err) {
      toast.error('Failed to update favorite status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`templates/${id}/`);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success('Template deleted.');
    } catch (err) {
      toast.error('Failed to delete template.');
    }
  };

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newName || !newContent) {
      toast.error('Please fill in all required fields.');
      return;
    }
    
    try {
      const res = await api.post('templates/', {
        name: newName,
        occasion: newOccasion,
        tone: newTone,
        content: newContent,
        is_favorite: false
      });
      toast.success('Template added successfully!');
      setShowAddModal(false);
      setNewName('');
      setNewContent('');
      fetchTemplates();
    } catch (err) {
      toast.error('Failed to add template.');
    }
  };

  const filtered = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOccasion = selectedOccasion === 'All' || t.occasion === selectedOccasion;
    return matchesSearch && matchesOccasion;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wish Templates</h1>
          <p className="text-slate-400 text-sm">Save your custom templates or browse system defaults.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-medium text-sm rounded-xl transition-all shadow-lg"
        >
          <Plus size={18} />
          Create Template
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
          {['All', 'Birthday', 'Anniversary', 'Festival', 'Holiday'].map(occ => (
            <button
              key={occ}
              onClick={() => setSelectedOccasion(occ)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedOccasion === occ
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-slate-800/20 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {occ}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/10 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <p className="text-sm">No templates match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(t => (
            <div key={t.id} className="bg-slate-850 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base truncate">{t.name}</h3>
                    <div className="flex gap-1.5 mt-1">
                      <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold rounded-full uppercase">{t.occasion}</span>
                      <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold rounded-full uppercase">{t.tone}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggleFavorite(t.id, t.is_favorite)}
                      className={`p-1.5 rounded-lg border ${
                        t.is_favorite 
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Heart size={14} fill={t.is_favorite ? "currentColor" : "none"} />
                    </button>
                    {t.user && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-900/60 min-h-[70px] whitespace-pre-wrap">{t.content}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => handleCopy(t.content)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-colors"
                >
                  <Copy size={13} />
                  Copy Text
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold">New Custom Template</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-sm">Cancel</button>
            </div>
            
            <form onSubmit={handleAddTemplate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">TEMPLATE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Work Anniversary Short"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">OCCASION</label>
                  <select
                    value={newOccasion}
                    onChange={e => setNewOccasion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                  >
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Festival">Festival</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">TONE</label>
                  <select
                    value={newTone}
                    onChange={e => setNewTone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Professional">Professional</option>
                    <option value="Funny">Funny</option>
                    <option value="Romantic">Romantic</option>
                    <option value="Formal">Formal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">TEMPLATE CONTENT</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type your template text here. You can use placeholder tags like {name}."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm"
              >
                Create Template
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
