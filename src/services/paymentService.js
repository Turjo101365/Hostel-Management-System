import api from './api'

export const paymentService = {
  // Get all payment requests (admin view)
  getAll: async ({ status } = {}) => {
    const url = status ? `/payments?status=${encodeURIComponent(status)}` : '/payments'
    const response = await api.get(url)
    return response.data
  },

  // Get payment by ID
  getById: async (id) => {
    const response = await api.get(`/payments/${id}`)
    return response.data
  },

  // Verify payment (mark as received/verified)
  verify: async (id) => {
    const response = await api.put(`/payments/${id}/verify`)
    return response.data
  },

  // Reject payment
  reject: async (id, reason) => {
    const response = await api.put(`/payments/${id}/reject`, { reason })
    return response.data
  },
}

export default paymentService

