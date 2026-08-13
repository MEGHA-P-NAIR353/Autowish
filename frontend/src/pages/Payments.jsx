import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, CreditCard, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const Payments = () => {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'Pro';
  const price = searchParams.get('price') || '9.99';
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const handlePay = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate transaction delay
    setTimeout(() => {
      setLoading(false);
      const mockTxId = `tx_${Math.floor(Date.now() / 1000)}`;
      toast.success('Sandbox Payment successful!');
      navigate(`/billing?session_id=${mockTxId}&success=true`);
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-slate-400 text-sm">Secure sandbox checkout gateway for Auto-Wish AI.</p>
      </div>

      <div className="bg-slate-850 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
        {/* Plan Summary */}
        <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center text-xs">
          <div>
            <h4 className="font-bold text-slate-200">{plan} Subscription Plan</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Renews automatically monthly.</p>
          </div>
          <span className="text-base font-extrabold text-white">${price}/mo</span>
        </div>

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 font-semibold mb-2">CARDHOLDER NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 font-semibold mb-2">CARD NUMBER</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <CreditCard size={16} />
              </span>
              <input
                type="text"
                required
                maxLength="19"
                placeholder="4242 4242 4242 4242 (Sandbox Card)"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-2">EXPIRY DATE</label>
              <input
                type="text"
                required
                maxLength="5"
                placeholder="MM/YY"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-semibold mb-2">CVV</label>
              <input
                type="password"
                required
                maxLength="3"
                placeholder="•••"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Confirm Payment of ${price}
          </button>
        </form>

        <div className="flex gap-2.5 justify-center items-center text-[10px] text-slate-500">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>256-bit SSL Encrypted Sandbox Connection</span>
        </div>
      </div>
    </div>
  );
};

export default Payments;
