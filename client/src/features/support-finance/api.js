/**
 * API client for Support, Finance & AI module (/api/v1/support-finance)
 */

const BASE_URL = '/api/v1/support-finance';

async function request(endpoint, options = {}, role = 'Admin') {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': role,
    'x-user-id': `USR-${role.toUpperCase()}-01`,
    'x-user-name': `${role} User`,
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.error || `HTTP ${response.status}`;
    const code = data?.error?.code || 'API_ERROR';
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = code;
    err.details = data?.error?.details;
    throw err;
  }

  return data;
}

export const api = {
  // Support & Cases
  getCases: (role) => request('/cases', { method: 'GET' }, role),
  getCaseById: (id, role) => request(`/cases/${id}`, { method: 'GET' }, role),
  createCase: (data, role) => request('/cases', { method: 'POST', body: JSON.stringify(data) }, role),
  postMessage: (caseId, data, role) => request(`/cases/${caseId}/messages`, { method: 'POST', body: JSON.stringify(data) }, role),
  classifyCase: (caseId, data, role) => request(`/cases/${caseId}/classification`, { method: 'PATCH', body: JSON.stringify(data) }, role),
  assignTechnician: (caseId, data, role) => request(`/cases/${caseId}/assign`, { method: 'POST', body: JSON.stringify(data) }, role),
  completeTechnicianWork: (caseId, data, role) => request(`/cases/${caseId}/technician-complete`, { method: 'POST', body: JSON.stringify(data) }, role),
  customerConfirmation: (caseId, data, role) => request(`/cases/${caseId}/customer-confirmation`, { method: 'POST', body: JSON.stringify(data) }, role),
  closeCase: (caseId, data, role) => request(`/cases/${caseId}/close`, { method: 'POST', body: JSON.stringify(data) }, role),

  // Service Tickets & Warranty
  getTicketByCaseId: (caseId, role) => request(`/tickets/by-case/${caseId}`, { method: 'GET' }, role),
  lookupWarranty: (ticketId, role) => request(`/tickets/${ticketId}/warranty-lookup`, { method: 'GET' }, role),
  setCoverageDecision: (ticketId, data, role) => request(`/tickets/${ticketId}/coverage-decision`, { method: 'PATCH', body: JSON.stringify(data) }, role),
  addServiceCharge: (ticketId, data, role) => request(`/tickets/${ticketId}/charges`, { method: 'POST', body: JSON.stringify(data) }, role),

  // Payments
  getPaymentRequests: (role) => request('/payments/requests', { method: 'GET' }, role),
  getPayments: (role) => request('/payments', { method: 'GET' }, role),
  createPaymentOrder: (requestId, role) => request('/payments/orders', { method: 'POST', body: JSON.stringify({ request_id: requestId }) }, role),
  verifyPaymentCallback: (data, role) => request('/payments/verify', { method: 'POST', body: JSON.stringify(data) }, role),
  simulateWebhook: (data, role) => request('/payments/simulate-webhook', { method: 'POST', body: JSON.stringify(data) }, role),
  recordOfflinePayment: (data, role) => request('/payments/offline', { method: 'POST', body: JSON.stringify(data) }, role),

  // Finance
  getInvoices: (role) => request('/finance/invoices', { method: 'GET' }, role),
  getExpenses: (role) => request('/finance/expenses', { method: 'GET' }, role),
  reviewExpense: (id, data, role) => request(`/finance/expenses/${id}/review`, { method: 'PATCH', body: JSON.stringify(data) }, role),
  getTechnicianPay: (role) => request('/finance/technician-pay', { method: 'GET' }, role),
  getSubsidies: (role) => request('/finance/subsidies', { method: 'GET' }, role),
  updateSubsidyChecklist: (id, data, role) => request(`/finance/subsidies/${id}/checklist`, { method: 'PATCH', body: JSON.stringify(data) }, role),
  getProjectProfitability: (projectId, role) => request(`/finance/project-profitability/${projectId}`, { method: 'GET' }, role),

  // Dashboards & Reconciliation
  getDashboardMetrics: (role) => request('/dashboards/metrics', { method: 'GET' }, role),
  reconcilePayments: (role) => request('/dashboards/reconcile', { method: 'POST' }, role),

  // AI Assistant
  getAISummary: (data, role) => request('/ai/summarize', { method: 'POST', body: JSON.stringify(data) }, role),
  checkMissingInfo: (data, role) => request('/ai/missing-info', { method: 'POST', body: JSON.stringify(data) }, role),
  explainWarranty: (data, role) => request('/ai/explain-warranty', { method: 'POST', body: JSON.stringify(data) }, role),
  triageSupport: (data, role) => request('/ai/triage', { method: 'POST', body: JSON.stringify(data) }, role),
  getAILogs: (role) => request('/ai/logs', { method: 'GET' }, role),
};
