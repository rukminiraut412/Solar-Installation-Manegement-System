import React from 'react';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import PublicQuotePortal from './features/customer-sales/components/PublicQuotePortal';
import { Sun } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Sun className="h-10 w-10 text-amber-500 animate-spin-slow" />
        <span className="text-sm font-semibold tracking-wide">Initializing SunPower Platform...</span>
      </div>
    );
  }

  // Allow public quote review and digital signing without authentication
  if (window.location.pathname.includes('/portal/quotes/')) {
    return <PublicQuotePortal />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      {({ activeTab }) => <Dashboard activeTab={activeTab} />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
