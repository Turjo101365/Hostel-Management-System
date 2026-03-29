import { mockLeaveRequests, mockStudents } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const leaveService = {
  getAll: async () => {
    await delay(500)
    return { data: mockLeaveRequests }
  },

  getById: async (id) => {
    await delay(300)
    const request = mockLeaveRequests.find(l => l.id === id)
    return { data: request }
  },

  create: async (data) => {
    await delay(500)
    const student = mockStudents.find(s => s.student_id === data.student_id)
    const newRequest = {
      ...data,
      id: mockLeaveRequests.length + 1,
      leave_id: `L00${mockLeaveRequests.length + 1}`,
      student_name: student?.name || 'Unknown',
      status: 'Pending'
    }
    return { data: newRequest }
  },

  updateStatus: async (id, status) => {
    await delay(500)
    const index = mockLeaveRequests.findIndex(l => l.id === id)
    if (index !== -1) {
      return { data: { ...mockLeaveRequests[index], status } }
    }
    throw new Error('Request not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default leaveService

