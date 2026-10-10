import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  Check,
} from 'lucide-react';
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

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Current wizard step: 1 = Email Request, 2 = Verify OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);

  // Form states
  const [email, setEmail] = useState(location.state?.prefilledEmail || '');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI & network states
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // References for the 6 OTP input boxes
  const otpInputRefs = useRef([]);

  // Timer countdown effect for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Focus the first OTP box when entering step 2
  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Helper to mask email for security display (e.g., m***@example.com)
  const getMaskedEmail = (val) => {
    if (!val || !val.includes('@')) return val;
    const [local, domain] = val.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
  };

  // Password strength evaluation
  const passwordCriteria = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    matches: password.length > 0 && password === confirmPassword,
  };

  const strengthScore = [
    passwordCriteria.length,
    passwordCriteria.hasLetter,
    passwordCriteria.hasNumber,
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!password) return { label: '', color: 'bg-line' };
    if (strengthScore <= 1) return { label: 'Weak', color: 'bg-rose-500' };
    if (strengthScore === 2) return { label: 'Fair', color: 'bg-amber-500' };
    if (strengthScore === 3) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };

  // ── Step 1: Submit Email for OTP ───────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.forgotPassword(cleanEmail);
      const cooldownSec = response.data?.cooldown_seconds || 60;
      setCooldown(cooldownSec);
      setErrorMessage('');
      toast.success('Verification code sent to your email.');
      setStep(2);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 429) {
        const remaining = data?.cooldown_seconds || 60;
        setCooldown(remaining);
        setStep(2);
        toast('A code was recently sent. Please check your inbox or wait.', { icon: '⏳' });
      } else {
        const errorMsg = data?.error || data?.email?.[0] || 'Unable to request verification code. Please try again.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Handle OTP Digits, Navigation, and Paste ────────────────────────
  const handleOtpDigitChange = (index, value) => {
    // Only accept numeric characters
    const numericChar = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = numericChar;
    setOtpDigits(updated);
    setErrorMessage('');

    // Advance focus to next input if filled
    if (numericChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Move back and clear previous
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasteData[i] || '';
    }
    setOtpDigits(updated);
    setErrorMessage('');

    // Focus the box following the pasted sequence
    const nextIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage('');
    try {
      const response = await authAPI.forgotPassword(email.trim().toLowerCase());
      const cooldownSec = response.data?.cooldown_seconds || 60;
      setCooldown(cooldownSec);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      toast.success('A new verification code has been dispatched.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to resend verification code.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  // Submit OTP for Verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.verifyResetOtp(email.trim().toLowerCase(), fullOtp);
      const token = response.data?.reset_token;
      if (!token) {
        throw new Error('Missing reset authorization token.');
      }
      setResetToken(token);
      toast.success('Verification code confirmed!');
      setStep(3);
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.otp?.[0] || 'Invalid verification code. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set New Password ───────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({
        reset_token: resetToken,
        password,
        confirm_password: confirmPassword,
      });
      toast.success('Your password has been reset successfully!');
      setStep(4);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.error ||
        data?.password?.[0] ||
        data?.confirm_password?.[0] ||
        'Failed to reset password. The session may have expired.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step Indicators metadata
  const stepsMeta = [
    { num: 1, label: 'Email' },
    { num: 2, label: 'Verify' },
    { num: 3, label: 'Reset' },
  ];

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center p-6 relative overflow-hidden">
      <AmbientBackground />

      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-fg tracking-tight">AutoWish AI</h1>
          <p className="text-muted mt-1 text-xs">Account Security & Password Recovery</p>
        </div>

        {/* Multi-step Breadcrumbs (Steps 1 to 3) */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2 mb-6" aria-label="Progress steps">
            {stepsMeta.map((s, idx) => {
              const isCompleted = step > s.num;
              const isCurrent = step === s.num;
              return (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-primary text-white ring-4 ring-primary/20'
                          : 'bg-raised text-muted border border-line'
                      }`}
                    >
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : s.num}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:inline ${
                        isCurrent ? 'text-fg font-semibold' : 'text-muted'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < stepsMeta.length - 1 && (
                    <div
                      className={`w-8 h-0.5 rounded transition-colors ${
                        step > s.num ? 'bg-emerald-500' : 'bg-line'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <GlassCard className="p-7">
          <AnimatePresence mode="wait">
            {/* ════════════════════════════════════════════════════════════════
                STEP 1: REQUEST OTP
            ════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-fg">Forgot Password?</h2>
                  <p className="text-muted text-xs mt-1">
                    Enter your registered email address and we'll send you a 6-digit verification code.
                  </p>
                </div>

                {errorMessage && (
                  <div
                    id="step1-error-banner"
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <Field label="Email Address" required>
                    <div className="relative">
                      <Mail
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                        size={17}
                      />
                      <GlassInput
                        id="forgot-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        className="pl-10"
                        placeholder="you@company.com"
                        required
                        autoFocus
                      />
                    </div>
                  </Field>

                  <GlassButton
                    id="request-otp-button"
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="w-full py-3 font-semibold mt-2"
                  >
                    Send Verification Code
                  </GlassButton>
                </form>

                <div className="mt-6 pt-5 border-t border-line text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </Link>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 2: VERIFY OTP
            ════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5 text-center">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="text-primary" size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-fg">Enter Verification Code</h2>
                  <p className="text-muted text-xs mt-1">
                    We sent a 6-digit code to{' '}
                    <span className="text-fg font-medium">{getMaskedEmail(email)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMessage('');
                    }}
                    className="text-xs text-primary hover:underline mt-1 font-medium inline-block"
                  >
                    Wrong email? Change
                  </button>
                </div>

                {errorMessage && (
                  <div
                    id="step2-error-banner"
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* Segmented 6-digit OTP Inputs */}
                  <div>
                    <label className="block text-xs font-semibold text-muted text-center mb-2.5 uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <div
                      className="flex justify-between items-center gap-2"
                      onPaste={handleOtpPaste}
                    >
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-digit-${idx}`}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold bg-inset/80 border border-line focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl text-fg focus:outline-none transition-all select-none"
                          autoComplete="one-time-code"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Resend OTP Bar */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-muted flex items-center gap-1.5">
                      <Clock size={13} />
                      {cooldown > 0 ? (
                        <span>
                          Resend code in{' '}
                          <strong className="text-fg font-semibold">{cooldown}s</strong>
                        </span>
                      ) : (
                        <span>Didn't receive code?</span>
                      )}
                    </span>

                    <button
                      id="resend-otp-button"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldown > 0 || resending}
                      className={`font-semibold inline-flex items-center gap-1 transition-colors ${
                        cooldown > 0 || resending
                          ? 'text-subtle cursor-not-allowed opacity-50'
                          : 'text-primary hover:text-primary-hover hover:underline'
                      }`}
                    >
                      {resending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Resend code
                    </button>
                  </div>

                  <GlassButton
                    id="verify-otp-button"
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="w-full py-3 font-semibold mt-3"
                  >
                    Verify Code
                  </GlassButton>
                </form>

                <div className="mt-6 pt-5 border-t border-line text-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to email entry
                  </button>
                </div>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 3: SET NEW PASSWORD
            ════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-fg">Set New Password</h2>
                  <p className="text-muted text-xs mt-1">
                    Create a strong, unique password for your account.
                  </p>
                </div>

                {errorMessage && (
                  <div
                    id="step3-error-banner"
                    role="alert"
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4"
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* New Password */}
                  <Field label="New Password" required>
                    <div className="relative">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                        size={17}
                      />
                      <GlassInput
                        id="new-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMessage) setErrorMessage('');
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

                  {/* Confirm Password */}
                  <Field label="Confirm Password" required>
                    <div className="relative">
                      <Lock
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
                        size={17}
                      />
                      <GlassInput
                        id="confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        className="pl-10 pr-10"
                        placeholder="Re-enter new password"
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

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="p-3 bg-inset/50 border border-line rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted">Password Strength:</span>
                        <span className="font-semibold text-fg">
                          {getStrengthLabel().label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-line rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4].map((bar) => (
                          <div
                            key={bar}
                            className={`h-full flex-1 rounded-full transition-all duration-300 ${
                              strengthScore >= bar ? getStrengthLabel().color : 'bg-line/40'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Criteria checklist */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        <span
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.length ? 'text-emerald-400 font-medium' : 'text-subtle'
                          }`}
                        >
                          <Check size={11} className={passwordCriteria.length ? 'opacity-100' : 'opacity-30'} />
                          8+ characters
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.hasNumber ? 'text-emerald-400 font-medium' : 'text-subtle'
                          }`}
                        >
                          <Check size={11} className={passwordCriteria.hasNumber ? 'opacity-100' : 'opacity-30'} />
                          Number included
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.hasLetter ? 'text-emerald-400 font-medium' : 'text-subtle'
                          }`}
                        >
                          <Check size={11} className={passwordCriteria.hasLetter ? 'opacity-100' : 'opacity-30'} />
                          Letter included
                        </span>
                        <span
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.matches ? 'text-emerald-400 font-medium' : 'text-subtle'
                          }`}
                        >
                          <Check size={11} className={passwordCriteria.matches ? 'opacity-100' : 'opacity-30'} />
                          Passwords match
                        </span>
                      </div>
                    </div>
                  )}

                  <GlassButton
                    id="submit-new-password-button"
                    type="submit"
                    variant="primary"
                    loading={loading}
                    className="w-full py-3 font-semibold mt-2"
                  >
                    Reset Password
                  </GlassButton>
                </form>
              </motion.div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                STEP 4: SUCCESS CONFIRMATION
            ════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="text-center py-2"
              >
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
                  id="back-to-login-button"
                  variant="primary"
                  className="w-full py-3 font-semibold"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Return to Sign In
                </GlassButton>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-center mt-6 text-xs text-subtle">
          <ShieldCheck size={14} className="text-muted" />
          <span>Protected with end-to-end encrypted authentication</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
