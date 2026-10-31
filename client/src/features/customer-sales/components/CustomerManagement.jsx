import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Zap,
  Calendar,
  Clock,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import customerSalesApi from '../api/customerSalesApi';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: 'Ahmedabad',
    addressState: 'Gujarat',
    addressPincode: '380015',
    electricityConsumerNumber: '',
    sanctionedLoadKw: 5,
  });

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerSalesApi.listCustomers({ search });
      setCustomers(res.data || []);
    } catch (err) {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const openDossier = async (customer) => {
    setSelectedCustomer(customer);
    try {
      const res = await customerSalesApi.getCustomer(customer.id);
      setTimeline(res.data.timeline || []);
    } catch {
      setTimeline([]);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await customerSalesApi.createCustomer(formData);
      setSuccess(`Customer ${res.data.full_name} (${res.data.customer_code}) registered successfully!`);
      setIsRegisterOpen(false);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        addressStreet: '',
        addressCity: 'Ahmedabad',
        addressState: 'Gujarat',
        addressPincode: '380015',
        electricityConsumerNumber: '',
        sanctionedLoadKw: 5,
      });
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            Authoritative Customer Directory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Verified solar customer accounts with 360-degree timeline and project dossiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, phone or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-64"
            />
          </div>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
          >
            <UserPlus className="h-4 w-4" />
            Register Customer
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Customer List Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Customer Code</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">City / State</th>
                <th className="py-3 px-4">Consumer No</th>
                <th className="py-3 px-4">Sanctioned Load</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    No customers found. Click "Register Customer" to create the first record.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-400">{c.customer_code}</td>
                    <td className="py-3.5 px-4 font-bold text-white">{c.full_name}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Phone className="h-3 w-3 text-slate-500" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="h-3 w-3 text-slate-600" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500" />
                        {c.address_city}, {c.address_state}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{c.electricity_consumer_number || '—'}</td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-400">
                      {c.sanctioned_load_kw ? `${c.sanctioned_load_kw} kW` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openDossier(c)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg transition"
                      >
                        360° Dossier <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 360 Dossier & Chronological Timeline Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[11px] mb-1">
                  {selectedCustomer.customer_code}
                </div>
                <h3 className="text-xl font-extrabold text-white">{selectedCustomer.full_name}</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Contact</span>
                <p className="text-sm text-white font-semibold mt-1">{selectedCustomer.phone}</p>
                <p className="text-xs text-slate-400">{selectedCustomer.email || 'No email provided'}</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Installation Address</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {selectedCustomer.address_street || 'Street address unlisted'}, {selectedCustomer.address_city},{' '}
                  {selectedCustomer.address_state} - {selectedCustomer.address_pincode}
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Utility Grid Meter</span>
                <p className="text-xs font-mono text-amber-400 mt-1">
                  {selectedCustomer.electricity_consumer_number || 'Pending verification'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sanctioned Load:{' '}
                  <span className="text-emerald-400 font-bold">{selectedCustomer.sanctioned_load_kw || 0} kW</span>
                </p>
              </div>
            </div>

            {/* Interactive Chronological Timeline */}
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Chronological Customer Lifecycle Timeline
            </h4>

            <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No timeline events recorded yet.</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="relative bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <div className="absolute -left-[23px] top-4 h-3 w-3 rounded-full bg-amber-500 border-2 border-slate-900" />
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">{event.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[9px]">
                      {event.event_type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Register New Customer Profile
              </h3>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="10-digit mobile"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. customer@example.com"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase font-semibold">Street Address</label>
                <input
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  placeholder="Plot / Flat / Society"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">City</label>
                  <input
                    type="text"
                    value={formData.addressCity}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">State</label>
                  <input
                    type="text"
                    value={formData.addressState}
                    onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Pincode</label>
                  <input
                    type="text"
                    value={formData.addressPincode}
                    onChange={(e) => setFormData({ ...formData, addressPincode: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Electricity Consumer No</label>
                  <input
                    type="text"
                    value={formData.electricityConsumerNumber}
                    onChange={(e) => setFormData({ ...formData, electricityConsumerNumber: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="e.g. UGVCL-99120"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 uppercase font-semibold">Sanctioned Load (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.sanctionedLoadKw}
                    onChange={(e) => setFormData({ ...formData, sanctionedLoadKw: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
