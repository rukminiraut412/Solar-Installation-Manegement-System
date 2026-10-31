import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import { ShieldAlert, Sun } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Sun className="h-8 w-8 text-amber-500 animate-spin-slow" />
        <span className="text-sm font-medium">Verifying security credentials...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Access Forbidden (403)</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          Your role <span className="font-semibold text-rose-400">({user.role})</span> does not have authorization to view this module.
        </p>
      </div>
    );
  }

  return children;
}
