import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Home,
  Zap,
  Sun,
  MapPin,
  Upload,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Check,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';
import { useAuth } from '../../../shared/context/AuthContext';

export default function CustomerInstallationRequirements({ customerId: propCustomerId, onSubmitted, isAdminReview = false }) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [requirements, setRequirements] = useState(null);

  // Form State across 5 sections
  const [formData, setFormData] = useState({
    customerId: propCustomerId || '',
    // Section 1: Property Info
    propertyType: 'Residential',
    ownershipStatus: 'Owned',
    installationLocation: 'Rooftop Terrace RCC',
    roofType: 'RCC Flat',
    roofAreaSqft: 650,
    floorsCount: 2,
    roofRestrictions: '',

    // Section 2: Electricity Details
    electricityConsumerNumber: '',
    discomName: 'Torrent Power / GUVNL',
    avgMonthlyBill: 3500,
    monthlyUnits: 450,
    connectionType: 'Single Phase',
    existingMeterDetails: 'Digital Electronic Meter',

    // Section 3: Solar Requirements
    preferredSystemType: 'On-Grid',
    requiredCapacityKw: 3.5,
    installationPurpose: 'Electricity Bill Reduction & Net Metering',
    preferredTimeline: 'Immediate (Within 1 Month)',
    batteryRequired: 'No',

    // Section 4: Site & Access Details
    fullInstallationAddress: '',
    parkingAccess: 'Street front wide access, convenient delivery unloading',
    roofAccessibility: 'Internal concrete staircase to rooftop terrace',
    nearbyObstacles: 'Clear sky, no high-rise shadow',
    specialRequirements: '',

    // Section 5: Documents
    documentsJson: {
      electricityBillUrl: '',
      propertyProofUrl: '',
      roofPhotoUrl: '',
      idProofUrl: '',
    },
  });

  useEffect(() => {
    loadData();
  }, [propCustomerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      let res;
      if (propCustomerId) {
        res = await customerSalesApi.getCustomerRequirements(propCustomerId);
      } else {
        res = await customerSalesApi.getMyRequirements();
      }

      if (res?.data) {
        setRequirements(res.data);
        setFormData({
          customerId: res.data.customer_id || propCustomerId || '',
          propertyType: res.data.property_type || 'Residential',
          ownershipStatus: res.data.ownership_status || 'Owned',
          installationLocation: res.data.installation_location || '',
          roofType: res.data.roof_type || 'RCC Flat',
          roofAreaSqft: Number(res.data.roof_area_sqft) || 600,
          floorsCount: Number(res.data.floors_count) || 1,
          roofRestrictions: res.data.roof_restrictions || '',
          electricityConsumerNumber: res.data.electricity_consumer_number || '',
          discomName: res.data.discom_name || '',
          avgMonthlyBill: Number(res.data.avg_monthly_bill) || 3000,
          monthlyUnits: Number(res.data.monthly_units) || 400,
          connectionType: res.data.connection_type || 'Single Phase',
          existingMeterDetails: res.data.existing_meter_details || '',
          preferredSystemType: res.data.preferred_system_type || 'On-Grid',
          requiredCapacityKw: Number(res.data.required_capacity_kw) || 3.0,
          installationPurpose: res.data.installation_purpose || '',
          preferredTimeline: res.data.preferred_timeline || 'Immediate',
          batteryRequired: res.data.battery_required || 'No',
          fullInstallationAddress: res.data.full_installation_address || '',
          parkingAccess: res.data.parking_access || '',
          roofAccessibility: res.data.roof_accessibility || '',
          nearbyObstacles: res.data.nearby_obstacles || '',
          specialRequirements: res.data.special_requirements || '',
          documentsJson: res.data.documents_json || {},
        });
      }
    } catch (err) {
      console.warn('Could not load existing requirements:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await customerSalesApi.saveInstallationRequirements(formData);
      setRequirements(res.data);
      setSuccess('Your comprehensive installation requirements have been submitted for engineering review!');
      if (onSubmitted) onSubmitted(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit requirements');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved by Engineering
          </span>
        );
      case 'CHANGES_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
            <RotateCcw className="h-3.5 w-3.5" /> Changes Requested
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
            <XCircle className="h-3.5 w-3.5" /> Submission Rejected
          </span>
        );
      case 'SUBMITTED':
      case 'PENDING_APPROVAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
            <Clock className="h-3.5 w-3.5" /> Under Engineering Review
          </span>
        );
    }
  };

  const SECTIONS = [
    { num: 1, label: 'Property Info', icon: Home },
    { num: 2, label: 'Electricity Details', icon: Zap },
    { num: 3, label: 'Solar Requirements', icon: Sun },
    { num: 4, label: 'Site & Access', icon: MapPin },
    { num: 5, label: 'Document Uploads', icon: Upload },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Detailed Solar Installation Requirements
              </h2>
              <p className="text-xs text-slate-500">
                Complete all 5 technical specifications so our engineering &amp; warehouse teams can draft your formal quotation.
              </p>
            </div>
          </div>
        </div>

        {requirements && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-semibold">Review Status:</span>
            {getStatusBadge(requirements.status)}
          </div>
        )}
      </div>

      {/* Review Notes Alert if Changes Requested or Rejected */}
      {requirements?.admin_notes && (
        <div className={`p-4 rounded-xl border text-xs ${
          requirements.status === 'CHANGES_REQUESTED'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : requirements.status === 'REJECTED'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <AlertCircle className="h-4 w-4" />
            Engineering Review Notes:
          </div>
          <p>{requirements.admin_notes}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-100 pb-3">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.num;
          return (
            <button
              key={sec.num}
              type="button"
              onClick={() => setActiveSection(sec.num)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{sec.num}. {sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: PROPERTY INFORMATION */}
        {activeSection === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Home className="h-4 w-4 text-emerald-600" />
              Section 1: Property Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Property Type</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Residential">Residential (Home / Villa)</option>
                  <option value="Commercial">Commercial (Office / Shop)</option>
                  <option value="Industrial">Industrial (Factory / Shed)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Ownership Status</label>
                <select
                  value={formData.ownershipStatus}
                  onChange={(e) => setFormData({ ...formData, ownershipStatus: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Owned">Owned (Sole Owner)</option>
                  <option value="Rented">Rented (NOC Available)</option>
                  <option value="Leased">Leased (Long-term Lease)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Installation Location</label>
                <input
                  type="text"
                  value={formData.installationLocation}
                  onChange={(e) => setFormData({ ...formData, installationLocation: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Rooftop Terrace RCC, Ground Mount"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Roof Surface Type</label>
                <select
                  value={formData.roofType}
                  onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="RCC Flat">Flat Reinforced Concrete (RCC)</option>
                  <option value="Metal Sheet">Slanted Tin / Metal Sheet</option>
                  <option value="Mangalore Tiles">Clay / Mangalore Tiled</option>
                  <option value="Elevated Structure">Elevated Solar Pergola / Gazebo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Available Roof Area (Sq Ft)</label>
                <input
                  type="number"
                  min="50"
                  max="50000"
                  value={formData.roofAreaSqft}
                  onChange={(e) => setFormData({ ...formData, roofAreaSqft: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Approx. 600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Building Floors Count</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.floorsCount}
                  onChange={(e) => setFormData({ ...formData, floorsCount: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Roof Restrictions / Known Obstacles</label>
              <textarea
                rows="2"
                value={formData.roofRestrictions}
                onChange={(e) => setFormData({ ...formData, roofRestrictions: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                placeholder="Water tanks, mobile towers, tall trees or stair cabin shadows..."
              />
            </div>
          </div>
        )}

        {/* SECTION 2: ELECTRICITY DETAILS */}
        {activeSection === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Section 2: Electricity &amp; Grid Connection Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Electricity Consumer Number</label>
                <input
                  type="text"
                  value={formData.electricityConsumerNumber}
                  onChange={(e) => setFormData({ ...formData, electricityConsumerNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Found on top of your utility bill"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">DISCOM / Electricity Provider</label>
                <input
                  type="text"
                  value={formData.discomName}
                  onChange={(e) => setFormData({ ...formData, discomName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Torrent Power / UGVCL / PGVCL"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Connection Phase Type</label>
                <select
                  value={formData.connectionType}
                  onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Single Phase">Single Phase (1-Phase 230V)</option>
                  <option value="Three Phase">Three Phase (3-Phase 415V)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Average Monthly Bill (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.avgMonthlyBill}
                  onChange={(e) => setFormData({ ...formData, avgMonthlyBill: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="₹ 3,500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Monthly Unit Consumption (kWh / Units)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.monthlyUnits}
                  onChange={(e) => setFormData({ ...formData, monthlyUnits: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="400 Units"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Existing Meter Details</label>
                <input
                  type="text"
                  value={formData.existingMeterDetails}
                  onChange={(e) => setFormData({ ...formData, existingMeterDetails: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="Smart Meter / Analog / Bi-directional"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: SOLAR SYSTEM REQUIREMENTS */}
        {activeSection === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-emerald-600" />
              Section 3: Solar System Requirements
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Preferred System Type</label>
                <select
                  value={formData.preferredSystemType}
                  onChange={(e) => setFormData({ ...formData, preferredSystemType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="On-Grid">On-Grid (Grid-Tied with Net Metering &amp; Subsidy)</option>
                  <option value="Hybrid">Hybrid (Grid-Tied with Battery Storage Backup)</option>
                  <option value="Off-Grid">Off-Grid (Standalone with Heavy Battery Bank)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Required Capacity (kW)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="100"
                  value={formData.requiredCapacityKw}
                  onChange={(e) => setFormData({ ...formData, requiredCapacityKw: parseFloat(e.target.value) || 1 })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Battery Storage Required?</label>
                <select
                  value={formData.batteryRequired}
                  onChange={(e) => setFormData({ ...formData, batteryRequired: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="No">No (Pure On-Grid Solar, Maximum ROI)</option>
                  <option value="Yes - 5 kWh">Yes - 5 kWh Lithium Battery</option>
                  <option value="Yes - 10 kWh">Yes - 10 kWh Lithium Battery</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Primary Purpose</label>
                <input
                  type="text"
                  value={formData.installationPurpose}
                  onChange={(e) => setFormData({ ...formData, installationPurpose: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Zero Electricity Bill, Green Energy, Commercial Savings"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Target Installation Timeline</label>
                <select
                  value={formData.preferredTimeline}
                  onChange={(e) => setFormData({ ...formData, preferredTimeline: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Immediate (Within 1 Month)">Immediate (Within 1 Month)</option>
                  <option value="1 to 3 Months">1 to 3 Months</option>
                  <option value="Planning for Next Quarter">Planning for Next Quarter</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: SITE & INSTALLATION DETAILS */}
        {activeSection === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" />
              Section 4: Site Access &amp; Installation Logistics
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Full Installation Address &amp; Landmarks</label>
                <textarea
                  rows="2"
                  value={formData.fullInstallationAddress}
                  onChange={(e) => setFormData({ ...formData, fullInstallationAddress: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="House number, street, society, landmark, city, state, pincode"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700">Parking &amp; Material Unloading Access</label>
                  <input
                    type="text"
                    value={formData.parkingAccess}
                    onChange={(e) => setFormData({ ...formData, parkingAccess: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Wide street for truck delivery, dedicated driveway"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Roof Accessibility Method</label>
                  <input
                    type="text"
                    value={formData.roofAccessibility}
                    onChange={(e) => setFormData({ ...formData, roofAccessibility: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Concrete stairs, external metal ladder"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Nearby Obstacles &amp; Shadow Notes</label>
                <input
                  type="text"
                  value={formData.nearbyObstacles}
                  onChange={(e) => setFormData({ ...formData, nearbyObstacles: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Tall building on east side, clear southern exposure"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Special Technical Requests / Notes</label>
                <textarea
                  rows="2"
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Elevate panels 6 feet for terrace garden walking space..."
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: DOCUMENT UPLOADS */}
        {activeSection === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-purple-600" />
              Section 5: Verification Documents &amp; Site Photos
            </h3>
            <p className="text-xs text-slate-500">
              Attach links or URLs to your recent utility bill and site photos to fast-track government subsidy and engineering sign-off.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="font-semibold text-slate-800 block mb-1">Electricity Bill Document Link</label>
                <input
                  type="text"
                  value={formData.documentsJson.electricityBillUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      documentsJson: { ...formData.documentsJson, electricityBillUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="https://... or Google Drive / Cloudinary Link"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Needed for DISCOM load verification &amp; Net Metering liaison</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="font-semibold text-slate-800 block mb-1">Rooftop Panoramic Photo Link</label>
                <input
                  type="text"
                  value={formData.documentsJson.roofPhotoUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      documentsJson: { ...formData.documentsJson, roofPhotoUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="https://... or photo upload link"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Used by engineering lead to determine azimuth &amp; tilt</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="font-semibold text-slate-800 block mb-1">Property Ownership Proof / Tax Receipt</label>
                <input
                  type="text"
                  value={formData.documentsJson.propertyProofUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      documentsJson: { ...formData.documentsJson, propertyProofUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="https://... index-II or property tax receipt"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">PM Surya Ghar subsidy eligibility mandate</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="font-semibold text-slate-800 block mb-1">Aadhaar / Identity Proof</label>
                <input
                  type="text"
                  value={formData.documentsJson.idProofUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      documentsJson: { ...formData.documentsJson, idProofUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                  placeholder="https://... identity proof copy"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Government portal applicant registration</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Submit Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {activeSection > 1 && (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection - 1)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                &larr; Previous Section
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeSection < 5 ? (
              <button
                type="button"
                onClick={() => setActiveSection(activeSection + 1)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
              >
                Next Section &rarr;
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {saving ? 'Saving...' : 'Submit Complete Specifications'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
