import api from './api'

const fetchResource = async (endpoint) => {
  const response = await api.get(endpoint)
  return response.data
}

export const studentPortalService = {
  getDashboard: () => fetchResource('/student/dashboard'),
  applyForSeat: async (roomId) => {
    const response = await api.post('/student/apply-seat', { room_id: roomId })
    return response.data
  },
}

export const studentRoomsService = {
  getAll: () => fetchResource('/rooms'),
}

export const studentBlocksService = {
  getAll: () => fetchResource('/blocks'),
}

export const studentPaymentsService = {
  getAll: () => fetchResource('/payments'),
}

export const studentFeesService = {
  getAll: () => fetchResource('/fees'),
}

export const studentMessService = {
  getAll: () => fetchResource('/mess'),
}

export const studentLeavesService = {
  getAll: () => fetchResource('/leaves'),
}

export default studentPortalService
