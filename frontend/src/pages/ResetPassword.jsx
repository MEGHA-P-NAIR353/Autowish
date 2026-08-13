import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Invalid or missing token.');
      setStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await api.post('auth/reset-password/', { token, password });
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to reset password. Token may have expired.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <KeyRound className="text-purple-400" size={32} />
          </div>
        </div>

        {status === 'success' ? (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="text-emerald-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Password Reset Complete</h2>
            <p className="text-slate-400 mb-6 text-sm">Your password has been changed successfully. You can now log in with your new credentials.</p>
            <Link
              to="/login"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm text-center"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight text-center">Reset Password</h2>
            <p className="text-slate-400 mb-6 text-sm text-center">Create a new secure password for your account.</p>

            {errorMsg && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl mb-4 text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">NEW PASSWORD</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-sm focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">CONFIRM PASSWORD</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl text-sm focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Reset Password
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
