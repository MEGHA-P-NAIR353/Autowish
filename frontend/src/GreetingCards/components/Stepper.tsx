import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <div className="w-full flex items-center justify-between py-4 px-6 bg-[#0B0F19]/40 backdrop-blur-md border border-slate-800/80 rounded-2xl">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;

        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                }`}
              >
                {isCompleted ? <Check size={14} className="stroke-[3]" /> : stepNum}
              </div>
              <span
                className={`text-xs font-semibold hidden md:inline transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded transition-all duration-500 ${
                  isCompleted ? 'bg-indigo-500' : 'bg-slate-850'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
