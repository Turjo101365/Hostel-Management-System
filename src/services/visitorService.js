import { mockVisitors } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const visitorService = {
  getAll: async () => {
    await delay(500)
    return { data: mockVisitors }
  },

  getById: async (id) => {
    await delay(300)
    const visitor = mockVisitors.find(v => v.id === id)
    return { data: visitor }
  },

  create: async (data) => {
    await delay(500)
    const newVisitor = {
      ...data,
      id: mockVisitors.length + 1,
      visitor_id: `V00${mockVisitors.length + 1}`,
      entry_time: new Date().toISOString(),
      exit_time: null
    }
    return { data: newVisitor }
  },

  checkOut: async (id) => {
    await delay(500)
    return { data: { exit_time: new Date().toISOString() } }
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default visitorService

