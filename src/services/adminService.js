import api from './api'

const fetchResource = async (endpoint) => {
  const response = await api.get(endpoint)
  return response.data
}

const createResource = async (endpoint, payload) => {
  const response = await api.post(endpoint, payload)
  return response.data
}

const updateResource = async (endpoint, id, payload) => {
  const response = await api.put(`${endpoint}/${encodeURIComponent(id)}`, payload)
  return response.data
}

const deleteResource = async (endpoint, id) => {
  const response = await api.delete(`${endpoint}/${encodeURIComponent(id)}`)
  return response.data
}

export const dashboardService = {
  getSummary: () => fetchResource('/dashboard/summary'),
}

export const studentsService = {
  getAll: () => fetchResource('/students'),
  create: (payload) => createResource('/students', payload),
  update: (id, payload) => updateResource('/students', id, payload),
  remove: (id) => deleteResource('/students', id),
}

export const roomsService = {
  getAll: () => fetchResource('/rooms'),
  create: (payload) => createResource('/rooms', payload),
  update: (id, payload) => updateResource('/rooms', id, payload),
  remove: (id) => deleteResource('/rooms', id),
}

export const blocksService = {
  getAll: () => fetchResource('/blocks'),
  create: (payload) => createResource('/blocks', payload),
  update: (id, payload) => updateResource('/blocks', id, payload),
  remove: (id) => deleteResource('/blocks', id),
}

export const visitorsService = {
  getAll: () => fetchResource('/visitors'),
  create: (payload) => createResource('/visitors', payload),
  update: (id, payload) => updateResource('/visitors', id, payload),
  remove: (id) => deleteResource('/visitors', id),
}

export const paymentsService = {
  getAll: () => fetchResource('/payments'),
  create: (payload) => createResource('/payments', payload),
  update: (id, payload) => updateResource('/payments', id, payload),
  remove: (id) => deleteResource('/payments', id),
}

export const feesService = {
  getAll: () => fetchResource('/fees'),
  create: (payload) => createResource('/fees', payload),
  update: (id, payload) => updateResource('/fees', id, payload),
  remove: (id) => deleteResource('/fees', id),
}

export const messService = {
  getAll: () => fetchResource('/mess'),
  create: (payload) => createResource('/mess', payload),
  update: (id, payload) => updateResource('/mess', id, payload),
  remove: (id) => deleteResource('/mess', id),
}

export const maintenanceService = {
  getAll: () => fetchResource('/maintenance'),
  create: (payload) => createResource('/maintenance', payload),
  update: (id, payload) => updateResource('/maintenance', id, payload),
  remove: (id) => deleteResource('/maintenance', id),
}

export const leavesService = {
  getAll: () => fetchResource('/leaves'),
  create: (payload) => createResource('/leaves', payload),
  update: (id, payload) => updateResource('/leaves', id, payload),
  remove: (id) => deleteResource('/leaves', id),
}
