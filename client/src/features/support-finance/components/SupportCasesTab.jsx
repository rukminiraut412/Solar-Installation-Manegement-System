import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  User, 
  Wrench, 
  Send, 
  Lock, 
  Eye, 
  EyeOff, 
  FileText, 
  CheckSquare, 
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';

const CHAIN_STAGES = [
  { id: 'AI_TRIAGE', label: '1. AI Triage', desc: 'Initial classification & safety scan' },
  { id: 'SUPPORT_REVIEW', label: '2. Support Review', desc: 'Classification confirmation' },
  { id: 'ADMIN_APPROVAL', label: '3. Admin Assignment', desc: 'Tech allocation & dispatch' },
  { id: 'TECHNICIAN_WORK', label: '4. Tech Work', desc: 'Site visit & repair findings' },
  { id: 'EVIDENCE_REVIEW', label: '5. Support Review', desc: 'Review completed tech work' },
  { id: 'CUSTOMER_CONFIRMATION', label: '6. Customer Confirm', desc: 'Customer verifies resolution' },
  { id: 'CLOSED', label: '7. Closed', desc: 'Case resolved & archived' },
];

export default function SupportCasesTab({ currentRole }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // New Case Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCustomerId, setNewCustomerId] = useState('CUST-8801');
  const [newProjectId, setNewProjectId] = useState('PRJ-7701');

  // Message Input State
  const [msgContent, setMsgContent] = useState('');
  const [msgType, setMsgType] = useState('CUSTOMER_VISIBLE');

  // Action forms
  const [techFindings, setTechFindings] = useState('');
  const [techParts, setTechParts] = useState('');
  const [coverageDecision, setCoverageDecision] = useState('COVERED');
  const [chargeDesc, setChargeDesc] = useState('Field diagnosis & testing');
  const [chargeAmountRupees, setChargeAmountRupees] = useState('1500');

  useEffect(() => {
    loadCases();
  }, [currentRole]);

  async function loadCases() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCases(currentRole);
      setCases(res.cases || []);
      if (selectedCase) {
        const updated = (res.cases || []).find(c => c.id === selectedCase.id);
        if (updated) setSelectedCase(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCase(c) {
    setSelectedCase(c);
    setWarrantyInfo(null);
    try {
      const res = await api.getCaseById(c.id, currentRole);
      setSelectedCase(res.case);
      // Fetch associated service ticket if available
      try {
        const ticketRes = await api.getTicketByCaseId(c.id, currentRole);
        setSelectedTicket(ticketRes.ticket);
      } catch (tErr) {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Safety trigger detection for form input
  const isHazardousDraft = /(fire|smoke|burning|shock|spark|explosion|flame)/i.test(`${newTitle} ${newDescription}`);

  async function handleCreateCase(e) {
    e.preventDefault();
    try {
      const res = await api.createCase({
        title: newTitle,
        description: newDescription,
        customer_id: newCustomerId,
        project_id: newProjectId
      }, currentRole);
      
      setShowNewModal(false);
      setNewTitle('');
      setNewDescription('');
      await loadCases();
      if (res.case) {
        handleSelectCase(res.case);
      }
    } catch (err) {
      alert(`Failed to create case: ${err.message}`);
    }
  }

  async function handlePostMessage(e) {
    e.preventDefault();
    if (!msgContent.trim() || !selectedCase) return;
    try {
      await api.postMessage(selectedCase.id, {
        content: msgContent,
        message_type: msgType
      }, currentRole);
      setMsgContent('');
      handleSelectCase(selectedCase);
      loadCases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleClassify(priority, category) {
    if (!selectedCase) return;
    try {
      await api.classifyCase(selectedCase.id, { priority, category }, currentRole);
      handleSelectCase(selectedCase);
      loadCases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAssignTech() {
    if (!selectedCase) return;
    try {
      await api.assignTechnician(selectedCase.id, {
        technician_id: 'TECH-101',
        technician_name: 'Vikram Joshi (Senior Electrical Tech)',
        scheduled_date: new Date(Date.now() + 86400000).toISOString()
      }, currentRole);
      handleSelectCase(selectedCase);
      loadCases();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleTechnicianComplete() {
    if (!selectedCase) return;
    try {
      await api.completeTechnicianWork(selectedCase.id, {
        findings: techFindings || 'Inverter thermal sensor recalibrated and DC isolator checked.',
        parts_replaced: techParts ? [techParts] : ['DC Fuses 15A']
      }, currentRole);
      setTechFindings('');
      setTechParts('');
      handleSelectCase(selectedCase);
      loadCases();
      alert('Technician work submitted for Support Review. Status updated to PENDING_SUPPORT_REVIEW.');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCustomerConfirmation(confirmed) {
    if (!selectedCase) return;
    try {
      const res = await api.customerConfirmation(selectedCase.id, {
        confirmed,
        feedback: confirmed ? 'System is generating expected power. Good work.' : 'Still hearing intermittent buzz sound from inverter.'
      }, currentRole);
      handleSelectCase(selectedCase);
      loadCases();
      alert(res.message);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleCloseCase() {
    if (!selectedCase) return;
    try {
      await api.closeCase(selectedCase.id, {
        resolution_notes: 'Issue resolved and verified by customer.'
      }, currentRole);
      handleSelectCase(selectedCase);
      loadCases();
      alert('Case successfully closed.');
    } catch (err) {
      alert(`Cannot close case: ${err.message}`);
    }
  }

  async function handleWarrantyLookup() {
    if (!selectedTicket) return;
    try {
      const res = await api.lookupWarranty(selectedTicket.id, currentRole);
      setWarrantyInfo(res.warranty);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSetCoverage(decision) {
    if (!selectedTicket) return;
    try {
      const res = await api.setCoverageDecision(selectedTicket.id, {
        coverage_decision: decision,
        reason: `Determined based on component warranty terms (${decision})`
      }, currentRole);
      setSelectedTicket(res.ticket);
      alert(`Warranty coverage decision set to ${decision}`);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddCharge(e) {
    e.preventDefault();
    if (!selectedTicket) return;
    const amountPaise = Math.round(parseFloat(chargeAmountRupees) * 100);
    try {
      const res = await api.addServiceCharge(selectedTicket.id, {
        description: chargeDesc,
        amount_paise: amountPaise,
        tax_rate: 18
      }, currentRole);
      setSelectedTicket(res.ticket);
      alert('Service charge added successfully.');
    } catch (err) {
      alert(`PRE-BILLING GUARD BLOCKED: ${err.message}`);
    }
  }

  // Filter cases
  const filteredCases = cases.filter(c => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'P1') return c.priority === 'P1';
    if (activeFilter === 'OPEN') return c.status !== 'CLOSED' && c.status !== 'RESOLVED';
    if (activeFilter === 'PENDING_REVIEW') return c.status.includes('REVIEW') || c.status.includes('APPROVAL');
    return true;
  });

  const p1Cases = cases.filter(c => c.priority === 'P1' && c.status !== 'CLOSED');

  return (
    <div className="space-y-6">
      {/* Top Bar with P1 Alert & New Case Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <LifeBuoy className="w-7 h-7 text-solar-blue" />
            Support Cases & Service Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            7-Stage AI-First Chain: AI Triage &rarr; Support &rarr; Admin &rarr; Tech &rarr; Support &rarr; Customer Confirm &rarr; Close
          </p>
        </div>

        <button 
          onClick={() => setShowNewModal(true)}
          className="bg-solar-blue hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Log New Support Case</span>
        </button>
      </div>

      {/* Safety Alert Banner if any P1 Case exists */}
      {p1Cases.length > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-red-900 flex items-start gap-3 shadow-md">
          <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 animate-pulse mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-red-800 uppercase tracking-wider text-xs">
              CRITICAL SAFETY ALERT &bull; {p1Cases.length} P1 EMERGENCY CASE PINNED
            </h4>
            <p className="text-sm text-red-700 mt-0.5">
              Hazardous electrical conditions detected (fire, smoke, or live arc danger). Immediate field triage required. Customer has been advised not to touch solar equipment.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Queue & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Case Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tickets ({filteredCases.length})
            </div>
            <div className="flex items-center gap-1">
              {['ALL', 'P1', 'OPEN', 'PENDING_REVIEW'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`text-xs px-2.5 py-1 rounded transition ${
                    activeFilter === tab 
                      ? 'bg-solar-blue text-white font-semibold' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500">
              No cases matching filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCases.map(c => {
                const isSelected = selectedCase?.id === c.id;
                const isP1 = c.priority === 'P1';

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    className={`cursor-pointer rounded-lg p-4 border transition ${
                      isP1 
                        ? 'border-red-400 bg-red-50/40 hover:bg-red-50' 
                        : isSelected
                          ? 'border-solar-blue bg-blue-50/30'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                          c.priority === 'P1' ? 'bg-red-600 text-white' :
                          c.priority === 'P2' ? 'bg-orange-100 text-orange-800' :
                          c.priority === 'P3' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-xs font-mono font-semibold text-gray-500">{c.id}</span>
                        {c.safety_flag && (
                          <span className="flex items-center gap-1 text-[11px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                            <Zap className="w-3 h-3 text-red-600" /> Safety
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                        c.status === 'CLOSED' ? 'bg-gray-200 text-gray-700' :
                        c.status.includes('PENDING') ? 'bg-amber-100 text-amber-800' :
                        c.status === 'INVESTIGATING' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="font-semibold text-ink text-sm mt-2 line-clamp-1">{c.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Customer: {c.customer_id}</span>
                      <span className="font-mono">SLA: {c.sla_hours}h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Detailed Case View & Workflow Actions */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">
                      {selectedCase.id}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      selectedCase.priority === 'P1' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedCase.priority}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      {selectedCase.category}
                    </span>
                    {selectedCase.safety_flag && (
                      <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> SAFETY HAZARD
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-ink mt-2">{selectedCase.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: {selectedCase.customer_id} &bull; Project: {selectedCase.project_id} &bull; Opened: {new Date(selectedCase.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-500 font-mono">STATUS</div>
                  <div className="font-bold text-solar-blue text-sm uppercase tracking-wide">
                    {selectedCase.status.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* 7-Stage Responsibility Chain Graphic */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  7-Stage Support Chain Progression
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                  {CHAIN_STAGES.map((s, idx) => {
                    const isPassed = idx <= getStageIndex(selectedCase.status);
                    const isCurrent = idx === getStageIndex(selectedCase.status);
                    return (
                      <div 
                        key={s.id} 
                        className={`p-2 rounded border text-xs flex flex-col items-center justify-between ${
                          isCurrent 
                            ? 'bg-solar-blue text-white border-solar-blue font-bold shadow-sm' 
                            : isPassed 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-white text-gray-400 border-gray-200'
                        }`}
                      >
                        <span className="text-[10px] leading-tight font-semibold">{s.label}</span>
                        {isPassed && !isCurrent ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-1" />
                        ) : isCurrent ? (
                          <Clock className="w-3.5 h-3.5 text-white animate-spin mt-1" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-gray-200 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Description & AI Triage Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Customer Issue Description</h4>
                <div className="bg-gray-50 p-3 rounded text-sm text-gray-800 border border-gray-200">
                  {selectedCase.description}
                </div>
              </div>

              {/* Safety Interceptor Warning Box */}
              {selectedCase.safety_notice && (
                <div className="bg-red-50 border border-red-300 p-3.5 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wide">
                      Mandatory Safety Notice Provided To Customer
                    </span>
                    <p className="text-xs text-red-700 mt-1">{selectedCase.safety_notice}</p>
                  </div>
                </div>
              )}

              {/* Message Thread (Customer vs Internal Team Notes) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Communication Thread ({selectedCase.messages?.length || 0})
                  </h4>
                  <span className="text-[11px] text-gray-400 italic">
                    {currentRole === 'Customer' ? 'Internal team notes are hidden from your view' : 'Team notes have a yellow badge'}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto p-3 space-y-2 bg-gray-50/50">
                  {(!selectedCase.messages || selectedCase.messages.length === 0) ? (
                    <div className="text-xs text-gray-400 text-center py-4">No messages logged yet.</div>
                  ) : (
                    selectedCase.messages.map(m => {
                      const isInternal = m.message_type === 'INTERNAL_NOTE';
                      return (
                        <div 
                          key={m.id} 
                          className={`p-3 rounded-lg text-xs border ${
                            isInternal 
                              ? 'bg-amber-50 border-amber-200 text-amber-900' 
                              : 'bg-white border-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold mb-1">
                            <span className="flex items-center gap-1.5">
                              {isInternal ? <Lock className="w-3 h-3 text-amber-700" /> : <User className="w-3 h-3 text-gray-500" />}
                              {m.sender_name} ({m.sender_role})
                            </span>
                            <div className="flex items-center gap-2">
                              {isInternal && (
                                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                  INTERNAL NOTE (NOT VISIBLE TO CUSTOMER)
                                </span>
                              )}
                              <span className="text-gray-400 font-mono text-[10px]">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={handlePostMessage} className="space-y-2">
                  <textarea
                    rows={2}
                    value={msgContent}
                    onChange={(e) => setMsgContent(e.target.value)}
                    placeholder="Type an update or note..."
                    className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-solar-blue focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    {currentRole !== 'Customer' ? (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="msgType"
                            checked={msgType === 'CUSTOMER_VISIBLE'}
                            onChange={() => setMsgType('CUSTOMER_VISIBLE')}
                          />
                          Customer Visible
                        </label>
                        <label className="text-xs text-amber-800 flex items-center gap-1 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="msgType"
                            checked={msgType === 'INTERNAL_NOTE'}
                            onChange={() => setMsgType('INTERNAL_NOTE')}
                          />
                          <Lock className="w-3 h-3" /> Internal Team Note
                        </label>
                      </div>
                    ) : <div />}

                    <button
                      type="submit"
                      disabled={!msgContent.trim()}
                      className="bg-solar-blue text-white text-xs px-3 py-1.5 rounded-md font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" /> Post Note
                    </button>
                  </div>
                </form>
              </div>

              {/* Role-Specific Action Controls */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Workflow & Role Actions (Active Role: {currentRole})
                </div>

                {/* Support Role Controls */}
                {(currentRole === 'Support' || currentRole === 'Admin') && (
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-blue-900">Support Team Classification Override</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => handleClassify('P1', 'ELECTRICAL_SAFETY')}
                        className="text-xs px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                      >
                        Escalate to P1 Hazard
                      </button>
                      <button 
                        onClick={() => handleClassify('P2', 'SYSTEM_DOWN')}
                        className="text-xs px-2.5 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 font-medium"
                      >
                        Set P2 Inverter Down
                      </button>
                      <button 
                        onClick={() => handleClassify('P3', 'PERFORMANCE_ISSUE')}
                        className="text-xs px-2.5 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-medium"
                      >
                        Set P3 Generation Drop
                      </button>
                    </div>
                  </div>
                )}

                {/* Admin Assignment */}
                {currentRole === 'Admin' && (
                  <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-3 space-y-2">
                    <div className="text-xs font-semibold text-purple-900">Admin Approval & Field Dispatch</div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={handleAssignTech}
                        className="text-xs px-3 py-1.5 bg-purple-700 text-white rounded font-medium hover:bg-purple-800 flex items-center gap-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Dispatch Vikram Joshi (Technician)
                      </button>
                      <span className="text-xs text-gray-500">
                        Assigned: {selectedCase.assigned_to_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Technician Work Submission */}
                {(currentRole === 'Technician' || currentRole === 'Admin') && (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-900">Technician On-Site Findings & Resolution</div>
                      <span className="text-[11px] text-emerald-700 italic">
                        Note: Tech work submits to Support Review. Techs cannot close cases directly (§15.8).
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Diagnosis findings (e.g. Loose DC terminal tightened)"
                        value={techFindings}
                        onChange={(e) => setTechFindings(e.target.value)}
                        className="text-xs p-2 border border-emerald-300 rounded focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Parts replaced (e.g. 15A DC Fuse)"
                        value={techParts}
                        onChange={(e) => setTechParts(e.target.value)}
                        className="text-xs p-2 border border-emerald-300 rounded focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleTechnicianComplete}
                      className="text-xs px-3 py-1.5 bg-emerald-700 text-white rounded font-medium hover:bg-emerald-800 flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Submit Work for Support Review
                    </button>
                  </div>
                )}

                {/* Customer Confirmation or Dispute */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-amber-900">Customer Resolution Confirmation Gate</div>
                    <span className="text-[11px] font-mono font-bold text-amber-800">
                      Confirmed by Customer: {selectedCase.customer_confirmed ? 'YES (VERIFIED)' : 'NO (PENDING)'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Per §15.8, a case cannot be closed until the customer explicitly verifies the repair. If customer disputes, case automatically reopens.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCustomerConfirmation(true)}
                      className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Confirm Issue Resolved
                    </button>
                    <button
                      onClick={() => handleCustomerConfirmation(false)}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Dispute Resolution (Reopen)
                    </button>
                  </div>
                </div>

                {/* Final Case Closure */}
                {(currentRole === 'Admin' || currentRole === 'Support') && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      {!selectedCase.customer_confirmed && (
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Closure locked until customer confirms.
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleCloseCase}
                      disabled={!selectedCase.customer_confirmed || selectedCase.status === 'CLOSED'}
                      className="text-xs px-4 py-2 bg-charcoal text-white rounded-md font-bold hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Close & Archive Case
                    </button>
                  </div>
                )}
              </div>

              {/* Service Ticket & Pre-Billing Warranty Section */}
              {selectedTicket && (
                <div className="border-t border-gray-200 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-solar-blue" />
                        Service Ticket & Pre-Billing Warranty Guard
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ticket: {selectedTicket.id} &bull; Coverage Decision: <strong className="text-ink">{selectedTicket.coverage_decision}</strong>
                      </p>
                    </div>

                    <button
                      onClick={handleWarrantyLookup}
                      className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-solar-blue" /> Lookup Warranty Terms
                    </button>
                  </div>

                  {/* Warranty Lookup Results */}
                  {warrantyInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs space-y-1">
                      <div className="font-bold text-blue-900 flex items-center justify-between">
                        <span>Component: {warrantyInfo.component}</span>
                        <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          {warrantyInfo.warranty_status}
                        </span>
                      </div>
                      <p className="text-blue-800">
                        Installed: {new Date(warrantyInfo.installation_date).toLocaleDateString()} &bull; Expires: {new Date(warrantyInfo.warranty_end_date).toLocaleDateString()}
                      </p>
                      <p className="text-blue-700 italic">{warrantyInfo.terms_summary}</p>
                    </div>
                  )}

                  {/* Coverage Decision Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-600 font-semibold">Set Coverage:</span>
                    {['COVERED', 'CHARGEABLE', 'GOODWILL_WAIVED'].map(decision => (
                      <button
                        key={decision}
                        onClick={() => handleSetCoverage(decision)}
                        className={`text-xs px-2.5 py-1 rounded font-medium border ${
                          selectedTicket.coverage_decision === decision
                            ? 'bg-solar-blue text-white border-solar-blue'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {decision}
                      </button>
                    ))}
                  </div>

                  {/* Pre-Billing Charge Guard & Addition Form */}
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Add Service Charge</span>
                      {selectedTicket.coverage_decision === 'PENDING' && (
                        <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                          BLOCKED: Coverage decision is PENDING (§15.7)
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleAddCharge} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={chargeDesc}
                        onChange={(e) => setChargeDesc(e.target.value)}
                        placeholder="Description"
                        className="text-xs p-2 border border-gray-300 rounded sm:col-span-2 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">₹</span>
                        <input
                          type="number"
                          value={chargeAmountRupees}
                          onChange={(e) => setChargeAmountRupees(e.target.value)}
                          placeholder="Amount in ₹"
                          className="text-xs p-2 border border-gray-300 rounded w-full focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={selectedTicket.coverage_decision === 'PENDING'}
                          className="bg-solar-blue text-white text-xs px-3 py-2 rounded font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </form>

                    {/* Existing Charges */}
                    {selectedTicket.charges && selectedTicket.charges.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-500">Recorded Charges:</span>
                        {selectedTicket.charges.map(ch => (
                          <div key={ch.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-gray-200">
                            <span>{ch.description}</span>
                            <span className="font-mono font-bold">
                              ₹{(ch.amount_paise / 100).toLocaleString()} {ch.is_waived && <span className="text-emerald-600 font-normal">(WAIVED)</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
              <LifeBuoy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">Select a case from the queue to view full audit details</p>
              <p className="text-xs text-gray-400 mt-1">Or click &ldquo;Log New Support Case&rdquo; to test safety screening</p>
            </div>
          )}
        </div>

      </div>

      {/* New Case Modal with Live Safety Screen */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-solar-blue" />
                Report New Support Issue
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            {isHazardousDraft && (
              <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-red-900 text-xs flex items-start gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <strong className="font-bold">PRE-SCREEN WARNING: ELECTRICAL HAZARD DETECTED</strong>
                  <p className="mt-0.5">
                    Your description matches emergency keywords (smoke/fire/shock). This case will be instantly assigned P1 priority and dispatched for emergency response.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smoke coming from inverter casing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-solar-blue"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Detailed Description & Evidence</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe symptoms, error codes on display, unusual noises or smells..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-sm p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-solar-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Customer ID</label>
                  <input
                    type="text"
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Project ID</label>
                  <input
                    type="text"
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-solar-blue hover:bg-blue-600 rounded-lg shadow-sm"
                >
                  Submit Support Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function getStageIndex(status) {
  switch (status) {
    case 'AI_TRIAGE': return 0;
    case 'SUPPORT_REVIEW': return 1;
    case 'ADMIN_APPROVAL': return 2;
    case 'TECHNICIAN_DISPATCHED':
    case 'INVESTIGATING': return 3;
    case 'PENDING_SUPPORT_REVIEW': return 4;
    case 'PENDING_CUSTOMER_CONFIRMATION': return 5;
    case 'RESOLVED':
    case 'CLOSED': return 6;
    default: return 1;
  }
}
