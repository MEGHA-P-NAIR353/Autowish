import api from './api'

export const contactsAPI = {
    getAll: (params = {}) => api.get('contacts/', { params }),
    get: (id) => api.get(`contacts/${id}/`),
    create: (data) => api.post('contacts/', data),
    update: (id, data) => api.patch(`contacts/${id}/`, data),
    delete: (id) => api.delete(`contacts/${id}/`),
    toggleFavorite: (id) => api.post(`contacts/${id}/toggle-favorite/`),
    importCSV: (file) => {
        const fd = new FormData()
        fd.append('file', file)
        return api.post('contacts/import-csv/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    exportCSV: () => api.get('contacts/export-csv/', { responseType: 'blob' })
}
