import api from './api';

// ─── Card Templates ───────────────────────────────────────────────────────────
export const cardTemplatesAPI = {
  getAll: (params = {}) => api.get('card-templates/', { params }),
  get: (id) => api.get(`card-templates/${id}/`),
  getCategories: () => api.get('card-templates/categories/'),
};

// ─── Greeting Cards ───────────────────────────────────────────────────────────
export const cardsAPI = {
    getAll: (params = {}) => api.get('cards/', { params }),
    get: (id) => api.get(`cards/${id}/`),
    create: (formData) =>
        api.post('cards/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) =>
        api.patch(`cards/${id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => api.delete(`cards/${id}/`),

    // Custom actions
    duplicate: (id) => api.post(`cards/${id}/duplicate/`),
    favorite: (id) => api.post(`cards/${id}/favorite/`),
    archive: (id) => api.post(`cards/${id}/archive/`),
    publish: (id) => api.post(`cards/${id}/publish/`),
    savePreview: (id, previewBase64) =>
        api.post(`cards/${id}/save-preview/`, { preview_base64: previewBase64 }),
    exportCard: (id, format = 'png') =>
        api.get(`cards/${id}/export/`, { params: { format }, responseType: 'blob' }),
    sendCard: (id, contactId) => api.post(`cards/${id}/send/`, { contact_id: contactId }),

    // Filtered helpers
    getMyCards: (params = {}) => api.get('cards/', { params: { ...params } }),
    getDrafts: () => api.get('cards/', { params: { status: 'draft' } }),
    getPublished: () => api.get('cards/', { params: { status: 'published' } }),
    getFavorites: () => api.get('cards/', { params: { is_favorite: 'true' } }),

    // Image upload
    uploadImage: (file) => {
        const fd = new FormData();
        fd.append('image', file);
        return api.post('cards/upload-image/', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// ─── AI Message Generation (Reuses Production AI Pipeline) ───────────────────
export const cardAIAPI = {
  generateMessage: async (data) => {
    const payload = {
      recipient_name: data.recipient_name || 'Friend',
      occasion: data.occasion || 'Birthday',
      tone: data.tone || 'Warm',
      language: data.language || 'en',
      relationship: data.relationship || 'Friend',
      age: data.age ? parseInt(data.age, 10) : null,
      interests: Array.isArray(data.interests)
        ? data.interests
        : typeof data.interests === 'string'
        ? data.interests.split(',').map((i) => i.trim()).filter(Boolean)
        : [],
      custom_context: data.custom_context || data.notes || '',
      mode: 'card',
    };
    const response = await api.post('ai/generate/', payload);
    const text = response.data.greeting || response.data.message || '';
    return {
      ...response,
      data: {
        ...response.data,
        message: text,
        greeting: text,
      },
    };
  },
};
