import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  Zap,
  CheckCircle,
  XCircle,
  GitMerge,
  MessageSquare,
  AlertTriangle,
  Calendar,
  X,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';

export default function EnquiryManagement({ onNavigateToSurvey }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isQualifyOpen, setIsQualifyOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isDisqualifyOpen, setIsDisqualifyOpen] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'WEB',
    priority: 'MEDIUM',
    estimatedMonthlyBill: 3000,
    estimatedRoofAreaSqft: 400,
    gridTypePreference: 'On-Grid',
    interestedCapacityKw: 3,
    notes: '',
  });

  const [followUpForm, setFollowUpForm] = useState({
    callSummary: '',
    outcome: 'Interested in 3 kW system',
    nextFollowUp: '',
  });

  const [qualifyForm, setQualifyForm] = useState({
    estimatedRoofAreaSqft: 450, // [NC-013]
    estimatedMonthlyBill: 3500, // [NC-014]
    sanctionedLoadKw: 5,
    addressStreet: '',
    addressCity: 'Ahmedabad',
    addressPincode: '380015',
  });

  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [mergePrimaryId, setMergePrimaryId] = useState('');

  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => {
    loadEnquiries();
  }, [activeStatusTab, search]);

  const loadEnquiries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeStatusTab !== 'ALL') params.status = activeStatusTab;
      if (search) params.search = search;
      const res = await customerSalesApi.listEnquiries(params);
      setEnquiries(res.data || []);
    } catch {
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEnquiry = async (e) => {
    e.preventDefault();
    try {
      const res = await customerSalesApi.createEnquiry(createForm);
      if (res.data.isDuplicate) {
        setFeedbackMessage({
          type: 'warning',
          text: `Enquiry logged with duplicate alert! Phone matches existing lead (Enquiry ID: ${res.data.duplicateRecord?.enquiry_number}).`,
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: `Enquiry ${res.data.enquiry.enquiry_number} created successfully!`,
        });
      }
      setIsCreateOpen(false);
      loadEnquiries();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to create enquiry',
      });
    }
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await customerSalesApi.recordFollowUp(selectedEnquiry.id, followUpForm);
      setFeedbackMessage({ type: 'success', text: 'Follow-up interaction recorded successfully.' });
      setIsFollowUpOpen(false);
      loadEnquiries();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record follow-up' });
    }
  };

  const handleQualify = async (e) => {
    e.preventDefault();
    try {
      const res = await customerSalesApi.qualifyEnquiry(selectedEnquiry.id, qualifyForm);
      setFeedbackMessage({
        type: 'success',
        text: `Lead qualified! Authoritative customer profile established (${res.data.customer.customer_code}). Ready for Site Survey.`,
      });
      setIsQualifyOpen(false);
      loadEnquiries();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Qualification failed' });
    }
  };

  const handleDisqualify = async (e) => {
    e.preventDefault();
    try {
      await customerSalesApi.disqualifyEnquiry(selectedEnquiry.id, disqualifyReason);
      setFeedbackMessage({ type: 'success', text: 'Enquiry marked as Disqualified.' });
      setIsDisqualifyOpen(false);
      loadEnquiries();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Failed to disqualify' });
    }
  };

  const handleMerge = async (e) => {
    e.preventDefault();
    try {
      await customerSalesApi.mergeEnquiry(selectedEnquiry.id, {
        primaryEnquiryId: mergePrimaryId,
        notes: 'Merged via sales duplicate resolution',
      });
      setFeedbackMessage({ type: 'success', text: 'Duplicate enquiry successfully merged into primary record.' });
      setIsMergeOpen(false);
      loadEnquiries();
    } catch (err) {
      setFeedbackMessage({ type: 'error', text: err.response?.data?.message || 'Merge failed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Inbox className="h-5 w-5 text-amber-500" />
            Solar Enquiry &amp; Lead Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Omnichannel lead capture (Web, WhatsApp, Calls), automated duplicate screening, and preliminary qualification.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56"
            />
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
          >
            <Plus className="h-4 w-4" />
            New Inbound Lead
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED', 'MERGED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveStatusTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeStatusTab === tab
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Enquiry Cards / Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Enquiry ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Est. Bill / Roof Area</th>
                <th className="py-3 px-4">Status &amp; Flags</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    Loading lead database...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    No leads found matching current filter.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">{enq.enquiry_number}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {enq.full_name}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {enq.grid_type_preference} &bull; {enq.interested_capacity_kw || 3} kW
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="h-3 w-3 text-slate-500" /> {enq.phone}
                        </span>
                        {enq.email && (
                          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="h-3 w-3 text-slate-600" /> {enq.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">
                        {enq.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">₹{enq.estimated_monthly_bill || '—'} / mo</span>
                        <span className="text-slate-500 text-[11px]">{enq.estimated_roof_area_sqft || '—'} sq ft roof</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            enq.status === 'NEW'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : enq.status === 'CONTACTED'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : enq.status === 'QUALIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : enq.status === 'DISQUALIFIED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {enq.status}
                        </span>

                        {enq.duplicate_of_id && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> DUPLICATE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedEnquiry(enq);
                            setIsFollowUpOpen(true);
                          }}
                          title="Record Phone Follow-up"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>

                        {enq.status !== 'QUALIFIED' && enq.status !== 'DISQUALIFIED' && enq.status !== 'MERGED' && (
                          <button
                            onClick={() => {
                              setSelectedEnquiry(enq);
                              setQualifyForm({
                                estimatedRoofAreaSqft: enq.estimated_roof_area_sqft || 450,
                                estimatedMonthlyBill: enq.estimated_monthly_bill || 3500,
                                sanctionedLoadKw: 5,
                                addressStreet: '',
                                addressCity: 'Ahmedabad',
                                addressPincode: '380015',
                              });
                              setIsQualifyOpen(true);
                            }}
                            title="Screen & Qualify Lead"
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Qualify
                          </button>
                        )}

                        {enq.duplicate_of_id && (
                          <button
                            onClick={() => {
                              setSelectedEnquiry(enq);
                              setMergePrimaryId(enq.duplicate_of_id);
                              setIsMergeOpen(true);
                            }}
                            title="Resolve & Merge Duplicate"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition"
                          >
                            <GitMerge className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Preliminary Screening & Lead Qualification */}
      {isQualifyOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-500" />
                Preliminary Lead Screening &amp; Qualification
              </h3>
              <button onClick={() => setIsQualifyOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Section 3 Invariant: Before scheduling a site visit, sales verifies basic technical feasibility: usable
              shadow-free roof space and electricity bill. Qualifying this lead will automatically establish an authoritative
              customer account.
            </p>

            <form onSubmit={handleQualify} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Shadow-Free Roof Area (sq ft) * [NC-013]
                  </label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={qualifyForm.estimatedRoofAreaSqft}
                    onChange={(e) => setQualifyForm({ ...qualifyForm, estimatedRoofAreaSqft: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Benchmark: Min 100 sq ft for 1 kW</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Monthly Electricity Bill (₹) * [NC-014]
                  </label>
                  <input
                    type="number"
                    min="1500"
                    required
                    value={qualifyForm.estimatedMonthlyBill}
                    onChange={(e) => setQualifyForm({ ...qualifyForm, estimatedMonthlyBill: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Benchmark: Min ₹1,500/mo for viable ROI</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Installation Street Address</label>
                <input
                  type="text"
                  required
                  value={qualifyForm.addressStreet}
                  onChange={(e) => setQualifyForm({ ...qualifyForm, addressStreet: e.target.value })}
                  placeholder="Plot / Society address for surveyor"
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Sanctioned Utility Load (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={qualifyForm.sanctionedLoadKw}
                    onChange={(e) => setQualifyForm({ ...qualifyForm, sanctionedLoadKw: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">City</label>
                  <input
                    type="text"
                    value={qualifyForm.addressCity}
                    onChange={(e) => setQualifyForm({ ...qualifyForm, addressCity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQualifyOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Confirm Technical Qualification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Follow-up Logger */}
      {isFollowUpOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Phone className="h-5 w-5 text-amber-500" />
                Log Customer Phone Call / Interaction
              </h3>
              <button onClick={() => setIsFollowUpOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFollowUp} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Discussion Summary *</label>
                <textarea
                  rows="3"
                  required
                  value={followUpForm.callSummary}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, callSummary: e.target.value })}
                  placeholder="Notes from customer call..."
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Call Outcome *</label>
                  <input
                    type="text"
                    required
                    value={followUpForm.outcome}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, outcome: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Next Scheduled Follow-up</label>
                  <input
                    type="datetime-local"
                    value={followUpForm.nextFollowUp}
                    onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUp: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFollowUpOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Save Call Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Inbound Lead */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-amber-500" />
                Log Inbound Solar Enquiry
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Lead Source</label>
                  <select
                    value={createForm.source}
                    onChange={(e) => setCreateForm({ ...createForm, source: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="WEB">Web Form</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="PHONE_CALL">Inbound Call</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="WALK_IN">Walk-In</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Grid Type</label>
                  <select
                    value={createForm.gridTypePreference}
                    onChange={(e) => setCreateForm({ ...createForm, gridTypePreference: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="On-Grid">On-Grid</option>
                    <option value="Off-Grid">Off-Grid (Battery)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Interested kW</label>
                  <select
                    value={createForm.interestedCapacityKw}
                    onChange={(e) => setCreateForm({ ...createForm, interestedCapacityKw: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={1}>1 kW</option>
                    <option value={2}>2 kW</option>
                    <option value={3}>3 kW (Most Popular)</option>
                    <option value={4}>4 kW</option>
                    <option value={5}>5 kW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Monthly Electricity Bill (₹)</label>
                  <input
                    type="number"
                    value={createForm.estimatedMonthlyBill}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedMonthlyBill: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Estimated Roof Area (sq ft)</label>
                  <input
                    type="number"
                    value={createForm.estimatedRoofAreaSqft}
                    onChange={(e) => setCreateForm({ ...createForm, estimatedRoofAreaSqft: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
