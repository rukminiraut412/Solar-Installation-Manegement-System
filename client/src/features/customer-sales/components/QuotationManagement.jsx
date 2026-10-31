import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  PackageCheck,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Tag,
  Clock,
  Copy,
  Check,
  Eye,
  AlertCircle,
  X,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';

export default function QuotationManagement({ onSelectAcceptedQuote }) {
  const [quotations, setQuotations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [approvedSurveys, setApprovedSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  // Live BOM preview state
  const [builderForm, setBuilderForm] = useState({
    surveyId: '',
    capacityKw: 3,
    gridType: 'On-Grid',
    laborCost: 15000,
    discountAmount: 0,
    validityDays: 15, // [NC-011]
    customerNotes: 'Includes net metering liaison service and standard earthing kit.',
  });
  const [bomPreview, setBomPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isBuilderOpen) {
      updateLiveBOM();
    }
  }, [builderForm.capacityKw, builderForm.gridType, builderForm.surveyId, builderForm.laborCost, builderForm.discountAmount]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [qRes, pRes, sRes] = await Promise.all([
        customerSalesApi.listQuotations(),
        customerSalesApi.listPackages(),
        customerSalesApi.listSurveys({ status: 'APPROVED' }),
      ]);
      setQuotations(qRes.data || []);
      setPackages(pRes.data || []);
      setApprovedSurveys(sRes.data || []);
      if (sRes.data?.length > 0) {
        setBuilderForm((prev) => ({ ...prev, surveyId: sRes.data[0].id }));
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  const updateLiveBOM = async () => {
    try {
      setPreviewLoading(true);
      const res = await customerSalesApi.previewBOM({
        capacityKw: builderForm.capacityKw,
        gridType: builderForm.gridType,
        surveyId: builderForm.surveyId,
      });
      setBomPreview(res.data);
    } catch {
      setBomPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const res = await customerSalesApi.createQuotation(builderForm);
      setFeedback({
        type: 'success',
        text: `Formal quotation ${res.data.quotation_number} generated! Valid until ${new Date(
          res.data.valid_until
        ).toLocaleDateString()}.`,
      });
      setIsBuilderOpen(false);
      loadInitialData();
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Quotation creation failed' });
    }
  };

  const handleSendQuote = async (quoteId) => {
    try {
      await customerSalesApi.sendQuotation(quoteId);
      setFeedback({ type: 'success', text: 'Quotation dispatched to customer.' });
      loadInitialData();
    } catch {
      setFeedback({ type: 'error', text: 'Failed to dispatch quotation.' });
    }
  };

  const copyProposalLink = (token) => {
    const link = `${window.location.origin}/portal/quotes/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const openQuoteDossier = async (quote) => {
    try {
      const res = await customerSalesApi.getQuotation(quote.id);
      setSelectedQuote(res.data);
    } catch {
      setSelectedQuote({ quote });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-500" />
            Solar Package Quotations &amp; Automated BOM
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Section 3 &amp; BR-SRV-002 Invariant: Ready-made 1 to 5 kW packages with automated BOM derivation, 12% GST tax calculations,
            and digital customer proposal portal.
          </p>
        </div>
        <button
          onClick={() => {
            if (approvedSurveys.length === 0) {
              setFeedback({
                type: 'error',
                text: 'Cannot create quotation: No APPROVED site surveys available. An engineering lead must approve a site survey first (BR-SRV-002).',
              });
              return;
            }
            setIsBuilderOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
        >
          <Plus className="h-4 w-4" />
          Create Formal Quotation
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

      {/* Quotations Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Quotation Number</th>
                <th className="py-3 px-4">Capacity &amp; Type</th>
                <th className="py-3 px-4">Hardware Subtotal</th>
                <th className="py-3 px-4">Total Contract Value</th>
                <th className="py-3 px-4">Validity [NC-011]</th>
                <th className="py-3 px-4">Proposal Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    No quotations generated yet. Click "Create Formal Quotation" to quote an approved survey.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">{q.quotation_number}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {q.capacity_kw} kW {q.grid_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">₹{Number(q.hardware_subtotal).toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      ₹{Number(q.total_amount).toLocaleString()}
                      <span className="text-[10px] text-slate-500 block font-normal">(Incl. 12% GST)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300">{new Date(q.valid_until).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          q.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : q.status === 'SENT'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : q.status === 'DECLINED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : q.status === 'EXPIRED'
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Copy Customer Portal Link */}
                        <button
                          onClick={() => copyProposalLink(q.proposal_token)}
                          title="Copy Customer Digital Signing Portal Link"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                        >
                          {copiedToken === q.proposal_token ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Portal Link</span>
                            </>
                          )}
                        </button>

                        {/* Send Quote */}
                        {q.status === 'DRAFT' && (
                          <button
                            onClick={() => handleSendQuote(q.id)}
                            title="Mark as Sent to Customer"
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* View Itemized BOM */}
                        <button
                          onClick={() => openQuoteDossier(q)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
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

      {/* Modal: Interactive Quotation Builder */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  Rule BR-SRV-002 Compliant
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                  Solar Quotation &amp; Automated BOM Generator
                </h3>
              </div>
              <button onClick={() => setIsBuilderOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-6">
              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">
                    Approved Site Survey * (BR-SRV-002)
                  </label>
                  <select
                    required
                    value={builderForm.surveyId}
                    onChange={(e) => setBuilderForm({ ...builderForm, surveyId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {approvedSurveys.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.survey_number} &bull; {s.shadow_free_sqft} sqft ({s.tilt_angle_degrees}° Tilt)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">System Capacity</label>
                  <select
                    value={builderForm.capacityKw}
                    onChange={(e) => setBuilderForm({ ...builderForm, capacityKw: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={1}>1 kW System</option>
                    <option value={2}>2 kW System</option>
                    <option value={3}>3 kW System (PM Surya Ghar Favorite)</option>
                    <option value={4}>4 kW System</option>
                    <option value={5}>5 kW System</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Grid Architecture</label>
                  <select
                    value={builderForm.gridType}
                    onChange={(e) => setBuilderForm({ ...builderForm, gridType: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="On-Grid">On-Grid (Connected to Grid, No Battery)</option>
                    <option value="Off-Grid">Off-Grid (With Solar Battery Bank)</option>
                  </select>
                </div>
              </div>

              {/* Live Derived BOM Breakdown */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-emerald-400" />
                    Auto-Derived Bill of Materials (BOM) &bull; {builderForm.capacityKw} kW {builderForm.gridType}
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Includes survey extra DC cable ({bomPreview?.cableRunMeters || 15}m run)
                  </span>
                </div>

                {previewLoading ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Calculating component compatibility...</p>
                ) : !bomPreview ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Select an approved survey above</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="text-slate-500 uppercase text-[9px] border-b border-slate-800">
                        <tr>
                          <th className="py-1.5">Category</th>
                          <th className="py-1.5">Component SKU &amp; Name</th>
                          <th className="py-1.5">Qty / Unit</th>
                          <th className="py-1.5">Unit Price</th>
                          <th className="py-1.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {bomPreview.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 text-slate-400">{it.category}</td>
                            <td className="py-2 font-medium text-white">
                              {it.name}
                              {it.is_serialized && (
                                <span className="ml-2 px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono">
                                  SERIALIZED
                                </span>
                              )}
                            </td>
                            <td className="py-2 font-mono">
                              {it.quantity} {it.unit}
                            </td>
                            <td className="py-2 font-mono">₹{it.unit_price}</td>
                            <td className="py-2 font-mono text-right text-emerald-400">
                              ₹{it.total_price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Calculation Cards [NC-006, NC-012, NC-007] */}
              {bomPreview && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Hardware Subtotal</span>
                    <p className="text-lg font-mono font-bold text-white mt-1">
                      ₹{bomPreview.totals.hardwareSubtotal.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">12% Flat GST [NC-006]</span>
                    <p className="text-lg font-mono font-bold text-amber-400 mt-1">
                      ₹{bomPreview.totals.taxAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total Contract Value</span>
                    <p className="text-xl font-mono font-extrabold text-emerald-400 mt-1">
                      ₹{bomPreview.totals.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">PM Surya Ghar Subsidy [NC-007]</span>
                    <p className="text-lg font-mono font-bold text-blue-400 mt-1">
                      ₹{bomPreview.totals.subsidyEstimatedAmount.toLocaleString()}
                    </p>
                    <span className="text-[9px] text-slate-500">Informational DBT rebate</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bomPreview}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg disabled:opacity-50"
                >
                  Save &amp; Generate Formal Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dossier Modal: View Quotation Details */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                  {selectedQuote.quote?.quotation_number}
                </span>
                <h3 className="text-base font-bold text-white">
                  {selectedQuote.quote?.capacity_kw} kW {selectedQuote.quote?.grid_type} Proposal
                </h3>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Contract Total</span>
                  <p className="text-base font-mono font-bold text-emerald-400 mt-1">
                    ₹{Number(selectedQuote.quote?.total_amount).toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Status</span>
                  <p className="text-sm font-bold text-white mt-1">{selectedQuote.quote?.status}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Valid Until</span>
                  <p className="text-sm text-slate-300 mt-1">
                    {new Date(selectedQuote.quote?.valid_until).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Itemized BOM */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-white mb-2">Itemized BOM Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-slate-500 uppercase text-[9px] border-b border-slate-800">
                      <tr>
                        <th className="py-1">Category</th>
                        <th className="py-1">Component</th>
                        <th className="py-1">Quantity</th>
                        <th className="py-1 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {(selectedQuote.quote?.items || []).map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 text-slate-400">{it.category}</td>
                          <td className="py-1.5 text-white">{it.name}</td>
                          <td className="py-1.5 font-mono">
                            {it.quantity} {it.unit}
                          </td>
                          <td className="py-1.5 font-mono text-right text-emerald-400">
                            ₹{Number(it.total_price).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
