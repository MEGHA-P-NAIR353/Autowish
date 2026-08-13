import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-100">Welcome back</h1>
          <p className="text-[#94A3B8] mt-1 text-sm">Sign in to continue to AutoWish AI</p>
        </div>

        <div className="card p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={17} />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10 pr-4 py-2.5 text-sm" 
                  placeholder="you@company.com" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" size={17} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10 pr-10 py-2.5 text-sm" 
                  placeholder="••••••••" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={e => setRememberMe(e.target.checked)} 
                  className="accent-blue-500 rounded" 
                />
                <span className="text-[#94A3B8] text-xs">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary w-full py-3 disabled:opacity-70 flex justify-center items-center font-bold text-sm"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* OAuth Section - Clean Coming Soon indicator */}
          <div className="mt-6 pt-5 border-t border-[#334155] text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-[11px] text-slate-400">
              <span>Google & Microsoft SSO</span>
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 font-bold rounded-md text-[9px] uppercase">Coming Soon</span>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-[#64748B]">
          Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
