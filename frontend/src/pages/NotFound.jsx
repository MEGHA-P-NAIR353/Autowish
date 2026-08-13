import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl text-center shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="text-rose-400" size={32} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-slate-100">404</h1>
          <h2 className="text-xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-slate-400 text-xs">The route you are trying to access does not exist or has been moved.</p>
        </div>

        <Link
          to="/dashboard"
          className="block w-full py-3 bg-blue-600 hover:bg-blue-500 transition-colors font-medium rounded-xl text-xs"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
