import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { clearStoredSession } from '../services/api'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Footer from '../components/layout/Footer'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    clearStoredSession()
  }, [])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email: formData.email })
      toast.success(data.message)
      navigate(`/reset-password?email=${encodeURIComponent(formData.email)}`, {
        replace: true,
        state: {
          email: formData.email,
          emailSent: data.emailSent,
          previewResetCode: data.previewResetCode,
          expiresAt: data.expiresAt,
        }
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset link. Please try again.'
      toast.error(message)
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-br from-primary/10 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <AnimatedBackdrop variant="auth" />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary dark:bg-blue-500 rounded-2xl mb-4 shadow-lg">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Forgot Password
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter your Gmail or registered email and we will send a reset code, then move you straight to the reset screen
            </p>
          </div>

          <Card className="p-8 shadow-xl border-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                </div>
              )}

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter your registered email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={<Mail className="w-5 h-5 text-gray-400" />}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
              >
                Continue to Reset Password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Remember your password?{' '}
                <Link
                  to="/login"
                  className="text-primary dark:text-blue-400 font-medium hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </Card>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Footer variant="auth" />
      </div>
    </div>
  )
}

export default ForgotPassword
