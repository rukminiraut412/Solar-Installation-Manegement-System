import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  CreditCard, 
  LifeBuoy, 
  BarChart3, 
  Sparkles, 
  Receipt,
  AlertCircle
} from 'lucide-react';
import SupportFinanceApp from './features/support-finance/SupportFinanceApp';

export default function App() {
  const [currentRole, setCurrentRole] = useState('Admin');
  const location = useLocation();

  const navItems = [
    { label: 'Support Queue & Cases', path: '/support', icon: LifeBuoy },
    { label: 'Payments & Checkout', path: '/payments', icon: CreditCard },
    { label: 'Invoices & Finance', path: '/finance', icon: Receipt },
    { label: 'Dashboards & P/L', path: '/dashboards', icon: BarChart3 },
    { label: 'AI Intelligence Hub', path: '/ai-assistant', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-ink">
      {/* Demo Notice Banner (§1.6 & §17.11) */}
      <div className="bg-charcoal text-white text-xs py-1.5 px-4 flex flex-wrap items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-solar-blue" />
          <span><strong>CASE STUDY DEMO:</strong> SunPower Solutions (Fictional) • Not affiliated with any real SunPower entity</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded font-mono text-[11px] border border-yellow-500/30">
            RAZORPAY TEST MODE
          </span>
          <div className="flex items-center gap-1.5 text-gray-300">
            <span>Simulate Role:</span>
            <select 
              value={currentRole} 
              onChange={(e) => setCurrentRole(e.target.value)}
              className="bg-gray-800 text-white rounded px-2 py-0.5 text-xs border border-gray-600 focus:outline-none focus:border-solar-blue"
            >
              <option value="Admin">Admin / Owner</option>
              <option value="Support">Support Lead</option>
              <option value="Finance">Finance Lead</option>
              <option value="Customer">Customer Portal</option>
              <option value="Technician">Field Technician</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main App Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
              <span className="w-8 h-8 rounded-lg bg-solar-blue flex items-center justify-center text-white font-bold text-lg shadow-sm">
                S
              </span>
              <span>SunPower<span className="text-solar-blue font-light">Solutions</span></span>
            </Link>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-300 ml-2">
              Module 4: Support, Finance & AI
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-solar-blue text-white shadow-sm' 
                      : 'text-gray-600 hover:text-ink hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<SupportFinanceApp currentRole={currentRole} activeTab="overview" />} />
          <Route path="/support/*" element={<SupportFinanceApp currentRole={currentRole} activeTab="support" />} />
          <Route path="/payments/*" element={<SupportFinanceApp currentRole={currentRole} activeTab="payments" />} />
          <Route path="/finance/*" element={<SupportFinanceApp currentRole={currentRole} activeTab="finance" />} />
          <Route path="/dashboards/*" element={<SupportFinanceApp currentRole={currentRole} activeTab="dashboards" />} />
          <Route path="/ai-assistant/*" element={<SupportFinanceApp currentRole={currentRole} activeTab="ai" />} />
        </Routes>
      </main>
    </div>
  );
}
