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
  UserCheck,
  Briefcase,
  Wrench,
  Package,
  Headphones,
  History,
  Eye,
  Building,
} from 'lucide-react';
import { useAuth } from '../../../shared/context/AuthContext';
import customerSalesApi from '../api/customerSalesApi';

export default function CustomerManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin/Owner';

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [assignmentHistory, setAssignmentHistory] = useState([]);

  // Admin Assignment Modal
  const [assignmentModalCustomer, setAssignmentModalCustomer] = useState(null);
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [assignForm, setAssignForm] = useState({
    sellerId: '',
    technicianId: '',
    warehouseId: '',
    supportId: '',
    notes: '',
  });
  const [assignLoading, setAssignLoading] = useState(false);

  // Customer Public View Modal
  const [publicViewCustomer, setPublicViewCustomer] = useState(null);
  const [publicViewData, setPublicViewData] = useState(null);
  const [publicViewLoading, setPublicViewLoading] = useState(false);

  // Customer Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: 'Ahmedabad',
    addressState: 'Gujarat',
    addressPincode: '380015',
    installationLocation: 'Rooftop Terrace RCC',
    solarRequirement: 'On-Grid Solar System',
    requiredCapacityKw: 5,
    additionalNotes: '',
    electricityConsumerNumber: '',
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await customerSalesApi.createCustomer(formData);
      setSuccess(
        `Customer ${res.data.full_name} (${res.data.customer_code}) registered successfully and queued as PENDING ASSIGNMENT!`
      );
      setIsRegisterOpen(false);
      setFormData({
        fullName: '',
        phone: '',
        email: '',
        addressStreet: '',
        addressCity: 'Ahmedabad',
        addressState: 'Gujarat',
        addressPincode: '380015',
        installationLocation: 'Rooftop Terrace RCC',
        solarRequirement: 'On-Grid Solar System',
        requiredCapacityKw: 5,
        additionalNotes: '',
        electricityConsumerNumber: '',
      });
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    }
  };

  const openDossier = async (customer) => {
    setSelectedCustomer(customer);
    try {
      const res = await customerSalesApi.getCustomer(customer.id);
      setTimeline(res.data.timeline || []);
      setAssignmentHistory(res.data.assignments || []);
    } catch {
      setTimeline([]);
      setAssignmentHistory([]);
    }
  };

  // Open Admin Assignment Panel
  const openAssignModal = async (customer) => {
    setAssignmentModalCustomer(customer);
    setAssignForm({
      sellerId: customer.assigned_seller_id || customer.created_by || '',
      technicianId: customer.assigned_technician_id || '',
      warehouseId: customer.assigned_warehouse_id || '',
      supportId: customer.assigned_support_id || '',
      notes: '',
    });

    try {
      const assigneesRes = await customerSalesApi.getEligibleAssignees();
      setEligibleAssignees(assigneesRes.data || []);
      // Also fetch history
      const dossierRes = await customerSalesApi.getCustomer(customer.id);
      setAssignmentHistory(dossierRes.data?.assignments || []);
    } catch (err) {
      console.error('Error fetching assignees:', err);
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentModalCustomer) return;
    setAssignLoading(true);
    setError(null);
    try {
      const res = await customerSalesApi.assignCustomer(assignmentModalCustomer.id, assignForm);
      setSuccess(`Operational team successfully assigned to ${assignmentModalCustomer.full_name}!`);
      setAssignmentModalCustomer(null);
      loadCustomers();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign team');
    } finally {
      setAssignLoading(false);
    }
  };

  // Open Public Customer View
  const openPublicView = async (customer) => {
    setPublicViewCustomer(customer);
    setPublicViewLoading(true);
    try {
      const res = await customerSalesApi.getCustomerPublicView(customer.id);
      setPublicViewData(res.data);
    } catch (err) {
      setError('Failed to fetch customer view');
    } finally {
      setPublicViewLoading(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return c.assignment_status === 'PENDING_ASSIGNMENT';
    if (statusFilter === 'ASSIGNED') return c.assignment_status === 'ASSIGNED';
    if (statusFilter === 'PARTIAL') return c.assignment_status === 'PARTIALLY_ASSIGNED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Customer & Installation Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized customer registry, role-based assignment engine, and strict operational privacy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56 sm:w-64"
            />
          </div>

          {/* Register Customer Button (Sales & Admin) */}
          {(isAdmin || user?.role === 'Sales') && (
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              <UserPlus className="h-4 w-4" />
              Register Customer
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Customers ({customers.length})
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'PENDING'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400"></span>
          Pending Assignment (
          {customers.filter((c) => c.assignment_status === 'PENDING_ASSIGNMENT').length})
        </button>
        <button
          onClick={() => setStatusFilter('PARTIAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'PARTIAL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-blue-400"></span>
          Partially Assigned (
          {customers.filter((c) => c.assignment_status === 'PARTIALLY_ASSIGNED').length})
        </button>
        <button
          onClick={() => setStatusFilter('ASSIGNED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'ASSIGNED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          Fully Assigned ({customers.filter((c) => c.assignment_status === 'ASSIGNED').length})
        </button>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Authoritative Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Location & Site</th>
                <th className="py-3.5 px-4">Solar Requirement</th>
                <th className="py-3.5 px-4">Registered By</th>
                <th className="py-3.5 px-4">Assignment Status</th>
                <th className="py-3.5 px-4">Assigned Team</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    Loading customer records...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-500">
                    No customers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    {/* Customer Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{c.full_name}</div>
                      <div className="font-mono text-[11px] text-emerald-700 mt-0.5">{c.customer_code}</div>
                      <div className="flex flex-col gap-0.5 mt-1 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" /> {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="h-3 w-3 text-slate-400" /> {c.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {c.address_city}, {c.address_state}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {c.installation_location || c.address_street || 'Terrace / Rooftop'}
                      </div>
                      {c.address_pincode && (
                        <div className="text-[10px] text-slate-400 mt-0.5">PIN: {c.address_pincode}</div>
                      )}
                    </td>

                    {/* Solar Requirement */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        {c.required_capacity_kw || c.sanctioned_load_kw || 3.0} kW
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {c.solar_requirement || 'On-Grid Solar System'}
                      </div>
                    </td>

                    {/* Registered By */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {c.creator_name || 'System Registration'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Assignment Status */}
                    <td className="py-3.5 px-4">
                      {c.assignment_status === 'ASSIGNED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> Fully Assigned
                        </span>
                      ) : c.assignment_status === 'PARTIALLY_ASSIGNED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3" /> Partially Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                          <AlertCircle className="h-3 w-3" /> Pending Assignment
                        </span>
                      )}
                    </td>

                    {/* Assigned Team */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold text-[10px]">
                            Sales
                          </span>
                          <span className="text-slate-700 font-medium">
                            {c.assigned_seller_name || c.creator_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[10px]">
                            Tech
                          </span>
                          <span className="text-slate-700 font-medium">
                            {c.assigned_technician_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-semibold text-[10px]">
                            Warehouse
                          </span>
                          <span className="text-slate-700 font-medium">
                            {c.assigned_warehouse_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[10px]">
                            Support
                          </span>
                          <span className="text-slate-700 font-medium">
                            {c.assigned_support_name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Admin Assignment Trigger */}
                        {isAdmin && (
                          <button
                            onClick={() => openAssignModal(c)}
                            title="Assign Operational Team"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            Assign Team
                          </button>
                        )}

                        {/* Customer-Safe Public View */}
                        <button
                          onClick={() => openPublicView(c)}
                          title="View Customer-Safe Profile"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* 360 Dossier */}
                        <button
                          onClick={() => openDossier(c)}
                          title="View 360° Dossier & History"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        >
                          <ChevronRight className="h-4 w-4" />
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

      {/* =========================================================================
          PHASE 1: CUSTOMER REGISTRATION MODAL
          ========================================================================= */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Register New Customer</h3>
                  <p className="text-xs text-slate-500">
                    Instantly registered and queued into Admin's Pending Customer Assignment list.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="10-digit mobile (e.g. 9876543210)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. customer@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Street Address</label>
                  <input
                    type="text"
                    value={formData.addressStreet}
                    onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Plot / Flat / Society"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.addressCity}
                    onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.addressState}
                    onChange={(e) => setFormData({ ...formData, addressState: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Pincode</label>
                  <input
                    type="text"
                    value={formData.addressPincode}
                    onChange={(e) => setFormData({ ...formData, addressPincode: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Solar Specific Details */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Solar Installation Requirements
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Installation Location *</label>
                    <input
                      type="text"
                      required
                      value={formData.installationLocation}
                      onChange={(e) => setFormData({ ...formData, installationLocation: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Rooftop Terrace 3-Storey RCC"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Solar Requirement Type *</label>
                    <select
                      value={formData.solarRequirement}
                      onChange={(e) => setFormData({ ...formData, solarRequirement: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="On-Grid Solar System">On-Grid Solar System</option>
                      <option value="Hybrid Solar System">Hybrid Solar System (Battery Backup)</option>
                      <option value="Off-Grid Solar System">Off-Grid Solar System</option>
                      <option value="Commercial Rooftop">Commercial Industrial Rooftop</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Required Capacity (kW) *</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={formData.requiredCapacityKw}
                      onChange={(e) => setFormData({ ...formData, requiredCapacityKw: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Electricity Consumer Number</label>
                    <input
                      type="text"
                      value={formData.electricityConsumerNumber}
                      onChange={(e) => setFormData({ ...formData, electricityConsumerNumber: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. UGVCL-99120"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Additional Notes / Remarks</label>
                  <textarea
                    rows="2"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Special requirements, subsidy details, structural preferences..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  Save & Queue to Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 2: ADMIN CUSTOMER ASSIGNMENT MODAL
          ========================================================================= */}
      {assignmentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Operational Team: {assignmentModalCustomer.full_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Allocate dedicated Sales, Technician, Warehouse, and Support personnel to this installation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignmentModalCustomer(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer Summary Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Code</span>
                <p className="font-mono font-bold text-slate-800">{assignmentModalCustomer.customer_code}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Capacity</span>
                <p className="font-bold text-emerald-600">
                  {assignmentModalCustomer.required_capacity_kw || assignmentModalCustomer.sanctioned_load_kw || 3.0} kW
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Location</span>
                <p className="text-slate-700 truncate">{assignmentModalCustomer.address_city}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Registered By</span>
                <p className="text-slate-700 truncate">{assignmentModalCustomer.creator_name || 'Seller'}</p>
              </div>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              {/* 1. Seller / Sales Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  1. Sales Representative / Seller
                </label>
                <select
                  value={assignForm.sellerId}
                  onChange={(e) => setAssignForm({ ...assignForm, sellerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Sales Representative --</option>
                  {eligibleAssignees
                    .filter((u) => u.role === 'Sales')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                </select>
                {eligibleAssignees.filter((u) => u.role === 'Sales').length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No active Sales representatives found.</p>
                )}
              </div>

              {/* 2. Technician Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  2. Lead Field Technician
                </label>
                <select
                  value={assignForm.technicianId}
                  onChange={(e) => setAssignForm({ ...assignForm, technicianId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Field Technician --</option>
                  {eligibleAssignees
                    .filter((u) => u.role === 'Technician')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.email})
                      </option>
                    ))}
                </select>
                {eligibleAssignees.filter((u) => u.role === 'Technician').length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No active Technicians found in system.</p>
                )}
              </div>

              {/* 3. Warehouse Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Package className="h-4 w-4 text-purple-500" />
                  3. Warehouse Manager / Fulfilment Lead
                </label>
                <select
                  value={assignForm.warehouseId}
                  onChange={(e) => setAssignForm({ ...assignForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Warehouse Manager --</option>
                  {eligibleAssignees
                    .filter((u) => u.role === 'Warehouse')
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.fullName} ({w.email})
                      </option>
                    ))}
                </select>
                {eligibleAssignees.filter((u) => u.role === 'Warehouse').length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No active Warehouse managers found.</p>
                )}
              </div>

              {/* 4. Support Dropdown */}
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Headphones className="h-4 w-4 text-teal-500" />
                  4. Support Executive / Customer Care
                </label>
                <select
                  value={assignForm.supportId}
                  onChange={(e) => setAssignForm({ ...assignForm, supportId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Support Officer --</option>
                  {eligibleAssignees
                    .filter((u) => u.role === 'Support')
                    .map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.fullName} ({sp.email})
                      </option>
                    ))}
                </select>
                {eligibleAssignees.filter((u) => u.role === 'Support').length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No active Support executives found.</p>
                )}
              </div>

              {/* Assignment Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Assignment Directives & Notes</label>
                <textarea
                  rows="2"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Assigned priority installation crew for swift rooftop commissioning."
                />
              </div>

              {/* Assignment History Section */}
              {assignmentHistory.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1 mb-2">
                    <History className="h-3.5 w-3.5 text-slate-500" />
                    Past Assignment History
                  </span>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {assignmentHistory.map((h) => (
                      <div key={h.id} className="p-2 bg-slate-50 rounded-lg text-[11px] border border-slate-200">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Assigned by: {h.assigned_by_name || 'Admin'}</span>
                          <span>{new Date(h.assigned_at).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-800 font-medium mt-1">
                          Sales: {h.seller_name || '—'} | Tech: {h.technician_name || '—'} | WH: {h.warehouse_name || '—'} | Support: {h.support_name || '—'}
                        </div>
                        {h.assignment_notes && <p className="text-slate-600 italic mt-0.5">{h.assignment_notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignmentModalCustomer(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {assignLoading ? 'Saving...' : 'Save & Distribute Tasks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PHASE 3.E: AUTHORIZED CUSTOMER PUBLIC VIEW MODAL
          ========================================================================= */}
      {publicViewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Customer Verified Solar Profile</h3>
                  <p className="text-[11px] text-slate-500">Authorized view provided to customer</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPublicViewCustomer(null);
                  setPublicViewData(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {publicViewLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading customer profile...</div>
            ) : publicViewData ? (
              <div className="space-y-4 text-xs">
                {/* Header card */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-800 font-bold">{publicViewData.customerCode}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200">
                      {publicViewData.assignmentStatus}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 mt-1">{publicViewData.fullName}</h4>
                  <p className="text-slate-600 mt-0.5">
                    {publicViewData.addressCity}, {publicViewData.addressState}
                  </p>
                  <div className="mt-2 text-xs font-semibold text-emerald-900">
                    System: {publicViewData.solarRequirement} ({publicViewData.requiredCapacityKw} kW)
                  </div>
                </div>

                {/* Assigned Operational Team (Customer-Safe details) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Your Assigned Installation Team
                  </span>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sales Consultant:</span>
                      <span className="font-semibold text-slate-900">
                        {publicViewData.assignedTeam?.salesRepresentative?.name || 'Assigned Representative'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lead Field Technician:</span>
                      <span className="font-semibold text-slate-900">
                        {publicViewData.assignedTeam?.leadTechnician?.name || 'Pending Site Scheduling'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dispatch & Fulfilment:</span>
                      <span className="font-semibold text-slate-900">
                        {publicViewData.assignedTeam?.warehouseManager?.name || 'Warehouse Operations'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Customer Support Officer:</span>
                      <span className="font-semibold text-slate-900">
                        {publicViewData.assignedTeam?.customerSupportOfficer?.name || 'Helpdesk Support'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <ShieldCheck className="h-4 w-4 text-amber-600" /> Data Privacy Safeguard
                  </div>
                  Direct employee phone numbers and confidential system records are restricted to protect employee privacy.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER 360 DOSSIER MODAL
          ========================================================================= */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-mono text-[11px] mb-1 font-bold">
                  {selectedCustomer.customer_code}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.full_name}</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Contact</span>
                <p className="text-sm text-slate-900 font-semibold mt-1">{selectedCustomer.phone}</p>
                <p className="text-xs text-slate-500">{selectedCustomer.email || 'No email provided'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Installation Site</span>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {selectedCustomer.installation_location || selectedCustomer.address_street || 'Rooftop Site'},{' '}
                  {selectedCustomer.address_city}, {selectedCustomer.address_state} - {selectedCustomer.address_pincode}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Solar Requirement</span>
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  {selectedCustomer.required_capacity_kw || selectedCustomer.sanctioned_load_kw || 3.0} kW (
                  {selectedCustomer.solar_requirement || 'On-Grid'})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consumer No: {selectedCustomer.electricity_consumer_number || 'Pending verification'}
                </p>
              </div>
            </div>

            {/* Interactive Chronological Timeline */}
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Customer Lifecycle Timeline
            </h4>

            <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timeline.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No timeline events recorded yet.</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="absolute -left-[23px] top-4 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{event.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[9px]">
                      {event.event_type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
