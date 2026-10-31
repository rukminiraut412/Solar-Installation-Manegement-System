import React, { useState } from 'react';
import SupportCasesTab from './components/SupportCasesTab';
import PaymentsTab from './components/PaymentsTab';
import FinanceTab from './components/FinanceTab';
import DashboardsTab from './components/DashboardsTab';
import AIAssistantTab from './components/AIAssistantTab';

export default function SupportFinanceApp({ currentRole = 'Admin', activeTab = 'overview' }) {
  // If activeTab is 'overview', default to support tab or allow internal tab selection
  const [internalTab, setInternalTab] = useState('support');

  const selectedTab = activeTab === 'overview' ? internalTab : activeTab;

  return (
    <div className="space-y-6">
      {/* If overview route is visited, show secondary selector */}
      {activeTab === 'overview' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Module Views:</span>
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'support', label: 'Support Queue' },
                { id: 'payments', label: 'Razorpay Payments' },
                { id: 'finance', label: 'Finance & Invoices' },
                { id: 'dashboards', label: 'Dashboards & P/L' },
                { id: 'ai', label: 'AI Intelligence' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setInternalTab(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition ${
                    internalTab === t.id 
                      ? 'bg-solar-blue text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Active Simulated Role: <strong className="text-ink font-semibold">{currentRole}</strong>
          </div>
        </div>
      )}

      {/* Render Selected View */}
      {selectedTab === 'support' && <SupportCasesTab currentRole={currentRole} />}
      {selectedTab === 'payments' && <PaymentsTab currentRole={currentRole} />}
      {selectedTab === 'finance' && <FinanceTab currentRole={currentRole} />}
      {selectedTab === 'dashboards' && <DashboardsTab currentRole={currentRole} />}
      {selectedTab === 'ai' && <AIAssistantTab currentRole={currentRole} />}
    </div>
  );
}
