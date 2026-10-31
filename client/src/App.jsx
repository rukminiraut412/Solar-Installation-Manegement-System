import React from 'react';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import Login from './components/auth/Login';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import { Sun } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700 gap-3">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Loading SunPower Solar Platform...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      {({ activeTab, setActiveTab }) => (
        <Dashboard activeTab={activeTab} onSelectTab={setActiveTab} />
      )}
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
