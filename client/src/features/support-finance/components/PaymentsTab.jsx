import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  ExternalLink,
  Lock,
  DollarSign,
  FileText
} from 'lucide-react';
import { api } from '../api';

export default function PaymentsTab({ currentRole }) {
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('PENDING_REQUESTS');

  // Checkout modal / simulation
  const [processingOrder, setProcessingOrder] = useState(null);
  const [testPaymentSuccess, setTestPaymentSuccess] = useState(null);

  // Manual payment state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualReqId, setManualReqId] = useState('');
  const [manualMethod, setManualMethod] = useState('BANK_TRANSFER');
  const [manualRef, setManualRef] = useState('UTR-' + Date.now().toString().slice(-6));

  // Webhook simulator state
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [duplicateWebhookTest, setDuplicateWebhookTest] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentRole]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [reqRes, payRes] = await Promise.all([
        api.getPaymentRequests(currentRole),
        api.getPayments(currentRole)
      ]);
      setRequests(reqRes.requests || []);
      setPayments(payRes.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiatePayment(request) {
    try {
      setProcessingOrder(request);
      setTestPaymentSuccess(null);

      // 1. Backend creates Razorpay order (amounts strictly derived on server)
      const orderRes = await api.createPaymentOrder(request.id, currentRole);
      const order = orderRes.order;

      // 2. Open Razorpay Checkout (or fallback test runner)
      if (window.Razorpay) {
        const options = {
          key: orderRes.key_id || 'rzp_test_MOCKKEY12345678',
          amount: order.amount,
          currency: order.currency,
          name: 'SunPower Solutions',
          description: `${request.payment_type.replace(/_/g, ' ')} - ${request.id}`,
          order_id: order.id,
          handler: async function (response) {
            await handleVerifyCallback(response, request.id);
          },
          prefill: {
            name: 'SunPower Demo Customer',
            email: 'customer@sunpower-demo.test',
            contact: '+919876543210'
          },
          theme: {
            color: '#1e40af'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          alert(`Payment Failed: ${resp.error.description}`);
          setProcessingOrder(null);
        });
        rzp.open();
      } else {
        // Simulated checkout dialog for headless / test environment
        triggerSimulatedCheckout(order, request.id);
      }
    } catch (err) {
      alert(`Order Creation Failed: ${err.message}`);
      setProcessingOrder(null);
    }
  }

  // Simulated Checkout when window.Razorpay is absent or mocked
  async function triggerSimulatedCheckout(order, requestId) {
    const fakePaymentId = 'pay_' + Math.random().toString(36).substring(2, 11);
    
    // Call server verify with mock signature
    try {
      const verifyRes = await api.verifyPaymentCallback({
        razorpay_order_id: order.id,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: 'simulated_hmac_sha256_valid',
        payment_request_id: requestId
      }, currentRole);

      setTestPaymentSuccess(verifyRes.payment);
      alert(`Razorpay Payment Verified: ${verifyRes.message}`);
      await loadData();
    } catch (err) {
      alert(`Signature Verification Failed: ${err.message}`);
    } finally {
      setProcessingOrder(null);
    }
  }

  async function handleVerifyCallback(razorpayResponse, requestId) {
    try {
      const verifyRes = await api.verifyPaymentCallback({
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        payment_request_id: requestId
      }, currentRole);

      setTestPaymentSuccess(verifyRes.payment);
      alert('Payment Verified on Backend! Transaction ledger updated.');
      await loadData();
    } catch (err) {
      alert(`Server signature verification rejected: ${err.message}`);
    } finally {
      setProcessingOrder(null);
    }
  }

  async function handleSimulateWebhook(isDuplicate = false) {
    try {
      setWebhookStatus('SENDING');
      const samplePaymentId = 'pay_wh_' + (isDuplicate ? 'IDEMPOTENT_TEST_KEY' : Math.random().toString(36).substring(2, 9));
      
      const res = await api.simulateWebhook({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: samplePaymentId,
              order_id: 'order_test_998877',
              amount: 5000000,
              currency: 'INR',
              status: 'captured',
              method: 'upi'
            }
          }
        }
      }, currentRole);

      setWebhookStatus(`SUCCESS: ${res.message} (Duplicate Handled: ${res.is_duplicate ? 'YES' : 'NO'})`);
      await loadData();
    } catch (err) {
      setWebhookStatus(`FAILED: ${err.message}`);
    }
  }

  async function handleRecordOffline(e) {
    e.preventDefault();
    if (!manualReqId) return;
    try {
      const res = await api.recordOfflinePayment({
        request_id: manualReqId,
        method: manualMethod,
        reference_number: manualRef
      }, currentRole);

      alert(res.message);
      setShowManualModal(false);
      await loadData();
    } catch (err) {
      alert(`Offline recording failed: ${err.message}`);
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      
      {/* Test Mode Banner */}
      <div className="bg-yellow-500/10 border border-yellow-400 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-yellow-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-yellow-900 text-sm flex items-center gap-2">
              RAZORPAY TEST MODE &bull; IDEMPOTENT FINANCIAL LEDGER
            </span>
            <p className="text-xs text-yellow-800 mt-0.5">
              All transactions run in test mode. Amounts are calculated exclusively by backend in paise. Frontend payment callbacks require backend HMAC-SHA256 signature verification (§15.11).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSimulateWebhook(false)}
            className="text-xs px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Test Webhook Event
          </button>
        </div>
      </div>

      {webhookStatus && (
        <div className="text-xs p-3 bg-gray-900 text-yellow-300 font-mono rounded-lg border border-gray-700">
          Webhook Simulation: {webhookStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('PENDING_REQUESTS')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'PENDING_REQUESTS' 
                ? 'bg-solar-blue text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pending Invoices & Orders ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('VERIFIED_LEDGER')}
            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'VERIFIED_LEDGER' 
                ? 'bg-solar-blue text-white shadow-sm' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Verified Payments Ledger ({payments.length})
          </button>
        </div>

        {(currentRole === 'Admin' || currentRole === 'Finance') && (
          <button
            onClick={() => setShowManualModal(true)}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-ink font-semibold rounded border border-gray-300 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Record Offline / NEFT Payment
          </button>
        )}
      </div>

      {/* Tab 1: Pending Orders for Payment */}
      {activeTab === 'PENDING_REQUESTS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading orders...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500">
              No pending payment requests. All milestone invoices settled!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(req => {
                const amountRupees = req.amount_paise / 100;
                return (
                  <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold bg-blue-50 text-solar-blue px-2 py-0.5 rounded">
                          {req.id}
                        </span>
                        <h3 className="font-bold text-ink mt-1 text-sm">{req.description}</h3>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Project: {req.project_id} &bull; Customer: {req.customer_id}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-gray-400 uppercase font-mono block">AMOUNT</span>
                        <span className="text-lg font-bold text-ink font-mono">
                          ₹{amountRupees.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500">
                        Type: <strong className="text-gray-700">{req.payment_type.replace(/_/g, ' ')}</strong>
                      </span>
                      <button
                        onClick={() => handleInitiatePayment(req)}
                        disabled={processingOrder?.id === req.id}
                        className="bg-solar-blue hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                      >
                        <CreditCard className="w-4 h-4" />
                        {processingOrder?.id === req.id ? 'Processing...' : 'Pay via Razorpay Test'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Verified Payments Ledger */}
      {activeTab === 'VERIFIED_LEDGER' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-ink">Authoritative Verified Payment Ledger</h3>
              <p className="text-xs text-gray-500">Every entry backed by verified HMAC SHA256 signature or authorized bank proof</p>
            </div>
            <span className="text-xs font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded">
              Total Verified: {payments.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100/75 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Request / Invoice</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">HMAC Verified</th>
                  <th className="p-3">Razorpay Ref</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-mono font-bold text-solar-blue">{p.id}</td>
                    <td className="p-3 font-mono text-gray-600">{p.request_id}</td>
                    <td className="p-3">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">{p.method}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-ink">
                      ₹{(p.amount_paise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {p.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-gray-500 text-[11px] truncate max-w-[120px]">
                      {p.razorpay_payment_id || p.reference_number || 'N/A'}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Offline Payment Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-ink">Record Offline Bank / NEFT Payment</h3>
              <button onClick={() => setShowManualModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleRecordOffline} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Select Payment Request</label>
                <select
                  required
                  value={manualReqId}
                  onChange={(e) => setManualReqId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                >
                  <option value="">-- Select Pending Order --</option>
                  {pendingRequests.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id} - {r.description} (₹{(r.amount_paise / 100).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                >
                  <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash Deposit</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  required
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  placeholder="e.g. UTR1234567890"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-solar-blue text-white rounded font-bold shadow-sm"
                >
                  Confirm Ledger Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
