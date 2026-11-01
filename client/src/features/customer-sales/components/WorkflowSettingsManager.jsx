import React, { useState, useEffect } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  CalendarCheck,
  Users,
  Settings,
  HelpCircle,
} from 'lucide-react';
import axios from 'axios';

export default function WorkflowSettingsManager() {
  const [adminSchedulingEnabled, setAdminSchedulingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/v1/workflow/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.data?.data?.admin_technician_scheduling) {
        setAdminSchedulingEnabled(Boolean(res.data.data.admin_technician_scheduling.enabled));
      }
    } catch (err) {
      setError('Failed to load workflow configuration settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    const nextVal = !adminSchedulingEnabled;
    try {
      setUpdating(true);
      setError(null);
      await axios.patch(
        '/api/v1/workflow/settings',
        {
          settingKey: 'admin_technician_scheduling',
          value: { enabled: nextVal },
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
      );
      setAdminSchedulingEnabled(nextVal);
      setSuccess(
        `Admin-Controlled Technician Assignment & Scheduling is now ${nextVal ? 'ENABLED' : 'DISABLED'}.`
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update setting');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Workflow & Scheduling Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure system-wide installation workflow policies, gates, and administrative scheduling permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Setting Card 1: Admin-Controlled Technician Assignment & Scheduling */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mt-0.5">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Admin-Controlled Technician Assignment & Scheduling
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    adminSchedulingEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {adminSchedulingEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Governs whether installation scheduling requires explicit Admin sign-off and slot confirmation after material verification, or allows operational team leads to self-schedule.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={handleToggle}
              disabled={loading || updating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 ${
                adminSchedulingEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {adminSchedulingEnabled ? (
                <>
                  <ToggleRight className="h-5 w-5" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5 text-slate-500" />
                  <span>Disabled</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Behavior Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl border transition ${
              adminSchedulingEnabled
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-slate-50/50 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>When Enabled (Strict Admin Mode):</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>After serial traceability and material verification, project enters Admin's scheduling queue.</li>
              <li>Admin views technician availability, skills, and certifications.</li>
              <li>Admin assigns the technician team, selects the scheduled date/time slot, and confirms.</li>
              <li>Prevents double-booking and unauthorized field deployment.</li>
              <li>Notifies Technician, Customer, and Warehouse of official confirmed schedule.</li>
            </ul>
          </div>

          <div
            className={`p-4 rounded-xl border transition ${
              !adminSchedulingEnabled
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-slate-50/50 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-bold text-xs text-slate-900">
              <Users className="h-4 w-4 text-amber-600" />
              <span>When Disabled (Decentralized Operations Mode):</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Preserves the existing operational technician scheduling process.</li>
              <li>Installation is NOT blocked merely because Admin scheduling is disabled.</li>
              <li>Assigned lead technicians or operational leads can self-schedule installations.</li>
              <li>Maintains authorization, assignment checks, and job card integrity.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
