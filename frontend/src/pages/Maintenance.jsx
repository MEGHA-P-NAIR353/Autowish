import React from 'react';
import { Cpu } from 'lucide-react';

const Maintenance = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-6">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl text-center shadow-2xl space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Cpu className="text-blue-400" size={32} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">System Under Maintenance</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            We are performing database indexing optimizations and upgrading background worker instances. We will be back online shortly. Thank you for your patience!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
