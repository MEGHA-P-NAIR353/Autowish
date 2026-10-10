import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AmbientBackground,
  GlassCard,
  GlassInput,
  GlassButton,
  Field,
  ThemeToggle,
} from '../components/ui';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('reset_token') || searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success'
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!rawToken) {
      setErrorMsg('No reset authorization token provided. Please request a new verification code.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        reset_token: rawToken,
        password,
        confirm_password: confirmPassword,
      });
      setStatus('success');
      toast.success('Password changed successfully!');
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.error ||
        data?.password?.[0] ||
        data?.confirm_password?.[0] ||
        data?.reset_token?.[0] ||
        'Failed to reset password. The reset session may have expired.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">AutoWish AI</h1>
          <p className="text-muted mt-1 text-xs">Reset Your Password</p>
        </div>

        <GlassCard className="p-7">
          {status === 'success' ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="text-emerald-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-fg tracking-tight">
                Password Reset Complete
              </h2>
              <p className="text-muted text-sm mt-2 mb-6">
                Your password has been changed successfully. You can now sign in using your new credentials.
              </p>
              <GlassButton
                id="reset-success-login-btn"
                variant="primary"
                className="w-full py-3 font-semibold"
                onClick={() => navigate('/login', { replace: true })}
              >
                Sign In With New Password
              </GlassButton>
            </div>
          ) : !rawToken ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="text-amber-400" size={28} />
              </div>
              <h2 className="text-xl font-bold text-fg mb-2">Verification Code Required</h2>
              <p className="text-muted text-xs mb-6">
                To reset your password securely, request a 6-digit verification code to your email.
              </p>
              <GlassButton
                variant="primary"
                className="w-full py-3 font-semibold mb-3"
                onClick={() => navigate('/forgot-password')}
              >
                Request Verification Code
              </GlassButton>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-5 text-center">
                <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="text-purple-400" size={24} />
                </div>
                <h2 className="text-xl font-bold text-fg">Set New Password</h2>
                <p className="text-muted text-xs mt-1">
                  Create a strong, unique password for your account.
                </p>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="New Password" required>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                      size={17}
                    />
                    <GlassInput
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="pl-10 pr-10"
                      placeholder="At least 8 characters"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password" required>
                  <div className="relative">
                    <Lock
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                      size={17}
                    />
                    <GlassInput
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="pl-10 pr-10"
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>

                <GlassButton
                  id="reset-submit-button"
                  type="submit"
                  variant="primary"
                  loading={loading}
                  className="w-full py-3 font-semibold mt-2"
                >
                  Save New Password
                </GlassButton>
              </form>

              <div className="mt-6 pt-5 border-t border-line text-center">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                >
                  <ArrowLeft size={14} /> Request a new code
                </Link>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default ResetPassword;
