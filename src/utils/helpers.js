// Helper utility functions

export const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const formatDateTime = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatCurrency = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

export const generateId = (prefix) => {
  return `${prefix}${Date.now().toString(36).toUpperCase()}`
}

export const getStatusColor = (status) => {
  const statusColors = {
    'Active': 'bg-green-100 text-green-800',
    'Inactive': 'bg-red-100 text-red-800',
    'Available': 'bg-green-100 text-green-800',
    'Full': 'bg-red-100 text-red-800',
    'Partial': 'bg-yellow-100 text-yellow-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-green-100 text-green-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Paid': 'bg-green-100 text-green-800',
    'Unpaid': 'bg-red-100 text-red-800',
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

export const paginate = (array, page, pageSize) => {
  const startIndex = (page - 1) * pageSize
  return array.slice(startIndex, startIndex + pageSize)
}

export const searchFilter = (array, searchTerm, fields) => {
  if (!searchTerm) return array
  const lowerTerm = searchTerm.toLowerCase()
  return array.filter(item => 
    fields.some(field => 
      item[field]?.toString().toLowerCase().includes(lowerTerm)
    )
  )
}

export const sortBy = (array, field, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[field] > b[field] ? 1 : -1
    }
    return a[field] < b[field] ? 1 : -1
  })
}

export const getInitials = (name) => {
  if (!name) return ''
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export const validatePhone = (phone) => {
  const regex = /^\+?[\d\s-]{10,}$/
  return regex.test(phone)
}
