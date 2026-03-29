import { mockMessMenu } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const messService = {
  getAll: async () => {
    await delay(500)
    return { data: mockMessMenu }
  },

  getByDay: async (day) => {
    await delay(300)
    const menu = mockMessMenu.find(m => m.day === day)
    return { data: menu }
  },

  update: async (day, data) => {
    await delay(500)
    const index = mockMessMenu.findIndex(m => m.day === day)
    if (index !== -1) {
      return { data: { ...mockMessMenu[index], ...data } }
    }
    throw new Error('Menu not found')
  }
}

export default messService

