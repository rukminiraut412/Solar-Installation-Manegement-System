import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Users,
  Award,
  Zap,
  Phone,
  CheckCircle,
  Filter,
  Search,
  Briefcase
} from 'lucide-react';

const SKILLS = [
  'ALL',
  'ELECTRICAL_LEAD',
  'STRUCTURAL_MOUNT',
  'SOLAR_PV',
  'SURVEYOR',
  'HELPER'
];

export default function TechnicianRosterView() {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.getRoster(
        selectedSkill !== 'ALL' ? { skill: selectedSkill } : {}
      );
      setRoster(res || []);
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [selectedSkill]);

  const filteredRoster = roster.filter(
    (t) =>
      t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.skills?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" />
            Certified Technician Roster (15 Members)
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative field crew skills taxonomy, government wireman licenses, and daily wage rates.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search technician by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Skill Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SKILLS.map((sk) => (
          <button
            key={sk}
            onClick={() => setSelectedSkill(sk)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSkill === sk
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {sk.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Roster Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading technician profiles...</div>
      ) : filteredRoster.length === 0 ? (
        <div className="py-16 text-center text-slate-500">No technicians found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoster.map((t) => {
            const hasElectricalLead = t.skills?.includes('ELECTRICAL_LEAD');

            return (
              <div
                key={t.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                        {t.fullName}
                        {hasElectricalLead && (
                          <span title="Certified Electrical Lead">
                            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span>{t.phone || '+91 98201 11000'}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        t.employmentType === 'FULL_TIME'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {t.employmentType || 'FULL_TIME'}
                    </span>
                  </div>

                  {/* Skills Taxonomy Badges */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {t.skills?.map((sk) => (
                      <span
                        key={sk}
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                          sk === 'ELECTRICAL_LEAD'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : sk === 'STRUCTURAL_MOUNT'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sk.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Certifications */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1 mb-1.5">
                      <Award className="h-3 w-3" /> Certifications & Licenses:
                    </span>
                    {t.certifications?.length > 0 ? (
                      <ul className="text-xs text-slate-300 space-y-1">
                        {t.certifications.map((c, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span>{c.name || c}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No formal licenses uploaded</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Daily Wage Rate:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ₹{t.dailyRate?.toLocaleString() || '1,200'} / Day
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
