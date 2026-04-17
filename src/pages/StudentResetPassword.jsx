import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Lock, Mail, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import Footer from '../components/layout/Footer'

const StudentResetPassword = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: searchParams.get('email') || location.state?.email || '',
    code: location.state?.previewResetCode || '',
    password: '',
    confirmPassword: '',
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
      setFormData((current) => ({ ...current, email }))
    }
  }, [location.state, searchParams])

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email) nextErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Please enter a valid email'

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
    setFormData((current) => ({ ...current, [name]: value }))

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: '' }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const { data } = await api.post('/student-auth/reset-password', formData)
      toast.success(data.message)
      navigate('/student/login', {
        replace: true,
        state: { email: formData.email },
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset the student password.'
      toast.error(message)
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
  }

  if (!formData.email) {
    return (
      <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AnimatedBackdrop variant="auth" />
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="relative z-10 w-full max-w-md">
            <Card className="border-0 p-8 text-center shadow-xl">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-cyan-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Start with your student email</h1>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                Open the student forgot-password page first so we can send and prefill your reset code.
              </p>
              <Link to="/student/forgot-password" className="mt-6 inline-flex items-center gap-2 text-primary hover:underline dark:text-blue-400">
                <ArrowLeft className="h-4 w-4" />
                Go to Student Forgot Password
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
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <AnimatedBackdrop variant="auth" />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500 shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Student Password</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter the reset code from your email and set a new student password
            </p>
          </div>

          <Card className="border-0 p-8 shadow-xl">
            <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {emailSent === false
                  ? deliveryError
                    ? 'SMTP delivery failed, so a development reset code is shown below.'
                    : 'SMTP email is not configured yet, so a development reset code is shown below.'
                  : `A reset code was sent to ${formData.email}.`}
              </p>
              {deliveryError ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Delivery issue: {deliveryError}
                </p>
              ) : null}
              {expiresAt ? (
                <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                  Code expires at {new Date(expiresAt).toLocaleString()}.
                </p>
              ) : null}
              {previewResetCode ? (
                <p className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  Development preview code: {previewResetCode}
                </p>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
                </div>
              ) : null}

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={<Mail className="h-5 w-5 text-gray-400" />}
              />

              <Input
                label="Reset Code"
                name="code"
                placeholder="Enter the reset code"
                value={formData.code}
                onChange={handleChange}
                error={errors.code}
                icon={<ShieldCheck className="h-5 w-5 text-gray-400" />}
              />

              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="Create a new password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />

              <Input
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm the new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Save New Password
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/student/forgot-password" className="inline-flex items-center gap-2 text-sm text-primary hover:underline dark:text-blue-400">
                <ArrowLeft className="h-4 w-4" />
                Request a new code
              </Link>
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

export default StudentResetPassword
