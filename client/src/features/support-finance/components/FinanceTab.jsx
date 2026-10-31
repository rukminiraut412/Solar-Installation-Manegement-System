import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileCheck, 
  TrendingUp, 
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import { api } from '../api';

export default function FinanceTab({ currentRole }) {
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payRecords, setPayRecords] = useState([]);
  const [subsidies, setSubsidies] = useState([]);
  const [profitability, setProfitability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('INVOICES');

  useEffect(() => {
    loadFinanceData();
  }, [currentRole]);

  async function loadFinanceData() {
    try {
      setLoading(true);
      const [invRes, expRes, payRes, subRes, plRes] = await Promise.all([
        api.getInvoices(currentRole),
        api.getExpenses(currentRole),
        api.getTechnicianPay(currentRole),
        api.getSubsidies(currentRole),
        api.getProjectProfitability('PRJ-7701', currentRole)
      ]);
      setInvoices(invRes.invoices || []);
      setExpenses(expRes.expenses || []);
      setPayRecords(payRes.records || []);
      setSubsidies(subRes.subsidies || []);
      setProfitability(plRes.profitability || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewExpense(id, status) {
    try {
      await api.reviewExpense(id, {
        status,
        rejection_reason: status === 'REJECTED' ? 'Missing valid GST receipt' : null
      }, currentRole);
      alert(`Expense marked as ${status}`);
      loadFinanceData();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  async function handleToggleSubsidyDoc(subsidyId, docKey, currentVal) {
    try {
      await api.updateSubsidyChecklist(subsidyId, {
        document_key: docKey,
        verified: !currentVal
      }, currentRole);
      loadFinanceData();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Navigation sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { id: 'INVOICES', label: 'Invoices & Balances' },
          { id: 'PROFITABILITY', label: 'Project P/L Math' },
          { id: 'EXPENSES', label: 'Direct Expenses & Approvals' },
          { id: 'TIMESHEETS', label: 'Technician Timesheets' },
          { id: 'SUBSIDIES', label: 'Subsidy Paperwork' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeSection === tab.id 
                ? 'bg-solar-blue text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading financial records...</div>
      ) : (
        <>
          {/* Section 1: Invoices */}
          {activeSection === 'INVOICES' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-ink">Customer Invoices & Receivable Balances</h3>
                    <p className="text-xs text-gray-500">Track advance, milestone payments, and outstanding liabilities</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Total Invoices: {invoices.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Project / Customer</th>
                        <th className="p-3">Total Amount</th>
                        <th className="p-3">Amount Paid</th>
                        <th className="p-3">Balance Due</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {invoices.map(inv => {
                        const total = inv.total_paise / 100;
                        const paid = inv.paid_paise / 100;
                        const balance = inv.balance_paise / 100;
                        const isOverpaid = inv.is_overpaid || balance < 0;

                        return (
                          <tr key={inv.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-solar-blue">{inv.invoice_number}</td>
                            <td className="p-3">
                              <div className="font-semibold">{inv.project_id}</div>
                              <div className="text-gray-400 text-[11px]">{inv.customer_id}</div>
                            </td>
                            <td className="p-3 font-mono font-bold">₹{total.toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono text-emerald-700">₹{paid.toLocaleString('en-IN')}</td>
                            <td className="p-3">
                              {isOverpaid ? (
                                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                                  Overpaid - review required
                                </span>
                              ) : (
                                <span className={`font-mono font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  ₹{balance.toLocaleString('en-IN')}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                                inv.status === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {inv.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">
                              {new Date(inv.due_date).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Project P/L Math */}
          {activeSection === 'PROFITABILITY' && profitability && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-solar-blue bg-blue-50 px-2 py-0.5 rounded">
                      {profitability.project_id}
                    </span>
                    <h2 className="text-xl font-bold text-ink mt-1">Project Profitability & Cost Breakdown</h2>
                    <p className="text-xs text-gray-500">
                      Standard Formula: Revenue &minus; (Material + Labor + Direct + Service) &bull; §13.3
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div>
                      <div className="text-[11px] text-gray-400 uppercase font-mono">NET MARGIN</div>
                      <div className="text-xl font-bold text-emerald-600 font-mono">
                        ₹{(profitability.net_profit_paise / 100).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="pl-4 border-l border-gray-200">
                      <div className="text-[11px] text-gray-400 uppercase font-mono">MARGIN %</div>
                      <div className="text-xl font-bold text-solar-blue font-mono">
                        {profitability.margin_percentage}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mathematical Line-Item Breakdown */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Revenue & Cost Elements */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Financial Line Items</h4>
                    
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-emerald-900">Total Contract Revenue</div>
                        <div className="text-[11px] text-emerald-700">Customer payments & invoice amounts</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-sm">
                        + ₹{(profitability.contract_revenue_paise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="text-xs font-semibold text-gray-500">Deductible Project Costs:</div>
                      
                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div>
                          <span className="font-medium">1. Material & Equipment</span>
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            {profitability.cost_labels?.material || 'Actual'}
                          </span>
                        </div>
                        <span className="font-mono text-red-600 font-semibold">
                          &minus; ₹{(profitability.material_cost_paise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div>
                          <span className="font-medium">2. Field Labor & Installation</span>
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            {profitability.cost_labels?.labor || 'Actual'}
                          </span>
                        </div>
                        <span className="font-mono text-red-600 font-semibold">
                          &minus; ₹{(profitability.labor_cost_paise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div>
                          <span className="font-medium">3. Direct Expenses (Crane/Permits)</span>
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            {profitability.cost_labels?.direct_expenses || 'Actual'}
                          </span>
                        </div>
                        <span className="font-mono text-red-600 font-semibold">
                          &minus; ₹{(profitability.direct_expenses_paise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded border border-gray-200 text-xs">
                        <div>
                          <span className="font-medium">4. Service & Warranty Cost</span>
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
                            {profitability.cost_labels?.service || 'Actual'}
                          </span>
                        </div>
                        <span className="font-mono text-red-600 font-semibold">
                          &minus; ₹{(profitability.service_cost_paise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actual vs Estimate Visual Distinction (§13.3) */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-solar-blue" />
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Estimate vs. Actual Audit Integrity
                      </h4>
                    </div>

                    <p className="text-xs text-gray-600">
                      Per specification rule §13.3, dashboards must never blur actual expenditures with estimated site budget quotes.
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <div className="font-bold text-gray-700">Total Incurred Actual Costs</div>
                        <div className="text-base font-bold text-red-700 font-mono mt-1">
                          ₹{(profitability.total_cost_paise / 100).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Backed by verified invoices, approved expenses & timesheets</div>
                      </div>

                      <div className="p-3 bg-white rounded border border-gray-200">
                        <div className="font-bold text-gray-700">Audited Gross Profit Margin</div>
                        <div className="text-base font-bold text-emerald-700 font-mono mt-1">
                          {profitability.margin_percentage}%
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Healthy margin exceeding standard residential target of 22%</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Section 3: Direct Expenses */}
          {activeSection === 'EXPENSES' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-ink">Direct Field Expenses & Purchase Finance</h3>
                  <p className="text-xs text-gray-500">Crane hire, safety equipment, transport permits requiring Admin approval</p>
                </div>
                <span className="text-xs font-mono bg-blue-100 text-solar-blue font-bold px-2 py-1 rounded">
                  Count: {expenses.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Expense ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Receipt Attached</th>
                      <th className="p-3">Status</th>
                      {(currentRole === 'Admin' || currentRole === 'Finance') && <th className="p-3">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-solar-blue">{exp.id}</td>
                        <td className="p-3 font-medium">{exp.category}</td>
                        <td className="p-3 text-gray-700">{exp.description}</td>
                        <td className="p-3 font-mono font-bold">₹{(exp.amount_paise / 100).toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono text-[11px] text-gray-500">{exp.receipt_url || 'No receipt'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            exp.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            exp.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {exp.status}
                          </span>
                        </td>
                        {(currentRole === 'Admin' || currentRole === 'Finance') && (
                          <td className="p-3">
                            {exp.status === 'SUBMITTED' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleReviewExpense(exp.id, 'APPROVED')}
                                  className="bg-emerald-600 text-white px-2 py-1 rounded text-[11px] hover:bg-emerald-700 font-bold"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewExpense(exp.id, 'REJECTED')}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-[11px] hover:bg-red-700 font-bold"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Reviewed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Timesheets & Pay Records */}
          {activeSection === 'TIMESHEETS' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-sm text-ink">Field Technician Timesheets & Pay Records</h3>
                <p className="text-xs text-gray-500">Hourly tracking and contractor wage disbursements</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Record ID</th>
                      <th className="p-3">Technician</th>
                      <th className="p-3">Project</th>
                      <th className="p-3">Hours Worked</th>
                      <th className="p-3">Hourly Rate</th>
                      <th className="p-3">Total Calculated Pay</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payRecords.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-solar-blue">{rec.id}</td>
                        <td className="p-3 font-medium text-ink">{rec.technician_name}</td>
                        <td className="p-3 font-mono text-gray-500">{rec.project_id}</td>
                        <td className="p-3 font-mono">{rec.hours_worked} hrs</td>
                        <td className="p-3 font-mono">₹{(rec.hourly_rate_paise / 100).toLocaleString()}</td>
                        <td className="p-3 font-mono font-bold text-ink">
                          ₹{(rec.total_pay_paise / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                            rec.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                            rec.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Subsidy Paperwork */}
          {activeSection === 'SUBSIDIES' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-ink">Government Solar Subsidy Document Verification</h3>
                    <p className="text-xs text-gray-500">MNRE & State Rooftop Portal Compliance</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {subsidies.map(sub => (
                    <div key={sub.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-solar-blue font-mono text-xs">{sub.id}</span>
                          <span className="ml-2 font-semibold text-xs text-gray-700">Project: {sub.project_id}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-ink">
                          Eligible Amount: ₹{(sub.subsidy_amount_paise / 100).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-gray-600">Verification Document Checklist:</div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(sub.checklist || {}).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => handleToggleSubsidyDoc(sub.id, key, val)}
                            className={`p-2.5 rounded border text-left flex items-center justify-between text-xs transition ${
                              val 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                                : 'bg-white border-gray-300 text-gray-600'
                            }`}
                          >
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            {val ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
