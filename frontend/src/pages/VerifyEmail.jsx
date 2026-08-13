import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        await api.post('auth/verify-email/', { token });
        setStatus('success');
      } catch (err) {
        setStatus('error');
      }
    };
    
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Mail className="text-blue-400" size={32} />
          </div>
        </div>

        {status === 'verifying' && (
          <div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Verifying Your Email</h2>
            <p className="text-slate-400 mb-6 text-sm">Please hold on while we confirm your email address.</p>
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-blue-500" size={36} />
            </div>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="text-emerald-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Email Verified!</h2>
            <p className="text-slate-400 mb-6 text-sm">Your email has been verified. You can now access all SaaS features.</p>
            <Link
              to="/login"
              className="block w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-sm"
            >
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="flex justify-center mb-4">
              <XCircle className="text-rose-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-3 tracking-tight">Verification Failed</h2>
            <p className="text-slate-400 mb-6 text-sm">The verification link is invalid, expired, or has already been used.</p>
            <Link
              to="/"
              className="block w-full py-3 bg-slate-700 hover:bg-slate-600 transition-colors font-medium rounded-xl text-sm"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
