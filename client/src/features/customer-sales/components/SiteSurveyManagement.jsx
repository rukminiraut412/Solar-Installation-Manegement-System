import React, { useState, useEffect } from 'react';
import {
  Compass,
  Calendar,
  Clock,
  Camera,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Upload,
  UserCheck,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  X,
  FileCheck,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';

export default function SiteSurveyManagement({ onSelectApprovedSurvey }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [surveyPhotos, setSurveyPhotos] = useState([]);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isExecuteOpen, setIsExecuteOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Scheduling form
  const [scheduleForm, setScheduleForm] = useState({
    enquiryId: '',
    scheduledDate: '2026-11-05',
    timeSlot: '10:00 AM - 12:00 PM',
    technicianId: '',
  });
  const [availableTechs, setAvailableTechs] = useState([]);
  const [qualifiedEnquiries, setQualifiedEnquiries] = useState([]);

  // Mobile execution form
  const [executeForm, setExecuteForm] = useState({
    roofAreaSqft: 500,
    shadowFreeSqft: 420,
    roofType: 'Flat RCC',
    azimuthDegrees: 180, // South
    tiltAngleDegrees: 24, // [NC-015]
    cableRunMeters: 20,
    gridPhase: 'Single Phase',
    sanctionedLoadKw: 5,
    structuralCondition: 'GOOD',
    photos: [
      {
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/surveys/panorama.jpg',
        category: 'PANORAMA',
        notes: 'Full unshaded south view',
      },
      {
        photoUrl: 'https://res.cloudinary.com/demo/image/upload/surveys/meter.jpg',
        category: 'METER_BOARD',
        notes: 'Meter box with 5kW single phase connection',
      },
    ],
  });

  // Review form
  const [reviewForm, setReviewForm] = useState({
    decision: 'APPROVE',
    reason: '',
  });

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const res = await customerSalesApi.listSurveys();
      setSurveys(res.data || []);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const openScheduleModal = async () => {
    setIsScheduleOpen(true);
    try {
      const enqRes = await customerSalesApi.listEnquiries({ status: 'QUALIFIED' });
      setQualifiedEnquiries(enqRes.data || []);
      if (enqRes.data?.length > 0) {
        setScheduleForm((prev) => ({ ...prev, enquiryId: enqRes.data[0].id }));
      }
      const techRes = await customerSalesApi.getAvailableTechnicians(scheduleForm.scheduledDate, scheduleForm.timeSlot);
      setAvailableTechs(techRes.data || []);
    } catch {
      // fallback
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await customerSalesApi.requestSurvey(scheduleForm);
      setFeedback({ type: 'success', text: `Survey ${res.data.survey_number} scheduled successfully!` });
      setIsScheduleOpen(false);
      loadSurveys();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to schedule survey' });
    }
  };

  const handleExecuteSubmit = async (e) => {
    e.preventDefault();
    try {
      await customerSalesApi.executeSurvey(selectedSurvey.id, executeForm);
      setFeedback({
        type: 'success',
        text: 'On-site rooftop measurements and photos saved! Survey submitted for Engineering Review.',
      });
      setIsExecuteOpen(false);
      loadSurveys();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Execution submission failed' });
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await customerSalesApi.reviewSurvey(selectedSurvey.id, reviewForm);
      setFeedback({
        type: 'success',
        text: `Survey status updated to ${res.data.status}. ${
          res.data.status === 'APPROVED' ? 'Quotation Builder unlocked!' : ''
        }`,
      });
      setIsReviewOpen(false);
      loadSurveys();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Review failed' });
    }
  };

  const openDossier = async (survey) => {
    setSelectedSurvey(survey);
    try {
      const res = await customerSalesApi.getSurvey(survey.id);
      setSurveyPhotos(res.data.photos || []);
    } catch {
      setSurveyPhotos([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-500" />
            Rooftop Site Survey &amp; Engineering Review Gate
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 3 &amp; BR-SRV-002 Invariant: A survey must be rigorously conducted on-site with photo proofs and strictly
            APPROVED by engineering before quoting.
          </p>
        </div>
        <button
          onClick={openScheduleModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
        >
          <Calendar className="h-4 w-4" />
          Schedule Site Survey
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Surveys Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Survey ID</th>
                <th className="py-3 px-4">Scheduled Slot</th>
                <th className="py-3 px-4">Roof &amp; Usable Space</th>
                <th className="py-3 px-4">Orientation / Tilt</th>
                <th className="py-3 px-4">Cable Run</th>
                <th className="py-3 px-4">Review Gate Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    Loading site surveys...
                  </td>
                </tr>
              ) : surveys.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    No site surveys found. Schedule a survey for a qualified lead above.
                  </td>
                </tr>
              ) : (
                surveys.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">{s.survey_number}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{s.scheduled_date}</span>
                        <span className="text-[11px] text-slate-500">{s.time_slot}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.shadow_free_sqft ? (
                        <div>
                          <span className="text-emerald-400 font-bold">{s.shadow_free_sqft} sq ft</span>
                          <span className="text-slate-500 text-[11px] block">{s.roof_type || 'RCC'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Pending inspection</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.tilt_angle_degrees !== null && s.tilt_angle_degrees !== undefined ? (
                        <span className="text-white">
                          {s.azimuth_degrees}° Azimuth &bull;{' '}
                          <span className="text-amber-400 font-bold">{s.tilt_angle_degrees}° Tilt</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {s.cable_run_meters ? `${s.cable_run_meters}m` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] inline-flex items-center gap-1 ${
                          s.status === 'SCHEDULED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : s.status === 'COMPLETED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : s.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'REWORK'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {s.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                        {s.status === 'REWORK' && <RotateCcw className="h-3 w-3" />}
                        {s.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Execute Mobile Survey Button */}
                        {s.status !== 'APPROVED' && s.status !== 'REJECTED' && (
                          <button
                            onClick={() => {
                              setSelectedSurvey(s);
                              setIsExecuteOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition"
                          >
                            Mobile Form
                          </button>
                        )}

                        {/* Engineering Review Gate Button */}
                        {s.status === 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setSelectedSurvey(s);
                              setIsReviewOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow transition"
                          >
                            Review Gate
                          </button>
                        )}

                        {/* View Dossier */}
                        <button
                          onClick={() => openDossier(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                        >
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule Site Visit */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                Schedule Rooftop Site Survey
              </h3>
              <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Select Qualified Lead *</label>
                <select
                  required
                  value={scheduleForm.enquiryId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, enquiryId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {qualifiedEnquiries.length === 0 ? (
                    <option value="">No qualified leads available (Qualify a lead first)</option>
                  ) : (
                    qualifiedEnquiries.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.enquiry_number} &bull; {q.full_name} ({q.grid_type_preference})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Inspection Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Time Slot *</label>
                  <select
                    value={scheduleForm.timeSlot}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timeSlot: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                    <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">
                  Field Technician (Operations Roster)
                </label>
                <select
                  value={scheduleForm.technicianId}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, technicianId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Auto-balance technician load</option>
                  {availableTechs.map((t) => (
                    <option key={t.technicianId} value={t.technicianId}>
                      {t.fullName} &bull; Skills: {t.skills?.join(', ')} (Load: {t.currentDailyLoad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!scheduleForm.enquiryId}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg disabled:opacity-50"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mobile Survey Execution */}
      {isExecuteOpen && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  {selectedSurvey.survey_number}
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="h-5 w-5 text-amber-500" />
                  Rooftop Engineering Survey Execution Form
                </h3>
              </div>
              <button onClick={() => setIsExecuteOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Total Roof Area (sq ft) *</label>
                  <input
                    type="number"
                    required
                    value={executeForm.roofAreaSqft}
                    onChange={(e) => setExecuteForm({ ...executeForm, roofAreaSqft: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Shadow-Free Area (sq ft) *</label>
                  <input
                    type="number"
                    required
                    value={executeForm.shadowFreeSqft}
                    onChange={(e) => setExecuteForm({ ...executeForm, shadowFreeSqft: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Roof Type</label>
                  <select
                    value={executeForm.roofType}
                    onChange={(e) => setExecuteForm({ ...executeForm, roofType: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Flat RCC">Flat RCC Slab</option>
                    <option value="Metal Sheet">Sloped Metal Sheet</option>
                    <option value="Tiled Roof">Clay Tiled</option>
                    <option value="Ground Mount">Ground Mount</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Compass Azimuth (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={executeForm.azimuthDegrees}
                    onChange={(e) => setExecuteForm({ ...executeForm, azimuthDegrees: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="180 = South"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Tilt Angle (°) [NC-015]
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={executeForm.tiltAngleDegrees}
                    onChange={(e) => setExecuteForm({ ...executeForm, tiltAngleDegrees: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-emerald-400">Rec: 15° - 30°</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Cable Run to Inverter (m) *</label>
                  <input
                    type="number"
                    min="5"
                    max="200"
                    required
                    value={executeForm.cableRunMeters}
                    onChange={(e) => setExecuteForm({ ...executeForm, cableRunMeters: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-slate-500">Drives extra cable in BOM</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Grid Phase</label>
                  <select
                    value={executeForm.gridPhase}
                    onChange={(e) => setExecuteForm({ ...executeForm, gridPhase: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Single Phase">Single Phase</option>
                    <option value="Three Phase">Three Phase</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Sanctioned Load (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={executeForm.sanctionedLoadKw}
                    onChange={(e) => setExecuteForm({ ...executeForm, sanctionedLoadKw: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Mandatory Photo Proof Gate [NC-016] */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-bold flex items-center gap-1.5 mb-2">
                  <Camera className="h-4 w-4 text-amber-500" />
                  Mandatory Cloudinary Photo Proofs [NC-016] (Min 2 Required)
                </span>
                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                  Technician must capture clear photos of the roof panorama and existing meter board before submitting.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {executeForm.photos.map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase">{p.category}</span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{p.photoUrl}</p>
                      <span className="text-[10px] text-slate-500 italic block mt-1">{p.notes}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExecuteOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Submit for Engineering Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Engineering Review Gate */}
      {isReviewOpen && selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Engineering Review &amp; Quotation Approval Gate
              </h3>
              <button onClick={() => setIsReviewOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Verify measured roof area ({selectedSurvey.shadowFreeSqft} sq ft), tilt ({selectedSurvey.tilt_angle_degrees}°),
              and structural condition.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Review Decision *</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: 'APPROVE' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewForm.decision === 'APPROVE'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    APPROVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: 'REWORK' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewForm.decision === 'REWORK'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    REWORK
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, decision: 'REJECT' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      reviewForm.decision === 'REJECT'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    REJECT
                  </button>
                </div>
              </div>

              {reviewForm.decision !== 'APPROVE' && (
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Mandatory Reason (min 10 characters) *
                  </label>
                  <textarea
                    rows="3"
                    required
                    value={reviewForm.reason}
                    onChange={(e) => setReviewForm({ ...reviewForm, reason: e.target.value })}
                    placeholder="Describe engineering discrepancy or rework instructions..."
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Confirm Engineering Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossier Modal: View Survey Photos */}
      {selectedSurvey && surveyPhotos.length > 0 && !isExecuteOpen && !isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-amber-500" />
                Rooftop Survey Photo Proofs ({selectedSurvey.survey_number})
              </h3>
              <button onClick={() => setSelectedSurvey(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {surveyPhotos.map((p) => (
                <div key={p.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 mb-2 overflow-hidden">
                    <img src={p.photo_url} alt={p.category} className="object-cover w-full h-full" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase">{p.category}</span>
                  <p className="text-[10px] text-slate-400 mt-1">{p.notes || 'No notes'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
