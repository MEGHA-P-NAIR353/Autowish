import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: ''
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
      await register({ name: formData.name, email: formData.email, password: formData.password });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-3xl font-bold">A</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="text-[#94A3B8] mt-1">Join thousands automating special moments</p>
        </div>

        <div className="card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="input" placeholder="e.g. Jane Smith" required />
            </div>

            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="input" placeholder="••••••••" required />
            </div>

            <div>
              <label className="text-xs font-medium text-[#94A3B8] block mb-1.5">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input" placeholder="••••••••" required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-[13px] mt-2">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-5 text-xs text-[#64748B]">
            By signing up you agree to our <span className="text-blue-400">Terms</span> & <span className="text-blue-400">Privacy Policy</span>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-[#64748B]">
          Already have an account? <Link to="/login" className="text-blue-400 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
