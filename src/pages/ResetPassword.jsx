import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Footer from '../components/layout/Footer'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: searchParams.get('email') || location.state?.email || '',
    code: location.state?.previewResetCode || '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const emailSent = location.state?.emailSent
  const previewResetCode = location.state?.previewResetCode
  const deliveryError = location.state?.deliveryError
  const expiresAt = location.state?.expiresAt

  useEffect(() => {
    const email = searchParams.get('email') || location.state?.email || ''
    if (email) {
      setFormData((prev) => ({ ...prev, email }))
    }
  }, [location.state, searchParams])

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email) nextErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Please enter a valid email'

    if (!formData.code.trim()) nextErrors.code = 'Reset code is required'
    if (!formData.password) nextErrors.password = 'New password is required'
    else if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters'

    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/auth/reset-password', formData)
      toast.success(data.message)
      navigate('/login', {
        replace: true,
        state: { email: formData.email }
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password. Please try again.'
      toast.error(message)
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  if (!formData.email) {
    return (
      <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-br from-primary/10 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AnimatedBackdrop variant="auth" />
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="relative z-10 w-full max-w-md">
            <Card className="p-8 shadow-xl border-0 text-center">
              <ShieldCheck className="w-12 h-12 text-primary dark:text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start with your email first</h1>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Enter your email on the forgot-password page so we can send you a reset code and prefill this form.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 mt-6 text-primary dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Go to Forgot Password
              </Link>
            </Card>
          </div>
        </div>

        <div className="relative z-10">
          <Footer variant="auth" />
        </div>
      </div>
    )
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
              Reset Password
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter the reset code from your email and choose a new password
            </p>
          </div>

          <Card className="p-8 shadow-xl border-0">
            <div className="mb-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {emailSent === false
                  ? deliveryError
                    ? 'SMTP delivery failed, so a development reset code is shown below.'
                    : 'SMTP email is not configured yet, so a development reset code is shown below.'
                  : `A reset code was sent to ${formData.email}.`}
              </p>
              {deliveryError && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Delivery issue: {deliveryError}
                </p>
              )}
              {expiresAt && (
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                  Code expires at {new Date(expiresAt).toLocaleString()}.
                </p>
              )}
              {previewResetCode && (
                <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Development preview code: {previewResetCode}
                </p>
              )}
            </div>

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
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={<Mail className="w-5 h-5 text-gray-400" />}
              />

              <Input
                label="Reset Code"
                name="code"
                placeholder="Enter the 6-digit code"
                value={formData.code}
                onChange={handleChange}
                error={errors.code}
                icon={<ShieldCheck className="w-5 h-5 text-gray-400" />}
              />

              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="Create a new password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={<Lock className="w-5 h-5 text-gray-400" />}
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm the new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                icon={<Lock className="w-5 h-5 text-gray-400" />}
              />

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={loading}
              >
                Save New Password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-sm text-primary dark:text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Request a new code
              </Link>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Student account?{' '}
                <Link to="/student/reset-password" className="font-medium text-primary dark:text-blue-400 hover:underline">
                  Open student reset page
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="relative z-10">
        <Footer variant="auth" />
      </div>
    </div>
  )
}

export default ResetPassword
