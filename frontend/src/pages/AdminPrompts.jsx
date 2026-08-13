import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Search, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminPrompts = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('Birthday');
  const [tone, setTone] = useState('Friendly');
  const [template, setTemplate] = useState('');

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const res = await api.get('admin/prompts/');
      setPrompts(res.data.results || res.data || []);
    } catch (err) {
      toast.error('Failed to load prompts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !template) {
      toast.error('Name and Template content are required.');
      return;
    }

    try {
      const payload = { name, occasion, tone, prompt_template: template, is_active: true };
      if (selectedPrompt) {
        await api.put(`admin/prompts/${selectedPrompt.id}/`, payload);
        toast.success('Prompt updated successfully!');
      } else {
        await api.post('admin/prompts/', payload);
        toast.success('Prompt created successfully!');
      }
      setShowModal(false);
      setName('');
      setTemplate('');
      setSelectedPrompt(null);
      fetchPrompts();
    } catch (err) {
      toast.error('Failed to save prompt.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prompt template?')) return;
    try {
      await api.delete(`admin/prompts/${id}/`);
      setPrompts(prompts.filter(p => p.id !== id));
      toast.success('Prompt deleted.');
    } catch (err) {
      toast.error('Failed to delete prompt.');
    }
  };

  const filtered = prompts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.prompt_template.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Prompt Management</h1>
          <p className="text-slate-400 text-sm">Tune system prompts, edit Gemini model templates, and set defaults.</p>
        </div>
        <button
          onClick={() => {
            setSelectedPrompt(null);
            setName('');
            setTemplate('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 font-medium text-sm rounded-xl transition-all shadow-lg"
        >
          <Plus size={18} />
          Create Prompt
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Search by prompt name or context..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-800 rounded-3xl">No prompts found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(p => (
            <div key={p.id} className="bg-slate-850 border border-slate-800 hover:border-slate-750 p-5 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-200">{p.name}</h3>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-extrabold rounded uppercase">{p.occasion}</span>
                      <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-extrabold rounded uppercase">{p.tone}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedPrompt(p);
                        setName(p.name);
                        setOccasion(p.occasion);
                        setTone(p.tone);
                        setTemplate(p.prompt_template);
                        setShowModal(true);
                      }}
                      className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap mt-3">{p.prompt_template}</p>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/80 pt-3">
                <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Active System Prompt</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold">{selectedPrompt ? 'Edit AI Prompt' : 'New AI Prompt'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-xs">Cancel</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-2">PROMPT NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Friendly Birthday Prompt v2"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-2">OCCASION</label>
                  <select
                    value={occasion}
                    onChange={e => setOccasion(e.target.value)}
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
                    value={tone}
                    onChange={e => setTone(e.target.value)}
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
                <label className="block text-xs text-slate-400 font-semibold mb-2">PROMPT CONTEXT TEMPLATE</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Type the exact system prompt rules here..."
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm"
              >
                {selectedPrompt ? 'Save Changes' : 'Create Prompt'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrompts;
