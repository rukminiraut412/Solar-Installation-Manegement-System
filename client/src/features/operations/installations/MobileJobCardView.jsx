import React, { useState, useEffect, useRef } from 'react';
import { operationsApi } from '../services/operationsApi';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Camera,
  PenTool,
  Award,
  Zap,
  MapPin,
  Clock,
  ShieldCheck,
  RefreshCw,
  FileCheck
} from 'lucide-react';

const MILESTONES = [
  { id: 'SITE_ARRIVAL', label: '1. Site Arrival & Rooftop Inspection' },
  { id: 'STRUCTURE_MOUNTING', label: '2. Elevated Aluminium Structure & Rail Torquing' },
  { id: 'PANEL_INSTALLATION', label: '3. Solar PV Module Clamping & DC Stringing' },
  { id: 'ELECTRICAL_WIRING', label: '4. Inverter Wiring, AC/DC DBs & Chemical Earthing' },
  { id: 'SAFETY_TESTING', label: '5. Mandatory Earthing (<=5Ω) & Generation Testing' },
  { id: 'CUSTOMER_HANDOVER', label: '6. Customer Touch Sign-off & Handover Certificate' }
];

const PHOTO_ANGLES = [
  { id: 'ROOF_STRUCTURE', label: 'Roof Structure & Mountings' },
  { id: 'PANEL_ARRAY', label: 'Full Panel Array & Tilt Angle' },
  { id: 'INVERTER_WIRING', label: 'Inverter & Distribution Boxes' },
  { id: 'EARTHING_PIT', label: 'Chemical Earthing Pit & Electrode' }
];

export default function MobileJobCardView({ jobId = 'inst-job-test-01' }) {
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Safety testing state
  const [testingForm, setTestingForm] = useState({
    earthingResistanceOhms: '2.4',
    generationPowerKw: '3.2',
    vocVolts: '380',
    iscAmps: '9.2',
    notes: 'All electrical tests verified within CEA standards.'
  });
  const [testResult, setTestResult] = useState(null);

  // Photo uploader state
  const [photoAngle, setPhotoAngle] = useState('ROOF_STRUCTURE');
  const [photoUrl, setPhotoUrl] = useState('');

  // Signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [customerName, setCustomerName] = useState('Anand Deshmukh');
  const [customerRating, setCustomerRating] = useState(5);
  const [customerFeedback, setCustomerFeedback] = useState('Solar system installed professionally.');
  const [handoverCert, setHandoverCert] = useState(null);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const res = await operationsApi.getJobCard(jobId);
      setJobData(res);
      if (res.job?.handoverDetails) {
        setHandoverCert({ certificateNumber: `HOC-2026-${jobId.slice(-4)}` });
      }
    } catch (err) {
      console.error('Error fetching job card:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  // Milestone checkpoint update
  const handleCheckpoint = async (milestoneId) => {
    try {
      setActionLoading(true);
      await operationsApi.updateCheckpoint(jobId, {
        milestoneName: milestoneId,
        notes: `Milestone ${milestoneId} completed on-site.`
      });
      fetchJob();
    } catch (err) {
      alert(`Error updating checkpoint: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Safety test submit
  const handleTestingSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await operationsApi.recordSafetyTests(jobId, {
        earthingResistanceOhms: Number(testingForm.earthingResistanceOhms),
        generationPowerKw: Number(testingForm.generationPowerKw),
        vocVolts: Number(testingForm.vocVolts),
        iscAmps: Number(testingForm.iscAmps),
        notes: testingForm.notes
      });
      setTestResult(res);
      fetchJob();
    } catch (err) {
      alert(`Testing Submission Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Photo upload submit
  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      alert('Please enter or capture an image URL');
      return;
    }

    try {
      setActionLoading(true);
      await operationsApi.uploadPhoto(jobId, {
        angle: photoAngle,
        imageUrl: photoUrl,
        caption: `Site photo - ${photoAngle}`
      });
      alert(`Photo for ${photoAngle} successfully recorded!`);
      setPhotoUrl('');
      fetchJob();
    } catch (err) {
      alert(`Photo Upload Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // HTML5 Canvas touch drawing
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  // Sign customer handover
  const handleSignHandover = async () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : 'data:image/png;base64,mock';

    try {
      setActionLoading(true);
      const res = await operationsApi.signHandover(jobId, {
        customerName,
        signatureDataUrl,
        customerFeedback,
        customerRating
      });
      setHandoverCert(res.certificate);
      alert('Installation Handover signed and Certificate generated!');
      fetchJob();
    } catch (err) {
      alert(`Cannot Sign Handover: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
        <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
        <span>Loading mobile rooftop job card...</span>
      </div>
    );
  }

  const job = jobData?.job || {};
  const completedCheckpoints = job.completedCheckpoints || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Mobile Job Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold text-amber-400">{job.id}</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  job.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : job.status === 'REWORK_REQUIRED'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}
              >
                {job.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Rooftop Installation Job Card: Project {job.projectId}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Date: {job.scheduledDate} ({job.slot})
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Site: Customer Rooftop
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 font-semibold uppercase">Progress</span>
            <div className="text-2xl font-bold text-white mt-0.5">
              {completedCheckpoints.length} / 6
            </div>
            <div className="text-xs text-emerald-400 font-medium">Milestones Done</div>
          </div>
        </div>
      </div>

      {/* 6-Milestone Checklist Tracker */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-500" />
          Rooftop Installation Milestones & Checkpoints
        </h3>

        <div className="space-y-3">
          {MILESTONES.map((m) => {
            const isDone = completedCheckpoints.includes(m.id);

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? 'bg-emerald-500 text-slate-950' : 'border border-slate-700 text-slate-500'
                    }`}
                  >
                    {isDone ? '✓' : ''}
                  </div>
                  <span className="text-sm font-semibold">{m.label}</span>
                </div>

                {!isDone && (
                  <button
                    onClick={() => handleCheckpoint(m.id)}
                    disabled={actionLoading}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Electrical & Generation Safety Testing Gate */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Electrical & Generation Safety Testing Standards
          </h3>
          <span className="text-xs text-slate-400 font-mono">IS 3043 / CEA Standard</span>
        </div>

        <form onSubmit={handleTestingSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earthing Test */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">
                  Earthing Resistance (Ω) *
                </label>
                <span className="text-[11px] text-amber-400 font-mono font-bold">Limit: &lt;= 5.0 Ω</span>
              </div>
              <input
                type="number"
                step="0.1"
                required
                value={testingForm.earthingResistanceOhms}
                onChange={(e) => setTestingForm({ ...testingForm, earthingResistanceOhms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500">
                Earth tester measurement between electrode pit and neutral ground.
              </p>
            </div>

            {/* Generation Test */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">
                  Active Solar Generation (kW) *
                </label>
                <span className="text-[11px] text-emerald-400 font-mono font-bold">Required: &gt; 0.0 kW</span>
              </div>
              <input
                type="number"
                step="0.1"
                required
                value={testingForm.generationPowerKw}
                onChange={(e) => setTestingForm({ ...testingForm, generationPowerKw: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-lg font-mono font-bold text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500">
                Live AC power delivered to grid / load from inverter screen.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow"
            >
              Record Safety Test Measurements
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-xl text-xs font-medium border ${
              testResult.overallPassed
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* Mandatory 4-Angle Photo Verification [NC-30] */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="h-5 w-5 text-amber-500" />
          Mandatory 4-Angle Site Photo Uploads [NC-30]
        </h3>

        <form onSubmit={handlePhotoUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Photo Angle *</label>
              <select
                value={photoAngle}
                onChange={(e) => setPhotoAngle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {PHOTO_ANGLES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Image URL (Cloudinary / File) *
              </label>
              <input
                type="text"
                required
                placeholder="https://res.cloudinary.com/sunpower/installations/roof.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700"
            >
              Upload Photo for Angle
            </button>
          </div>
        </form>

        {/* Uploaded Photo Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {PHOTO_ANGLES.map((a) => {
            const isUploaded = (job.photos || []).some((p) => p.angle === a.id);

            return (
              <div
                key={a.id}
                className={`p-3 rounded-xl border text-center text-xs font-semibold ${
                  isUploaded
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] uppercase">{a.id.replace('_', ' ')}</div>
                <div className="mt-1 font-bold">{isUploaded ? '✓ Uploaded' : 'Missing'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Touch Sign-off & Handover Certificate */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PenTool className="h-5 w-5 text-amber-500" />
          Customer Walkthrough Sign-off & Handover Certificate
        </h3>

        {handoverCert ? (
          <div className="p-6 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl text-center space-y-3">
            <Award className="h-12 w-12 text-amber-400 mx-auto" />
            <h4 className="text-xl font-bold text-white">
              Installation Handover Certificate Issued
            </h4>
            <div className="font-mono text-sm text-amber-400 font-bold">
              Certificate No: {handoverCert.certificateNumber}
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              System verified under CEA standard. Solar warranty coverage and customer service terms are active!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Rating</label>
                <select
                  value={customerRating}
                  onChange={(e) => setCustomerRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5 Excellent)</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5 Good)</option>
                  <option value={3}>⭐⭐⭐ (3/5 Average)</option>
                </select>
              </div>
            </div>

            {/* Signature Canvas Pad */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-400">
                  Customer Touch / Stylus Signature *
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear Pad
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl cursor-crosshair touch-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSignHandover}
                disabled={actionLoading || !hasSignature}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm rounded-xl shadow shadow-emerald-500/20"
              >
                {actionLoading ? 'Finalizing...' : 'Sign Handover & Issue Certificate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
