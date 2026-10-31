import React, { useState, useEffect } from 'react';
import {
  Sun,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Zap,
  MapPin,
  Clock,
  Layers,
  Award,
  AlertTriangle,
  Download,
  Check,
  X
} from 'lucide-react';
import { customerSalesApi } from '../api/customerSalesApi';

export default function PublicQuotePortal({ token: propToken }) {
  // Extract token from prop or URL pathname
  const [token, setToken] = useState(() => {
    if (propToken) return propToken;
    const parts = window.location.pathname.split('/portal/quotes/');
    return parts[1] || '';
  });

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);
  const [acceptedOrder, setAcceptedOrder] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing quotation security token.');
      setLoading(false);
      return;
    }
    loadQuote();
  }, [token]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customerSalesApi.getPublicQuote(token);
      setQuote(res.data);
      if (res.data?.status === 'ACCEPTED') {
        setAcceptSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Quotation not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Please enter your full name as digital signature.');
      return;
    }
    if (!agreementChecked) {
      alert('Please acknowledge and confirm the solar proposal terms.');
      return;
    }

    try {
      setAccepting(true);
      const res = await customerSalesApi.acceptQuote(token, {
        customer_signature: signerName.trim(),
        notes: `Digitally signed and accepted by ${signerName.trim()}`
      });
      setQuote(res.data.quote);
      setAcceptedOrder(res.data.order);
      setAcceptSuccess(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept quotation.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Sun className="h-10 w-10 text-amber-500 animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Retrieving Verified Solar Proposal...</span>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Quotation Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'This link may have expired or is incorrect.'}</p>
          <div className="pt-2 text-[11px] text-slate-500">
            If you believe this is an error, please contact SunPower Solutions Support.
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(quote.valid_until) < new Date() && quote.status === 'SENT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sun className="h-6 w-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white">SunPower Solutions</div>
              <div className="text-[10px] text-amber-400 tracking-wider font-semibold uppercase">Official Customer Solar Proposal</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
              quote.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isExpired ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {quote.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-6">
        {/* Success Banner if Accepted */}
        {acceptSuccess && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-6 text-emerald-300 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-3 font-bold text-lg text-emerald-400">
              <CheckCircle2 className="h-6 w-6" /> Proposal Accepted &amp; Verified!
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              Thank you for choosing clean renewable solar energy. Your project order{' '}
              <span className="font-mono font-bold text-white">
                {acceptedOrder?.order_number || quote.quote_number?.replace('QTE', 'ORD')}
              </span>{' '}
              has been officially generated. The engineering team has reserved inventory stock and will contact you for rooftop installation scheduling.
            </p>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" /> High-Efficiency Solar PV System
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {quote.package_name || `${quote.system_capacity_kw} kW Solar System`}
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Prepared for: <span className="text-white font-medium">{quote.customer_name}</span> &bull; {quote.customer_city || 'India'}
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400 font-mono">
                <div>Quote #: <span className="text-amber-400 font-bold">{quote.quote_number}</span></div>
                <div>Version: <span className="text-white font-bold">v{quote.version}</span></div>
                <div>Valid Until: <span className="text-white font-bold">{new Date(quote.valid_until).toLocaleDateString()}</span></div>
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-6 text-center shadow-lg">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Estimated Net Investment</div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono mt-1">
                ₹{Number(quote.net_amount || quote.total_amount).toLocaleString('en-IN')}
              </div>
              {Number(quote.subsidy_amount) > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium">
                  <Award className="h-3.5 w-3.5" /> Incl. ₹{Number(quote.subsidy_amount).toLocaleString('en-IN')} PM Surya Ghar Subsidy
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Investment & Pricing Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Commercial Breakdown
            </h3>
            <div className="divide-y divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between text-slate-400">
                <span>Base Solar Package</span>
                <span className="font-mono text-white font-semibold">₹{Number(quote.base_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(quote.extra_cable_cost || 0) > 0 && (
                <div className="py-2.5 flex justify-between text-slate-400">
                  <span>Extended DC/AC Cable Run</span>
                  <span className="font-mono text-white font-semibold">₹{Number(quote.extra_cable_cost).toLocaleString('en-IN')}</span>
                </div>
              )}
              {Number(quote.discount_amount || 0) > 0 && (
                <div className="py-2.5 flex justify-between text-emerald-400">
                  <span>Promotional Discount</span>
                  <span className="font-mono font-semibold">- ₹{Number(quote.discount_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="py-2.5 flex justify-between text-slate-400">
                <span>GST (12% Clean Energy Tax [NC-006])</span>
                <span className="font-mono text-white font-semibold">₹{Number(quote.tax_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="py-2.5 flex justify-between text-slate-200 font-bold">
                <span>Gross Total Payable</span>
                <span className="font-mono text-amber-400 font-bold">₹{Number(quote.total_amount || 0).toLocaleString('en-IN')}</span>
              </div>
              {Number(quote.subsidy_amount || 0) > 0 && (
                <div className="py-2.5 flex justify-between text-emerald-400 font-bold">
                  <span>Central Govt. Subsidy Benefit</span>
                  <span className="font-mono font-bold">- ₹{Number(quote.subsidy_amount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="py-3 flex justify-between text-white font-extrabold text-sm bg-slate-950/60 px-3 rounded-xl mt-2 border border-slate-800">
                <span>Final Customer Net Outlay</span>
                <span className="font-mono text-emerald-400">₹{Number(quote.net_amount || quote.total_amount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* System Specs & Warranty */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> System Specs &amp; Assurance
            </h3>
            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                  <Sun className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Tier-1 Mono PERC / TOPCon Solar Modules</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">25-Year Linear Power Warranty (80%+ generation output).</div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">High-Yield MPPT Solar Inverter</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">5 to 10 Year Comprehensive Warranty with Wi-Fi Mobile App Monitoring.</div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 mt-0.5">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Galvanized Structural Hardware</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Wind load engineered up to 150 km/h, corrosion-resistant anodized aluminum.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill of Materials Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" /> Itemized Bill of Materials (BOM)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Component Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Specification / Make</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {quote.items?.length > 0 ? (
                  quote.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-semibold text-white">{item.item_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">{item.quantity}</td>
                      <td className="py-3 px-4 text-slate-400">{item.unit}</td>
                      <td className="py-3 px-4 text-slate-400">{item.specifications || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-slate-500">
                      Standard package components included.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Digital Acceptance Form */}
        {quote.status !== 'ACCEPTED' && !isExpired && (
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-amber-400" /> Digital Acceptance &amp; Agreement
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Please type your name below to digitally execute this solar installation proposal.
              </p>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name (Digital Signature) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 font-serif"
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  required
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  I hereby accept the technical solar design, itemized bill of materials, and quoted pricing. I agree for SunPower Solutions to initiate project procurement and schedule rooftop installation.
                </span>
              </label>

              <button
                type="submit"
                disabled={accepting}
                className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <Sun className="h-4 w-4 animate-spin" /> Processing Acceptance...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Accept Proposal &amp; Confirm Solar Order
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        SunPower Solutions &bull; Authorized Clean Energy Partner &bull; Powered by Antigravity
      </footer>
    </div>
  );
}
