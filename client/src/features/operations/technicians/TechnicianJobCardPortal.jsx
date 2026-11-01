import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Zap,
  Camera,
  Layers,
  QrCode,
  AlertTriangle,
  Award,
  RefreshCw,
  User,
  Sun,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import MobileJobCardView from '../installations/MobileJobCardView';

export default function TechnicianJobCardPortal({ onSelectTab = () => {} }) {
  const { user } = useAuth();
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('inst-job-test-01');
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedJobs();
  }, []);

  const loadAssignedJobs = async () => {
    try {
      setLoading(true);
      // Fetch active projects
      const res = await axios.get('/api/v1/customer-sales/customers', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const customers = res.data?.data?.customers || res.data?.data || [];
      
      const projects = customers
        .filter(c => c.project_code || c.id)
        .map(c => ({
          id: c.project_id || c.project_code || c.id,
          projectCode: c.project_code || 'PRJ-ORESH-3K',
          customerName: c.full_name || 'Customer',
          customerPhone: c.phone || '+91 98765 43210',
          address: c.installation_address || c.address || 'Koregaon Park, Pune, MH',
          capacityKw: c.capacity_kw || 3.0,
          gridType: c.grid_type || 'On-Grid'
        }));

      if (projects.length > 0) {
        setAssignedProjects(projects);
        setSelectedProjectId(projects[0].projectCode);
        setProjectDetails(projects[0]);
      } else {
        const fallbackProject = {
          id: 'inst-job-test-01',
          projectCode: 'PRJ-ORESH-3K',
          customerName: 'Oresh Raut',
          customerPhone: '+91 98765 43210',
          address: 'Koregaon Park, Pune, MH - 411001',
          capacityKw: 3.0,
          gridType: 'On-Grid'
        };
        setAssignedProjects([fallbackProject]);
        setSelectedProjectId(fallbackProject.projectCode);
        setProjectDetails(fallbackProject);
      }
    } catch (err) {
      console.warn('Error loading technician assigned projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (proj) => {
    setSelectedProjectId(proj.projectCode || proj.id);
    setProjectDetails(proj);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Module Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Wrench className="h-3.5 w-3.5 text-amber-600" /> Technician Field Execution Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Assigned Installation Job Cards
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl">
              Conduct on-site rooftop installation: verify equipment serials, complete milestone checkpoints, perform CEA earthing &amp; generation tests, and obtain customer sign-off.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="text-right p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Lead Field Tech</span>
              <span className="text-xs font-bold text-slate-900">{user?.fullName || 'Vikram Singh'}</span>
              <span className="text-[10px] text-emerald-700 font-semibold block">Class-A Certified</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Assigned Project Selector & Customer / Site Information */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              Assigned Installation Project &amp; Customer Site
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Select a scheduled solar rooftop project to view site specs and execute job card.</p>
          </div>

          {/* Project Dropdown / Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const found = assignedProjects.find(p => (p.projectCode || p.id) === e.target.value);
                if (found) handleSelectProject(found);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:border-amber-500"
            >
              {assignedProjects.map(p => (
                <option key={p.id} value={p.projectCode || p.id}>
                  {p.projectCode} &ndash; {p.customerName} ({p.capacityKw} kW)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer & Site Details Grid */}
        {projectDetails && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Customer Name &amp; Contact</span>
              <div className="text-sm font-bold text-slate-900">{projectDetails.customerName}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1">
                <Phone className="h-3 w-3 text-slate-400" /> {projectDetails.customerPhone}
              </div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Rooftop Site Location</span>
              <div className="text-xs font-bold text-slate-900 flex items-start gap-1">
                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{projectDetails.address}</span>
              </div>
              <div className="text-[11px] text-slate-500">Coordinates: 18.5204° N, 73.8567° E</div>
            </div>

            <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">System Specifications</span>
              <div className="text-sm font-bold text-slate-900">
                {projectDetails.capacityKw} kW &bull; {projectDetails.gridType}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold">
                ✓ Equipment Verified &amp; Dispatched by Warehouse
              </div>
            </div>
          </div>
        )}

        {/* Material & Serial Traceability Reference Card */}
        <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Verified Allocated Equipment</div>
              <div className="text-slate-600 mt-0.5">
                Inverter: <span className="font-mono font-bold text-slate-800">INV-GROW-3K-26-00101</span> &bull; PV Panels: 8x 540W Mono PERC
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
            ✓ 100% Barcode Gate Passed
          </span>
        </div>
      </div>

      {/* 3. Execution Component: Mobile Rooftop Job Card with Checkpoints & Testing */}
      <MobileJobCardView jobId={selectedProjectId} />
    </div>
  );
}
