import React from 'react';
import { RefreshCw } from 'lucide-react';

const Error500 = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl text-center shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
            <RefreshCw className="text-amber-400" size={32} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-100">500</h1>
          <h2 className="text-xl font-bold tracking-tight">Internal Server Error</h2>
          <p className="text-slate-400 text-xs">Our workers encountered an unexpected issue. Please try reloading the page.</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 transition-colors font-medium rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700"
        >
          <RefreshCw size={14} /> Reload Page
        </button>
      </div>
    </div>
  );
};

export default Error500;
