import React from 'react';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="card p-6">
    <div className="w-11 h-11 bg-[#334155] rounded-2xl flex items-center justify-center mb-4">
      <Icon className="text-blue-400" size={22} />
    </div>
    <h4 className="font-semibold text-lg mb-1.5">{title}</h4>
    <p className="text-sm text-[#94A3B8] leading-relaxed">{description}</p>
  </div>
);

export default FeatureCard;
