import React, { useState, useEffect } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Calendar,
  Clock,
  Zap,
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react';

export default function CrewSchedulingView() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [slot, setSlot] = useState('FULL_DAY');
  const [skillFilter, setSkillFilter] = useState('');
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);

  // Scheduling Form
  const [projectId, setProjectId] = useState('proj-solar-3kw-01');
  const [selectedTechIds, setSelectedTechIds] = useState([]);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState(null);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.getAvailability(date, slot, skillFilter);
      setAvailability(res);
    } catch (err) {
      console.error('Error querying availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [date, slot, skillFilter]);

  const toggleSelectTech = (id) => {
    if (selectedTechIds.includes(id)) {
      setSelectedTechIds(selectedTechIds.filter((tId) => tId !== id));
    } else {
      if (selectedTechIds.length >= 3) {
        alert('Maximum crew size is 3 technicians per [NC-31].');
        return;
      }
      setSelectedTechIds([...selectedTechIds, id]);
    }
  };

  // Real-time compliance checks
  const isSizeValid = selectedTechIds.length >= 2 && selectedTechIds.length <= 3;
  const selectedTechObjects = (availability?.technicians || []).filter((t) =>
    selectedTechIds.includes(t.id)
  );
  const hasElectricalLead = selectedTechObjects.some((t) =>
    t.skills?.includes('ELECTRICAL_LEAD')
  );

  const handleScheduleCrew = async (e) => {
    e.preventDefault();
    if (!isSizeValid) {
      alert('Crew size must be between 2 and 3 technicians [NC-31].');
      return;
    }
    if (!hasElectricalLead) {
      alert('Safety policy violation: At least 1 crew member must have ELECTRICAL_LEAD license.');
      return;
    }

    try {
      setSchedulingLoading(true);
      setScheduleFeedback(null);
      const res = await operationsApi.scheduleCrew({
        projectId,
        date,
        slot,
        technicianIds: selectedTechIds
      });
      setScheduleFeedback({
        type: 'success',
        message: `Installation crew successfully scheduled for ${projectId}! Job ID: ${res.jobId}`
      });
      setSelectedTechIds([]);
      fetchAvailability();
    } catch (err) {
      setScheduleFeedback({
        type: 'error',
        message: err.message
      });
    } finally {
      setSchedulingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="h-6 w-6 text-amber-500" />
          Technician Availability Query & Crew Scheduling
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Dynamic slot availability query (used by Sales/Operations). Enforces 2-3 crew size and mandatory Electrical Lead.
        </p>
      </div>

      {/* Query Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          Technician Slot Availability Query (Agreed Cross-Module API)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Target Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Work Shift / Slot *</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="FULL_DAY">FULL DAY (09:00 - 18:00)</option>
              <option value="MORNING">MORNING (09:00 - 13:00)</option>
              <option value="AFTERNOON">AFTERNOON (14:00 - 18:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Required Skill (Optional)</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Available Skills</option>
              <option value="ELECTRICAL_LEAD">ELECTRICAL_LEAD (Certified)</option>
              <option value="STRUCTURAL_MOUNT">STRUCTURAL_MOUNT</option>
              <option value="SOLAR_PV">SOLAR_PV</option>
              <option value="SURVEYOR">SURVEYOR (Pre-Sales Survey)</option>
            </select>
          </div>

          <div>
            <button
              onClick={fetchAvailability}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700 shadow"
            >
              Refresh Availability
            </button>
          </div>
        </div>
      </div>

      {/* Crew Assignment Builder */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Build Rooftop Installation Crew
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select 2 to 3 available technicians. Mandatory requirement: At least one Electrical Lead.
            </p>
          </div>

          {/* Real-time Safety Badges */}
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isSizeValid
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              Crew Size: {selectedTechIds.length} / 3 ({isSizeValid ? 'Valid [NC-31]' : 'Requires 2-3'})
            </span>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                hasElectricalLead
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              {hasElectricalLead ? 'Electrical Lead Present' : 'Missing Electrical Lead'}
            </span>
          </div>
        </div>

        {/* Project Target and Schedule Action */}
        <form onSubmit={handleScheduleCrew} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-64">
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Project ID *</label>
              <input
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex-1 text-xs text-slate-400">
              Selected Technicians:{' '}
              {selectedTechObjects.length > 0 ? (
                <strong className="text-white">
                  {selectedTechObjects.map((t) => t.fullName).join(', ')}
                </strong>
              ) : (
                <span className="italic">None selected. Click cards below to add to crew.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={schedulingLoading || !isSizeValid || !hasElectricalLead}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-xl shadow shadow-amber-500/20"
            >
              {schedulingLoading ? 'Scheduling...' : 'Confirm Crew Schedule'}
            </button>
          </div>

          {scheduleFeedback && (
            <div
              className={`p-4 rounded-xl text-xs font-medium border ${
                scheduleFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {scheduleFeedback.message}
            </div>
          )}

          {/* Available Technicians Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Available Technicians for {date} ({slot}) — Click to Toggle Crew Member
            </h4>

            {loading ? (
              <div className="py-12 text-center text-slate-500">Checking availability...</div>
            ) : availability?.technicians?.length === 0 ? (
              <div className="p-6 bg-slate-950 rounded-xl text-center text-slate-500 text-xs">
                No technicians available for this date and slot.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availability?.technicians?.map((t) => {
                  const isSelected = selectedTechIds.includes(t.id);
                  const isLead = t.skills?.includes('ELECTRICAL_LEAD');

                  return (
                    <div
                      key={t.id}
                      onClick={() => toggleSelectTech(t.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {t.fullName}
                            {isLead && <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Wage: ₹{t.dailyRate}/day ({t.employmentType})
                          </div>
                        </div>

                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'border border-slate-700 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {t.skills?.map((sk) => (
                          <span
                            key={sk}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              sk === 'ELECTRICAL_LEAD'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sk.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
