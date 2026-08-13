import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Your message has been sent. Our team will get back to you shortly.');
      setName('');
      setEmail('');
      setMsg('');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Contact Our Team</h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">Have questions about subscription plans, security, custom SMTP setup or enterprise deals?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Contact details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-3xl space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Corporate Office</h3>
            <div className="space-y-3.5 text-xs text-slate-300">
              <p className="flex items-center gap-3"><MapPin size={16} className="text-blue-500" /> Bengaluru, Karnataka, India</p>
              <p className="flex items-center gap-3"><Phone size={16} className="text-blue-500" /> +91 80 4242 4242</p>
              <p className="flex items-center gap-3"><Mail size={16} className="text-blue-500" /> support@autowish.ai</p>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <form onSubmit={handleSubmit} className="md:col-span-3 bg-slate-850 border border-slate-800 p-6 rounded-3xl space-y-4">
          <div>
            <label className="block text-xs text-slate-400 font-semibold mb-2">FULL NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-semibold mb-2">EMAIL ADDRESS</label>
            <input
              type="email"
              required
              placeholder="e.g. john@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-semibold mb-2">YOUR MESSAGE</label>
            <textarea
              required
              rows={4}
              placeholder="Type your inquiry details..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            <Send size={14} /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
