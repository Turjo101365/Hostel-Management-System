import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { STORAGE_KEYS, clearStoredSession, isAuthPath } from '../services/api'

const AuthContext = createContext(null)

const persistSession = (token, user) => {
  localStorage.setItem(STORAGE_KEYS.token, token)
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user))
}

const getHomePath = (user) => (user?.role === 'Student' ? '/student' : '/admin')

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.token)
    if (!token) return null

    const { data } = await api.get('/auth/me')
    persistSession(token, data)
    setUser(data)
    return data
  }

  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    if (isAuthPath(currentPath)) {
      clearStoredSession()
      setUser(null)
      setLoading(false)
      return
    }

    const token = localStorage.getItem(STORAGE_KEYS.token)
    const storedUser = localStorage.getItem(STORAGE_KEYS.user)

    if (!token) {
      setLoading(false)
      return
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        clearStoredSession()
      }
    }

    let active = true

    api.get('/auth/me')
      .then(({ data }) => {
        if (!active) return
        persistSession(token, data)
        setUser(data)
      })
      .catch(() => {
        if (!active) return
        clearStoredSession()
        setUser(null)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const login = async ({ email, password, role }) => {
    const endpoint = role === 'Student' ? '/auth/student/login' : '/auth/admin/login'
    const { data } = await postAuthWithFallback(endpoint, '/auth/login', { email, password, role })
    persistSession(data.token, data.user)
    setUser(data.user)
    return data
  }

  const register = async (payload) => {
    const endpoint = payload.role === 'Student' ? '/auth/student/register' : '/auth/admin/register'
    const { data } = await postAuthWithFallback(endpoint, '/auth/register', payload)
    persistSession(data.token, data.user)
    setUser(data.user)
    return data
  }

  const logout = () => {
    clearStoredSession()
    setUser(null)
  }

  const updateProfile = async ({ name, phoneNumber, guardianContact }) => {
    const { data } = await api.put('/auth/me', { name, phoneNumber, guardianContact })
    const nextUser = {
      id: data.id,
      email: data.email,
      name: data.name,
      phoneNumber: data.phoneNumber,
      role: data.role,
      lastLogin: data.lastLogin,
      studentId: data.studentId,
      roomId: data.roomId,
      roomNumber: data.roomNumber,
      blockName: data.blockName,
      guardianContact: data.guardianContact,
    }
    const token = localStorage.getItem(STORAGE_KEYS.token)

    if (token) {
      persistSession(token, nextUser)
    }

    setUser(nextUser)
    return data
  }

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    refreshUser,
    updateProfile,
    logout,
    isAuthenticated: Boolean(user),
    homePath: getHomePath(user),
  }), [user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
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
