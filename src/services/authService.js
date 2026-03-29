import api, { STORAGE_KEYS, clearStoredSession } from './api'

const persistSession = (payload) => {
  if (payload?.token) {
    localStorage.setItem(STORAGE_KEYS.token, payload.token)
  }

  if (payload?.user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(payload.user))
  }
}

const postAuthWithFallback = async (preferredEndpoint, fallbackEndpoint, payload) => {
  try {
    return await api.post(preferredEndpoint, payload)
  } catch (error) {
    const message = error?.response?.data?.message || ''
    const status = error?.response?.status
    const shouldFallback =
      status === 404 ||
      (status === 401 && message === 'Authentication token is required.')

    if (!shouldFallback) {
      throw error
    }

    return api.post(fallbackEndpoint, payload)
  }
}

export const authService = {
  login: async ({ email, password, role }) => {
    const endpoint = role === 'Student' ? '/auth/student/login' : '/auth/admin/login'
    const response = await postAuthWithFallback(endpoint, '/auth/login', { email, password, role })
    persistSession(response.data)
    return response.data
  },

  register: async (userData) => {
    const endpoint = userData.role === 'Student' ? '/auth/student/register' : '/auth/admin/register'
    const response = await postAuthWithFallback(endpoint, '/auth/register', userData)
    persistSession(response.data)
    return response.data
  },

  logout: () => {
    clearStoredSession()
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  getStoredUser: () => {
    const user = localStorage.getItem(STORAGE_KEYS.user)
    return user ? JSON.parse(user) : null
  },

  getToken: () => {
    return localStorage.getItem(STORAGE_KEYS.token)
  }
}

export default authService
