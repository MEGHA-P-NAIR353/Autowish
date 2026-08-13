import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';

const HelpCenter = () => {
  const [openIdx, setOpenIdx] = useState(null);

  const faqs = [
    {
      q: 'How does Auto-Wish AI work?',
      a: 'Auto-Wish AI connects to your contact directory and schedules customized greetings for birthdays, anniversaries, and holidays. Our background processors generate greetings using Google Gemini AI and deliver them automatically via Gmail SMTP or API integrations.'
    },
    {
      q: 'Is there a limit on how many messages I can schedule?',
      a: 'Free plan subscribers are allocated 10 wishes per month. Pro and Business subscriptions offer unlimited schedule queues with expanded access to SMS and WhatsApp delivery channels.'
    },
    {
      q: 'Can I custom tune the AI generated style?',
      a: 'Yes! When creating a wish, you can select the Tone (Funny, Friendly, Professional, Romantic, Formal) and list customized interests or keywords that the Gemini API will seamlessly weave into the message.'
    },
    {
      q: 'How do I import my contacts?',
      a: 'Navigate to the Contacts tab and select "Import CSV". Your file should contain standard column headers including: Name, Email, Phone, Birthday, Anniversary, Relationship, Group, and Tags.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center & FAQ</h1>
        <p className="text-slate-400 text-sm">Need help? Read our platform guides or get in touch with our team.</p>
      </div>

      <div className="bg-slate-850 border border-slate-800 p-6 rounded-3xl space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border-b border-slate-850 pb-4 last:border-b-0 last:pb-0">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="flex justify-between items-center w-full text-left py-2 hover:text-blue-400 transition-colors"
            >
              <span className="text-sm font-bold">{faq.q}</span>
              {openIdx === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {openIdx === idx && (
              <p className="text-xs text-slate-400 mt-2 leading-relaxed bg-slate-900/40 p-3.5 rounded-xl border border-slate-850/80">
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HelpCenter;
