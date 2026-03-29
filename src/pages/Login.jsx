import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Lock, LogIn, Mail, Shield, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthContext'
import { clearStoredSession, getApiErrorMessage } from '../services/api'
import Input from '../components/common/Input'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'

const roleCards = [
  {
    value: 'Admin',
    title: 'Admin Login',
    description: 'Full control to edit, manage, and monitor hostel operations.',
    icon: Shield,
  },
  {
    value: 'Student',
    title: 'Student Login',
    description: 'View hostel data, check your records, and apply for a seat.',
    icon: UserRound,
  },
]

const Login = ({ forcedRole = '' }) => {
  const [formData, setFormData] = useState({
    role: forcedRole || 'Admin',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isRoleLocked = Boolean(forcedRole)
  const activeRole = forcedRole || formData.role
  const pageTitle = useMemo(
    () => (activeRole === 'Student' ? 'Student Sign In' : 'Admin Sign In'),
    [activeRole]
  )
  const pageDescription = useMemo(
    () =>
      activeRole === 'Student'
        ? 'Sign in to the student portal to view hostel information and apply for an available seat.'
        : 'Sign in to the admin portal to manage hostel records and operations.',
    [activeRole]
  )

  useEffect(() => {
    clearStoredSession()
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }))
    }
  }, [location.state])

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.email) nextErrors.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Please enter a valid email.'

    if (!formData.password) nextErrors.password = 'Password is required.'
    else if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'

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
    if (!validateForm()) return

    setLoading(true)

    try {
      const data = await login(formData)
      toast.success(`${data.user.role} login successful.`)
      navigate(data.user.role === 'Student' ? '/student' : '/admin', { replace: true })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Login failed. Please try again.')
      setErrors({ general: message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col bg-gradient-to-br from-slate-100 via-cyan-50 to-blue-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AnimatedBackdrop variant="auth" />
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="relative z-10 w-full max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg">
                    <LogIn className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="mt-5 text-3xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{pageDescription}</p>
                </div>

                {isRoleLocked ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary dark:text-blue-300">
                    <p className="text-sm font-semibold">{activeRole} authentication</p>
                    <p className="mt-1 text-sm opacity-80">This page signs in only {activeRole.toLowerCase()} accounts.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleCards.map((role) => (
                      <Link
                        key={role.value}
                        to={role.value === 'Student' ? '/login/student' : '/login/admin'}
                        className="rounded-2xl border p-4 text-left transition border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <role.icon className="h-6 w-6" />
                        <p className="mt-3 font-semibold">{role.title}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{role.description}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary dark:text-blue-400">
                          Continue
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {errors.general && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                      {errors.general}
                    </div>
                  )}

                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    icon={<Mail className="h-5 w-5 text-gray-400" />}
                  />

                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    icon={<Lock className="h-5 w-5 text-gray-400" />}
                  />

                  <div className="flex items-center justify-between text-sm">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                      {activeRole} portal selected
                    </span>
                    <Link to="/forgot-password" className="text-primary hover:underline dark:text-blue-400">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    Continue To {activeRole === 'Student' ? 'Student' : 'Admin'} Dashboard
                  </Button>
                </form>

                <p className="text-center text-gray-600 dark:text-gray-400">
                  Need a new account?{' '}
                  <Link
                    to={activeRole === 'Student' ? '/register/student' : '/register/admin'}
                    className="font-medium text-primary hover:underline dark:text-blue-400"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            </Card>

            <div className="rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">Access Types</p>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">One login page, two clear paths</h2>
              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-slate-900 p-5 text-white">
                  <p className="text-sm uppercase tracking-wide text-white/60">Admin</p>
                  <p className="mt-2 text-lg font-semibold">Manage all hostel records</p>
                  <p className="mt-2 text-sm text-white/75">Admins can edit students, rooms, blocks, visitors, payments, fees, maintenance, and leave records.</p>
                </div>
                <div className="rounded-3xl bg-cyan-50 p-5 dark:bg-cyan-950/30">
                  <p className="text-sm uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Student</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">View data and apply for a seat</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Students get their own dashboard, can review room availability, check payments and fee info, and claim a room if one is open.</p>
                </div>
              </div>

              <div className="mt-8 text-center lg:text-left">
                {!isRoleLocked && (
                  <div className="mb-4">
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-cyan-300"
                    >
                      Create account
                    </Link>
                  </div>
                )}
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Homepage
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
