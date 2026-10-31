import React from 'react';

export default function SupportFinanceApp({ currentRole, activeTab }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-ink mb-2">Support, Finance & AI Hub</h2>
      <p className="text-sm text-gray-600">Active View: <span className="font-semibold text-solar-blue uppercase">{activeTab}</span> | Simulated Role: <span className="font-semibold text-ink">{currentRole}</span></p>
    </div>
  );
}
