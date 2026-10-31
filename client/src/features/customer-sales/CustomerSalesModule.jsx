import React, { useState, useEffect } from 'react';
import {
  Users,
  Inbox,
  Compass,
  FileSpreadsheet,
  PackageCheck,
  Sparkles,
  Sun
} from 'lucide-react';
import CustomerManagement from './components/CustomerManagement';
import EnquiryManagement from './components/EnquiryManagement';
import SiteSurveyManagement from './components/SiteSurveyManagement';
import QuotationManagement from './components/QuotationManagement';
import OrderFulfilmentHandover from './components/OrderFulfilmentHandover';

export default function CustomerSalesModule({ initialTab = 'enquiries' }) {
  // Map incoming sidebar tabs ('leads' -> 'enquiries', 'quotes' -> 'quotations')
  const getSubTab = (tab) => {
    if (tab === 'leads') return 'enquiries';
    if (tab === 'quotes') return 'quotations';
    return tab || 'enquiries';
  };

  const [activeSubTab, setActiveSubTab] = useState(() => getSubTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(getSubTab(initialTab));
    }
  }, [initialTab]);

  const TABS = [
    {
      id: 'enquiries',
      label: 'Enquiries & Leads',
      icon: Inbox,
      desc: 'Omnichannel capture, duplicate detection & qualification'
    },
    {
      id: 'customers',
      label: 'Customers 360°',
      icon: Users,
      desc: 'Accounts, contact profiles & chronological timeline'
    },
    {
      id: 'surveys',
      label: 'Site Surveys',
      icon: Compass,
      desc: 'Rooftop audit, tilt & azimuth, photo proofs & engineering gate'
    },
    {
      id: 'quotations',
      label: 'Solar Packages & Quotes',
      icon: FileSpreadsheet,
      desc: '10 standard packages, dynamic BOM & customer portal'
    },
    {
      id: 'orders',
      label: 'Order Handover (M3/M4)',
      icon: PackageCheck,
      desc: 'Confirmed orders, frozen project BOM & advance payments'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              <Sun className="h-4 w-4 text-emerald-600" /> Customer &amp; Sales Management
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Solar Customer Journey &amp; Sales Pipeline
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              End-to-end solar sales workflow: lead acquisition, technical feasibility survey, dynamic bill of materials quotation, customer digital acceptance, and operations handover.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Commercial Active
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          {TABS.map((tab) => {
            const isActive = activeSubTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeSubTab === 'enquiries' && <EnquiryManagement />}
        {activeSubTab === 'customers' && <CustomerManagement />}
        {activeSubTab === 'surveys' && <SiteSurveyManagement />}
        {activeSubTab === 'quotations' && <QuotationManagement />}
        {activeSubTab === 'orders' && <OrderFulfilmentHandover />}
      </div>
    </div>
  );
}
