/**
 * Customer & Sales API Client
 * Ownership: Member 2 (Customer & Sales)
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & docs/contracts/customer-sales.md
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/customer-sales',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token from localStorage if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customerSalesApi = {
  // Customers
  createCustomer: (data) => api.post('/customers', data).then((r) => r.data),
  listCustomers: (params) => api.get('/customers', { params }).then((r) => r.data),
  getCustomer: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data),
  getCustomerTimeline: (id) => api.get(`/customers/${id}/timeline`).then((r) => r.data),
  assignCustomer: (id, data) => api.post(`/customers/${id}/assign`, data).then((r) => r.data),
  getEligibleAssignees: () => api.get('/assignees').then((r) => r.data),
  getCustomerPublicView: (id) => api.get(`/customers/${id}/public-view`).then((r) => r.data),


  // Enquiries
  createEnquiry: (data) => api.post('/enquiries', data).then((r) => r.data),
  createPublicEnquiry: (data) => api.post('/public/enquiries', data).then((r) => r.data),
  listEnquiries: (params) => api.get('/enquiries', { params }).then((r) => r.data),
  getEnquiry: (id) => api.get(`/enquiries/${id}`).then((r) => r.data),
  assignEnquiry: (id, assignedTo) => api.patch(`/enquiries/${id}/assign`, { assignedTo }).then((r) => r.data),
  recordFollowUp: (id, data) => api.post(`/enquiries/${id}/follow-ups`, data).then((r) => r.data),
  qualifyEnquiry: (id, data) => api.post(`/enquiries/${id}/qualify`, data).then((r) => r.data),
  disqualifyEnquiry: (id, reason) => api.post(`/enquiries/${id}/disqualify`, { reason }).then((r) => r.data),
  mergeEnquiry: (id, data) => api.post(`/enquiries/${id}/merge`, data).then((r) => r.data),

  // Site Surveys
  getAvailableTechnicians: (date, slot) =>
    api.get('/surveys/technicians/availability', { params: { date, slot } }).then((r) => r.data),
  requestSurvey: (data) => api.post('/surveys/request', data).then((r) => r.data),
  executeSurvey: (id, data) => api.post(`/surveys/${id}/execute`, data).then((r) => r.data),
  reviewSurvey: (id, data) => api.post(`/surveys/${id}/review`, data).then((r) => r.data),
  getSurvey: (id) => api.get(`/surveys/${id}`).then((r) => r.data),
  listSurveys: (params) => api.get('/surveys', { params }).then((r) => r.data),

  // Packages & Quotations
  listPackages: () => api.get('/packages').then((r) => r.data),
  previewBOM: (data) => api.post('/quotations/preview-bom', data).then((r) => r.data),
  createQuotation: (data) => api.post('/quotations', data).then((r) => r.data),
  sendQuotation: (id) => api.post(`/quotations/${id}/send`).then((r) => r.data),
  getQuotation: (id) => api.get(`/quotations/${id}`).then((r) => r.data),
  listQuotations: (params) => api.get('/quotations', { params }).then((r) => r.data),

  // Public Portal (no auth)
  getPublicQuotation: (token) => api.get(`/public/quotations/${token}`).then((r) => r.data),
  acceptPublicQuotation: (token, data) => api.post(`/public/quotations/${token}/accept`, data).then((r) => r.data),
  declinePublicQuotation: (token, data) => api.post(`/public/quotations/${token}/decline`, data).then((r) => r.data),

  // Orders & Handover
  createOrderFromQuote: (data) => api.post('/orders/create-from-quote', data).then((r) => r.data),
  getOrder: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  listOrders: (params) => api.get('/orders', { params }).then((r) => r.data),
  getHandoverPayload: (orderId) => api.get(`/handover/${orderId}`).then((r) => r.data),

  // Operations stock reservation trigger (Member 3 API)
  reserveStock: (projectId) => axios.post(`/api/v1/operations/projects/${projectId}/reserve-stock`).then((r) => r.data),

  // Finance payment order initiation (Member 4 API)
  createPaymentOrder: (orderId, idempotencyKey) =>
    axios.post(
      '/api/v1/support-finance/payments/create-order',
      { order_id: orderId, purpose: 'ADVANCE' },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    ).then((r) => r.data),
};

export default customerSalesApi;
