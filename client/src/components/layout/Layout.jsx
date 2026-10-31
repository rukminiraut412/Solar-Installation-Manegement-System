import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {typeof children === 'function' ? children({ activeTab, setActiveTab }) : children}
          </div>
        </main>
      </div>
    </div>

  );
}
