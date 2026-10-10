import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AmbientBackground,
  GlassCard,
  GlassInput,
  GlassButton,
  Field,
  ThemeToggle,
} from '../components/ui';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
          <h1 className="text-3xl font-bold text-fg tracking-tight">Create your account</h1>
          <p className="text-muted mt-1 text-sm">Join thousands automating special moments</p>
        </div>

        <GlassCard className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" required>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="e.g. Jane Smith"
                  required
                />
              </div>
            </Field>

            <Field label="Email Address" required>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </Field>

            <Field label="Confirm Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={17} />
                <GlassInput
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </Field>

            <GlassButton
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 font-semibold mt-2"
            >
              Create Account
            </GlassButton>
          </form>

          <div className="text-center mt-5 text-xs text-subtle">
            By signing up you agree to our{' '}
            <span className="text-primary hover:underline cursor-pointer">Terms</span> &{' '}
            <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
          </div>
        </GlassCard>

        <p className="text-center mt-6 text-sm text-subtle">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
