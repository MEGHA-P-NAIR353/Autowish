import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    
    setTimeout(() => {
      setSubmitted(true);
      toast.success('Password reset link sent!');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="card p-7">
          {!submitted ? (
            <>
              <h2 className="text-2xl font-bold mb-1">Forgot Password?</h2>
              <p className="text-[#94A3B8] mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit}>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="input mb-5" 
                  placeholder="Enter your email" 
                  required 
                />
                <button type="submit" className="btn-primary w-full">Send Reset Link</button>
              </form>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="mx-auto w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-5">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="font-semibold text-xl">Check your email</h3>
              <p className="text-sm text-[#94A3B8] mt-1">We've sent a reset link to {email}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-400 hover:underline">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
