import { mockRooms } from '../utils/mockData'

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const roomService = {
  getAll: async () => {
    await delay(500)
    return { data: mockRooms }
  },

  getById: async (id) => {
    await delay(300)
    const room = mockRooms.find(r => r.id === id)
    return { data: room }
  },

  create: async (data) => {
    await delay(500)
    const newRoom = {
      ...data,
      id: mockRooms.length + 1,
      room_id: `R00${mockRooms.length + 1}`,
      status: data.current_occupancy >= data.capacity ? 'Full' : data.current_occupancy > 0 ? 'Partial' : 'Available'
    }
    return { data: newRoom }
  },

  update: async (id, data) => {
    await delay(500)
    const index = mockRooms.findIndex(r => r.id === id)
    if (index !== -1) {
      return { data: { ...mockRooms[index], ...data } }
    }
    throw new Error('Room not found')
  },

  delete: async (id) => {
    await delay(500)
    return { data: { success: true } }
  }
}

export default roomService

