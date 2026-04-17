import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import Footer from '../components/layout/Footer'

const StudentForgotPassword = () => {
  const [formData, setFormData] = useState({ email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email) nextErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Please enter a valid email'

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
      const { data } = await api.post('/student-auth/forgot-password', {
        email: formData.email,
      })

      toast.success(data.message)
      navigate(`/student/reset-password?email=${encodeURIComponent(formData.email)}`, {
        replace: true,
        state: {
          email: formData.email,
          emailSent: data.emailSent,
          previewResetCode: data.previewResetCode,
          deliveryError: data.deliveryError,
          expiresAt: data.expiresAt,
        },
      })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send the student reset code.'
      toast.error(message)
      setErrors({ general: message })
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Password Reset</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter your student email and we will send you a reset code
            </p>
          </div>

          <Card className="border-0 p-8 shadow-xl">
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
                placeholder="Enter your registered student email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={<Mail className="h-5 w-5 text-gray-400" />}
              />

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Continue to Reset
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/student/login" className="font-medium text-primary hover:underline dark:text-blue-400">
                Back to student login
              </Link>
            </div>
          </Card>

          <div className="mt-6 text-center">
            <Link
              to="/student/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
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

export default StudentForgotPassword
