import { mockFees } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const feeService = {
  getAll: async () => {
    await delay(500)
    return { data: mockFees }
  },

  getById: async (id) => {
    await delay(300)
    const fee = mockFees.find(f => f.id === id)
    return { data: fee }
  },

  create: async (data) => {
    await delay(500)
    const newFee = {
      ...data,
      id: mockFees.length + 1,
      fee_id: `FEE00${mockFees.length + 1}`
    }
    return { data: newFee }
  },

  update: async (id, data) => {
    await delay(500)
    const index = mockFees.findIndex(f => f.id === id)
    if (index !== -1) {
      return { data: { ...mockFees[index], ...data } }
    }
    throw new Error('Fee not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default feeService

