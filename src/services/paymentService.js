import { mockPayments, mockStudents } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const paymentService = {
  getAll: async () => {
    await delay(500)
    return { data: mockPayments }
  },

  getById: async (id) => {
    await delay(300)
    const payment = mockPayments.find(p => p.id === id)
    return { data: payment }
  },

  create: async (data) => {
    await delay(500)
    const student = mockStudents.find(s => s.student_id === data.student_id)
    const newPayment = {
      ...data,
      id: mockPayments.length + 1,
      payment_id: `PAY00${mockPayments.length + 1}`,
      student_name: student?.name || 'Unknown',
      payment_date: new Date().toISOString().split('T')[0],
      status: 'Paid'
    }
    return { data: newPayment }
  },

  update: async (id, data) => {
    await delay(500)
    const index = mockPayments.findIndex(p => p.id === id)
    if (index !== -1) {
      return { data: { ...mockPayments[index], ...data } }
    }
    throw new Error('Payment not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default paymentService

