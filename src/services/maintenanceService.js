import { mockMaintenanceRequests } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const maintenanceService = {
  getAll: async () => {
    await delay(500)
    return { data: mockMaintenanceRequests }
  },

  getById: async (id) => {
    await delay(300)
    const request = mockMaintenanceRequests.find(m => m.id === id)
    return { data: request }
  },

  create: async (data) => {
    await delay(500)
    const newRequest = {
      ...data,
      id: mockMaintenanceRequests.length + 1,
      request_id: `M00${mockMaintenanceRequests.length + 1}`,
      date_reported: new Date().toISOString().split('T')[0],
      status: 'Pending'
    }
    return { data: newRequest }
  },

  updateStatus: async (id, status) => {
    await delay(500)
    const index = mockMaintenanceRequests.findIndex(m => m.id === id)
    if (index !== -1) {
      return { data: { ...mockMaintenanceRequests[index], status } }
    }
    throw new Error('Request not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default maintenanceService

