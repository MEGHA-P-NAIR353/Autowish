import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AmbientBackground,
  GlassCard,
  GlassInput,
  GlassButton,
  Field,
  ThemeToggle,
} from '../components/ui';

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
    <div className="min-h-screen bg-app text-fg flex items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />

      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-fg tracking-tight">Welcome back</h1>
          <p className="text-muted mt-1 text-sm">Sign in to continue to AutoWish AI</p>
        </div>

        <GlassCard className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email Address" required>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <div className="flex justify-between items-center text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span className="text-muted text-xs">Remember me</span>
              </label>
              <Link
                id="forgot-password-link"
                to="/forgot-password"
                state={{ prefilledEmail: email }}
                className="text-xs text-primary hover:underline font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 font-semibold mt-2"
            >
              Sign In
            </GlassButton>
          </form>

          {/* SSO indicator */}
          <div className="mt-6 pt-5 border-t border-line text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-raised/80 border border-line rounded-full text-[11px] text-muted">
              <span>Google & Microsoft SSO</span>
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 font-bold rounded-md text-[9px] uppercase">
                Coming Soon
              </span>
            </div>
          </div>
        </GlassCard>

        <div className="text-center mt-6 text-sm text-subtle">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
