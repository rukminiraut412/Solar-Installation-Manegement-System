import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  FileSearch, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Terminal,
  Zap
} from 'lucide-react';
import { api } from '../api';

export default function AIAssistantTab({ currentRole }) {
  const [activeTool, setActiveTool] = useState('TRIAGE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Summarizer state
  const [entityType, setEntityType] = useState('project');
  const [entityId, setEntityId] = useState('PRJ-7701');

  // Missing info state
  const [missingProjectId, setMissingProjectId] = useState('PRJ-7701');

  // Warranty explainer state
  const [warrantyComponent, setWarrantyComponent] = useState('SOLAR_MODULE');

  // Triage state
  const [triageQuery, setTriageQuery] = useState('My system generation dropped 15% during heavy monsoon clouds. Is this normal?');

  // Logs state
  const [aiLogs, setAiLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, [currentRole]);

  async function loadLogs() {
    try {
      const res = await api.getAILogs(currentRole);
      setAiLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRunSummarizer(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setResult(null);
      const res = await api.getAISummary({ entity_type: entityType, entity_id: entityId }, currentRole);
      setResult({ type: 'SUMMARY', data: res });
      loadLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunMissingInfo(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setResult(null);
      const res = await api.checkMissingInfo({ project_id: missingProjectId }, currentRole);
      setResult({ type: 'MISSING_INFO', data: res });
      loadLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunWarranty(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setResult(null);
      const res = await api.explainWarranty({ component_type: warrantyComponent, project_id: 'PRJ-7701' }, currentRole);
      setResult({ type: 'WARRANTY', data: res });
      loadLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunTriage(testType) {
    let query = triageQuery;
    if (testType === 'HAZARD') {
      query = 'I see smoke and sparks coming out of the rooftop junction box and smell burning plastic!';
      setTriageQuery(query);
    } else if (testType === 'BENIGN') {
      query = 'Why is my solar inverter LCD screen blank after sunset?';
      setTriageQuery(query);
    }

    try {
      setLoading(true);
      setResult(null);
      const res = await api.triageSupport({ query }, currentRole);
      setResult({ type: 'TRIAGE', data: res });
      loadLogs();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner with Purple AI Aesthetic */}
      <div className="bg-purple-950 text-white rounded-xl p-6 border border-purple-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> AI COPILOT &bull; MOCK PROVIDER
              </span>
              <span className="text-xs text-purple-300 font-mono">Grounded Knowledge Engine</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-2">
              AI Intelligence, Grounded Summaries & Safety Triage
            </h2>
            <p className="text-xs text-purple-200 mt-1 max-w-2xl">
              Provides grounded operational summaries, missing record audits, plain-language warranty explanations, and safety triage backed by approved source documentation.
            </p>
          </div>

          <div className="bg-purple-900/60 border border-purple-700/60 rounded-lg p-3 text-xs max-w-xs text-purple-200">
            <span className="font-bold text-yellow-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Human-in-the-Loop Enforced
            </span>
            AI suggestions are purely advisory. AI is prohibited from closing cases, approving payments, or deciding warranty coverage (§15.12).
          </div>
        </div>
      </div>

      {/* Strict AI Guardrails Reference (§15.12) */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700">
        <span className="font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Mandatory Architectural Guardrails:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">✗ No Auto-Close Cases</span>
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">✗ No Payment Approvals</span>
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">✗ No Warranty Coverage Decisions</span>
          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">✗ No Hazardous Repair Instructions</span>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { id: 'TRIAGE', label: '1. Safe Support Triage & Hazard Scanner' },
          { id: 'WARRANTY', label: '2. Plain-Language Warranty Explainer' },
          { id: 'MISSING_INFO', label: '3. Missing-Information Detector' },
          { id: 'SUMMARIZER', label: '4. Grounded Entity Summarizer' },
          { id: 'LOGS', label: '5. AI Telemetry & Audit Logs' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTool(t.id); setResult(null); }}
            className={`text-xs sm:text-sm px-3.5 py-1.5 rounded-lg font-medium transition ${
              activeTool === t.id 
                ? 'bg-purple-700 text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool 1: Safe Support Triage */}
      {activeTool === 'TRIAGE' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-700" />
              Pre-Model Safety Scanner & Support Triage
            </h3>
            <p className="text-xs text-gray-500">
              Evaluates customer queries. Any mention of fire, smoke, sparks, or shock triggers immediate P1 escalation with mandatory safety disclaimers before model inference (§15.5).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 font-semibold">Test Pre-Sets:</span>
            <button
              onClick={() => handleRunTriage('HAZARD')}
              className="text-xs px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold border border-red-300 flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Simulate Smoke / Sparks (P1 Hazard)
            </button>
            <button
              onClick={() => handleRunTriage('BENIGN')}
              className="text-xs px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-solar-blue rounded font-semibold border border-blue-300"
            >
              Simulate Inverter Screen Blank at Sunset (Benign)
            </button>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={triageQuery}
              onChange={(e) => setTriageQuery(e.target.value)}
              placeholder="Enter customer support query or symptoms..."
              className="w-full text-xs p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
            />

            <button
              onClick={() => handleRunTriage('CUSTOM')}
              disabled={loading || !triageQuery.trim()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Analyzing with Safety Screen...' : 'Run AI Support Triage'}
            </button>
          </div>
        </div>
      )}

      {/* Tool 2: Plain Language Warranty Explainer */}
      {activeTool === 'WARRANTY' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-700" />
              Dual-Panel Plain-Language Warranty Explainer
            </h3>
            <p className="text-xs text-gray-500">
              Contrasts authoritative contract records with conversational plain-language explanations to simplify customer communication without legal ambiguity (§15.9).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-700">Select Component:</label>
            <select
              value={warrantyComponent}
              onChange={(e) => setWarrantyComponent(e.target.value)}
              className="text-xs p-2 border border-gray-300 rounded-md focus:outline-none"
            >
              <option value="SOLAR_MODULE">Tier 1 Monocrystalline Solar Module</option>
              <option value="INVERTER">Grid-Tied String Inverter</option>
              <option value="BATTERY">Lithium Ferro Phosphate (LFP) Storage</option>
            </select>

            <button
              onClick={handleRunWarranty}
              disabled={loading}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Synthesizing...' : 'Generate Dual-Panel Comparison'}
            </button>
          </div>
        </div>
      )}

      {/* Tool 3: Missing Information Detector */}
      {activeTool === 'MISSING_INFO' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-purple-700" />
              Deterministic Missing-Information Detector
            </h3>
            <p className="text-xs text-gray-500">
              Scans installation records, site survey documents, and government subsidy filings for missing required files or data fields (§15.6).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={missingProjectId}
              onChange={(e) => setMissingProjectId(e.target.value)}
              placeholder="Project ID (e.g. PRJ-7701)"
              className="text-xs p-2 border border-gray-300 rounded-md focus:outline-none"
            />

            <button
              onClick={handleRunMissingInfo}
              disabled={loading}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2"
            >
              <FileSearch className="w-3.5 h-3.5" />
              {loading ? 'Auditing records...' : 'Run Gap Audit'}
            </button>
          </div>
        </div>
      )}

      {/* Tool 4: Grounded Summarizer */}
      {activeTool === 'SUMMARIZER' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-700" />
              Grounded Operational Entity Summarizer
            </h3>
            <p className="text-xs text-gray-500">
              Produces concise contextual executive summaries with exact source citations (§15.4).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="text-xs p-2 border border-gray-300 rounded-md focus:outline-none"
            >
              <option value="project">Project</option>
              <option value="customer">Customer</option>
              <option value="case">Support Case</option>
            </select>

            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="Entity ID (e.g. PRJ-7701)"
              className="text-xs p-2 border border-gray-300 rounded-md focus:outline-none"
            />

            <button
              onClick={handleRunSummarizer}
              disabled={loading}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Summarizing...' : 'Summarize Entity'}
            </button>
          </div>
        </div>
      )}

      {/* Tool 5: Telemetry & Logs */}
      {activeTool === 'LOGS' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-700" />
              AI Request Audit Trail & Prompt Telemetry
            </h3>
            <span className="text-xs font-mono bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
              Total Invocations: {aiLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Tool Task</th>
                  <th className="p-3">Tokens</th>
                  <th className="p-3">Safety Triggered</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {aiLogs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-purple-700">{l.id}</td>
                    <td className="p-3 font-medium">{l.task}</td>
                    <td className="p-3 font-mono">{l.tokens_used}</td>
                    <td className="p-3">
                      {l.safety_triggered ? (
                        <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          YES (P1 EMERGENCY)
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">No</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Output Display Card */}
      {result && (
        <div className="border border-purple-200 bg-purple-50/20 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-purple-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI GENERATED OUTPUT
              </span>
              <span className="text-xs text-gray-500 font-medium">Provider: Mock Grounded Engine</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Confidence: {result.data.confidence_score ? `${Math.round(result.data.confidence_score * 100)}%` : '100%'}
            </span>
          </div>

          {/* Triage Output */}
          {result.type === 'TRIAGE' && (
            <div className="space-y-3">
              {result.data.safety_screening?.is_hazardous ? (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    EMERGENCY HAZARD SCREEN INTERCEPTED &bull; PRIORITY P1
                  </div>
                  <p className="text-xs font-semibold text-red-800">
                    {result.data.response_text}
                  </p>
                  <div className="text-[11px] text-red-700 bg-red-100/50 p-2 rounded">
                    Matched Hazardous Keywords: <code>{result.data.safety_screening.matched_keywords?.join(', ')}</code>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-purple-200 text-xs text-gray-800 leading-relaxed">
                    <h4 className="font-bold text-purple-900 mb-1">Grounded Recommendation:</h4>
                    {result.data.response_text}
                  </div>

                  {result.data.source_references && (
                    <div className="text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">Source References:</span>
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {result.data.source_references.map((s, idx) => (
                          <li key={idx} className="text-purple-700 font-medium">
                            {s.title} ({s.article_id}) &bull; <span className="text-gray-500 font-normal">Relevance: {s.relevance}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Plain Language Warranty Dual-Panel */}
          {result.type === 'WARRANTY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Left Panel: Authoritative Contract Record */}
              <div className="bg-white p-4 rounded-lg border border-gray-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Authoritative Contract Terms
                  </span>
                  <span className="text-[10px] bg-gray-100 font-mono text-gray-600 px-1.5 py-0.5 rounded font-bold">
                    SYSTEM DATA
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                  {result.data.authoritative_record?.terms_summary || JSON.stringify(result.data.authoritative_record, null, 2)}
                </div>
              </div>

              {/* Right Panel: Plain-Language Conversational Explanation */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                    Plain-Language Explanation
                  </span>
                  <span className="text-[10px] bg-purple-200 font-mono text-purple-900 px-1.5 py-0.5 rounded font-bold">
                    FOR CUSTOMER
                  </span>
                </div>
                <div className="text-xs text-purple-950 leading-relaxed whitespace-pre-wrap">
                  {result.data.plain_explanation}
                </div>
              </div>

            </div>
          )}

          {/* Missing Info Output */}
          {result.type === 'MISSING_INFO' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Audited Project: {result.data.project_id} &bull; Identified Gaps ({result.data.missing_items?.length || 0})
              </div>

              <div className="space-y-2">
                {result.data.missing_items?.map((item, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start justify-between text-xs">
                    <div>
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        {item.field_name}
                      </div>
                      <div className="text-amber-800 mt-0.5">{item.impact_description}</div>
                    </div>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Summary Output */}
          {result.type === 'SUMMARY' && (
            <div className="bg-white p-4 rounded-lg border border-purple-200 space-y-3 text-xs">
              <h4 className="font-bold text-ink text-sm">Grounded Executive Summary</h4>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result.data.summary_text}
              </p>

              {result.data.source_citations && (
                <div className="pt-2 border-t border-gray-100 text-gray-500">
                  <span className="font-semibold text-gray-700">Source Citations:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.data.source_citations.map((c, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono text-[11px] border">
                        {c.table} &bull; {c.record_id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
