import React, { useState } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import api from '../../shared/services/api';
import { Sun, Lock, Mail, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Building2, Phone, User, MapPin } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Admin/Owner', email: 'admin@sunpower.com', pass: 'Admin@12345', badge: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { role: 'Sales', email: 'sales@sunpower.com', pass: 'Sales@12345', badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { role: 'Warehouse', email: 'warehouse@sunpower.com', pass: 'Warehouse@12345', badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { role: 'Technician', email: 'technician@sunpower.com', pass: 'Technician@12345', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { role: 'Support', email: 'support@sunpower.com', pass: 'Support@12345', badge: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
];

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Seller Registration State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.post('/auth/register', {
        fullName: regFullName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        businessName: regBusinessName || undefined,
        address: regAddress || undefined,
      });

      setSuccessMsg(res.data?.message || 'Registration successful! You may now sign in with your credentials.');
      setEmail(regEmail);
      setPassword('');
      setMode('login');
      // Reset registration form
      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');
      setRegBusinessName('');
      setRegAddress('');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please verify your details.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (acc) => {
    setMode('login');
    setEmail(acc.email);
    setPassword(acc.pass);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-4 shadow-sm">
          <Sun className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">SunPower Solutions</h2>
        <p className="mt-1 text-sm text-slate-600">Commercial Solar Installation Management Platform</p>

        {/* Tab switch */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl border border-slate-300">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff &amp; Partner Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Public Seller Registration
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@sunpower.com"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In to Portal
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Public registration is available exclusively for Solar Sellers &amp; Sales Partners.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="partner@solardealer.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Business / Agency Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={regBusinessName}
                      onChange={(e) => setRegBusinessName(e.target.value)}
                      placeholder="e.g. Apex Solar Energy"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City / Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="e.g. Pune, Maharashtra"
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering Seller Account...
                  </span>
                ) : (
                  <>
                    Complete Seller Registration
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick-Fill 5 Standard Roles */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Demo Role Accounts &bull; One-Click Select
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc)}
                  className={`p-2.5 text-left rounded-xl border text-xs font-medium transition ${acc.badge}`}
                >
                  <span className="font-bold block">{acc.role}</span>
                  <span className="text-[10px] opacity-80 truncate block">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
