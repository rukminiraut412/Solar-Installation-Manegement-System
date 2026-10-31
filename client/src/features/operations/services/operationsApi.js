/**
 * Operations & Fulfilment API Client
 * Connects frontend screens to backend /api/v1/operations/ endpoints
 * Handles JWT Authorization headers, standardized response envelopes, and error formatting
 * Authority: docs/contracts/operations.md
 */

const API_BASE = '/api/v1/operations';

function getAuthHeaders() {
  const token = localStorage.getItem('accessToken') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, config);
    const json = await res.json();
    if (!res.ok) {
      const error = new Error(json.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = json.error?.code || 'API_ERROR';
      error.details = json.error?.details || null;
      throw error;
    }
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    // If backend endpoint is offline or unavailable during standalone dev preview,
    // provide resilient fallback data matching 102_operations.sql seed
    console.warn(`[Operations API] Error calling ${endpoint}:`, err.message);
    throw err;
  }
}

export const operationsApi = {
  // Phase 1: Products & Inventory
  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getCategories: () => request('/products/categories'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  getInventory: () => request('/inventory'),
  getLedgerHistory: () => request('/inventory/ledger'),
  receiveGoods: (data) => request('/inventory/grn', { method: 'POST', body: JSON.stringify(data) }),
  adjustStock: (data) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  // Phase 2: Stock Reservation & Shortages
  ingestProjectBom: (data) => request('/projects/handover', { method: 'POST', body: JSON.stringify(data) }),
  getProjectBom: (projectId) => request(`/projects/${projectId}/bom`),
  reserveStock: (projectId, data = {}) => request(`/projects/${projectId}/reserve-stock`, { method: 'POST', body: JSON.stringify(data) }),
  releaseStock: (projectId) => request(`/projects/${projectId}/release-stock`, { method: 'POST' }),
  getShortages: () => request('/shortages'),

  // Phase 3: Serial Numbers & Barcodes
  registerSerials: (data) => request('/serials/batch', { method: 'POST', body: JSON.stringify(data) }),
  listSerials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/serials${query ? `?${query}` : ''}`);
  },
  getSerialTraceability: (serialNumber) => request(`/serials/${encodeURIComponent(serialNumber)}/trace`),
  verifySerialForDispatch: (dispatchOrderId, serialNumber) =>
    request(`/dispatch/${dispatchOrderId}/verify-serial`, { method: 'POST', body: JSON.stringify({ serialNumber }) }),
  quarantineSerial: (serialNumber, data) =>
    request(`/serials/${encodeURIComponent(serialNumber)}/quarantine`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 2 (Cont.): Dispatch & Delivery
  createDispatch: (data) => request('/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  listDispatchOrders: () => request('/dispatch'),
  confirmDispatch: (id) => request(`/dispatch/${id}/confirm`, { method: 'POST' }),
  confirmDelivery: (id, data) => request(`/dispatch/${id}/deliver`, { method: 'POST', body: JSON.stringify(data) }),
  getDeliveryChallan: (id) => request(`/dispatch/${id}/challan`),

  // Phase 4: Technicians & Availability
  getRoster: () => request('/technicians/roster'),
  getAvailability: (date, slot = 'FULL_DAY', skill = '') => {
    const params = new URLSearchParams({ date, slot });
    if (skill) params.set('skill', skill);
    return request(`/technicians/availability?${params.toString()}`);
  },
  scheduleCrew: (data) => request('/installations/schedule', { method: 'POST', body: JSON.stringify(data) }),

  // Phase 5: Installation Job Cards & Safety
  getJobCard: (id) => request(`/installations/${id}`),
  updateCheckpoint: (id, data) => request(`/installations/${id}/checkpoints`, { method: 'POST', body: JSON.stringify(data) }),
  recordSafetyTests: (id, data) => request(`/installations/${id}/testing`, { method: 'POST', body: JSON.stringify(data) }),
  uploadPhoto: (id, data) => request(`/installations/${id}/photos`, { method: 'POST', body: JSON.stringify(data) }),
  signHandover: (id, data) => request(`/installations/${id}/sign-handover`, { method: 'POST', body: JSON.stringify(data) }),

  // Phase 6: Warranty Management
  getWarranty: (serialNumber) => request(`/warranties/${encodeURIComponent(serialNumber)}`),
  activateWarranty: (serialNumber, data) => request(`/warranties/${encodeURIComponent(serialNumber)}/activate`, { method: 'POST', body: JSON.stringify(data) }),
  createClaim: (data) => request('/warranties/claims', { method: 'POST', body: JSON.stringify(data) }),
  listClaims: () => request('/warranties/claims')
};
