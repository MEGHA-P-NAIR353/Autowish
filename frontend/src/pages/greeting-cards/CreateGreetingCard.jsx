import React from 'react';
import CardEditor from '../../components/greeting-cards/CardEditor';

export default function CreateGreetingCard() {
  return (
    <div className="w-full h-screen bg-[#0a0f1e] overflow-hidden">
      <CardEditor />
    </div>
  );
}
