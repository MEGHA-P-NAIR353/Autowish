import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 — try token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refresh_token')
    ) {
      originalRequest._retry = true;
      try {
        const refreshResp = await axios.post(`${API_BASE}/auth/refresh/`, {
          refresh: localStorage.getItem('refresh_token'),
        });
        const newAccess = refreshResp.data.access;
        localStorage.setItem('access_token', newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed → clear auth and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('auth/login/', { email, password }),
  register: (data) => api.post('auth/register/', data),
  refresh: (refresh) => api.post('auth/refresh/', { refresh }),
  verifyEmail: (token) => api.post('auth/verify-email/', { token }),
  forgotPassword: (email) => api.post('auth/forgot-password/', { email }),
  resetPassword: (data) => api.post('auth/reset-password/', data),
  changePassword: (data) => api.post('auth/change-password/', data),
  getProfile: () => api.get('auth/profile/'),
  updateProfile: (data) => api.patch('auth/profile/', data),
  uploadAvatar: (formData) =>
    api.post('auth/profile/avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAccount: (password) => api.delete('auth/delete-account/', { data: { password } }),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('dashboard/stats/'),
  getRecentActivity: (params = {}) => api.get('dashboard/recent-activity/', { params }),
};

// ─── Greeting Analytics ────────────────────────────────────────────────────────
export const analyticsAPI = {
  getGreetings: () => api.get('analytics/greetings/'),
};

// ─── Contacts ────────────────────────────────────────────────────────────────
export const contactsAPI = {
  getAll: (params = {}) => api.get('contacts/', { params }),
  get: (id) => api.get(`contacts/${id}/`),
  create: (data) => api.post('contacts/', data),
  update: (id, data) => api.patch(`contacts/${id}/`, data),
  delete: (id) => api.delete(`contacts/${id}/`),
  importCSV: (formData) =>
    api.post('contacts/import_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportCSV: () =>
    api.get('contacts/export_csv/', { responseType: 'blob' }),
  getFavorites: () => api.get('contacts/favorites/'),
  toggleFavorite: (id) => api.post(`contacts/${id}/toggle_favorite/`),
};

// ─── Events ──────────────────────────────────────────────────────────────────
export const eventsAPI = {
  getAll: (params = {}) => api.get('events/', { params }),
  get: (id) => api.get(`events/${id}/`),
  create: (data) => api.post('events/', data),
  update: (id, data) => api.patch(`events/${id}/`, data),
  delete: (id) => api.delete(`events/${id}/`),
  getUpcoming: () => api.get('events/upcoming/'),
};

// ─── Templates ───────────────────────────────────────────────────────────────
export const templatesAPI = {
  getAll: (params = {}) => api.get('templates/', { params }),
  get: (id) => api.get(`templates/${id}/`),
  create: (data) => api.post('templates/', data),
  update: (id, data) => api.patch(`templates/${id}/`, data),
  delete: (id) => api.delete(`templates/${id}/`),
  toggleFavorite: (id) => api.post(`templates/${id}/toggle_favorite/`),
};

// ─── Scheduled Wishes ────────────────────────────────────────────────────────
export const scheduledAPI = {
  getAll: (params = {}) => api.get('scheduled/', { params }),
  get: (id) => api.get(`scheduled/${id}/`),
  create: (data) => api.post('scheduled/', data),
  update: (id, data) => api.patch(`scheduled/${id}/`, data),
  delete: (id) => api.delete(`scheduled/${id}/`),
  cancel: (id) => api.post(`scheduled/${id}/cancel/`),
};

// ─── Enterprise Schedules ───────────────────────────────────────────────────
export const schedulesAPI = {
  getAll: (params = {}) => api.get('schedules/', { params }),
  get: (id) => api.get(`schedules/${id}/`),
  create: (data) => api.post('schedules/', data),
  update: (id, data) => api.put(`schedules/${id}/`, data),
  patch: (id, data) => api.patch(`schedules/${id}/`, data),
  delete: (id) => api.delete(`schedules/${id}/`),
  cancel: (id) => api.patch(`schedules/${id}/cancel/`),
  resume: (id) => api.patch(`schedules/${id}/resume/`),
  duplicate: (id) => api.post(`schedules/${id}/duplicate/`),
  logs: (id) => api.get(`schedules/${id}/logs/`),
  getDashboard: () => api.get('schedules/dashboard/'),
};

// ─── Email Logs ──────────────────────────────────────────────────────────────
export const logsAPI = {
  getAll: (params = {}) => api.get('logs/', { params }),
  get: (id) => api.get(`logs/${id}/`),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params = {}) => api.get('notifications/', { params }),
  markRead: (id) => api.post(`notifications/${id}/mark_read/`),
  markAllRead: () => api.post('notifications/mark_all_read/'),
  delete: (id) => api.delete(`notifications/${id}/`),
  getUnreadCount: () => api.get('notifications/unread_count/'),
};

// ─── AI ──────────────────────────────────────────────────────────────────────
export const aiAPI = {
  generateGreeting: (data) => api.post('ai/generate/', data),
  sendGreeting: (data) => api.post('ai/send/', data),
  scheduleGreeting: (data) => api.post('ai/schedule/', data),
  saveTemplate: (data) => api.post('ai/template/', data),
};

// ─── Subscriptions & Payments ────────────────────────────────────────────────
export const subscriptionAPI = {
  getPlans: () => api.get('subscriptions/plans/'),
  checkout: (data) => api.post('payments/checkout/', data),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminAPI = {
  getDashboardStats: () => api.get('admin/dashboard/stats/'),
  getUsers: (params = {}) => api.get('admin/users/', { params }),
  getUser: (id) => api.get(`admin/users/${id}/`),
  updateUser: (id, data) => api.patch(`admin/users/${id}/`, data),
  toggleUserStatus: (id) => api.post(`admin/users/${id}/toggle_status/`),
  deleteUser: (id) => api.delete(`admin/users/${id}/`),
  getPrompts: (params = {}) => api.get('admin/prompts/', { params }),
  createPrompt: (data) => api.post('admin/prompts/', data),
  updatePrompt: (id, data) => api.patch(`admin/prompts/${id}/`, data),
  deletePrompt: (id) => api.delete(`admin/prompts/${id}/`),
  getAuditLogs: (params = {}) => api.get('admin/audit-logs/', { params }),
};
