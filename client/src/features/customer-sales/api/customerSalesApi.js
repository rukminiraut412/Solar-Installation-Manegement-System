/**
 * Customer Management API Client
 * Scope: Independent Customer Management & Solar Installation Requirements Workflow
 * Authority: SOLAR_MANAGEMENT_SYSTEM.md & System Contracts
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
  // 1. Customer Core CRUD & Directory
  createCustomer: (data) => api.post('/customers', data).then((r) => r.data),
  listCustomers: (params) => api.get('/customers', { params }).then((r) => r.data),
  getCustomer: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data).then((r) => r.data),
  getCustomerTimeline: (id) => api.get(`/customers/${id}/timeline`).then((r) => r.data),
  assignCustomer: (id, data) => api.post(`/customers/${id}/assign`, data).then((r) => r.data),
  getEligibleAssignees: () => api.get('/assignees').then((r) => r.data),
  getCustomerPublicView: (id) => api.get(`/customers/${id}/public-view`).then((r) => r.data),

  // 2. Customer Installation Requirements & Engineering Workflow
  saveInstallationRequirements: (data) => api.post('/requirements', data).then((r) => r.data),
  getMyRequirements: () => api.get('/requirements/me').then((r) => r.data),
  listRequirements: (params) => api.get('/requirements', { params }).then((r) => r.data),
  getCustomerRequirements: (id) => api.get(`/customers/${id}/requirements`).then((r) => r.data),
  reviewCustomerRequirements: (id, data) => api.post(`/customers/${id}/requirements/review`, data).then((r) => r.data),
};

export default customerSalesApi;
