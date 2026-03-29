import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Lock, Mail, Phone, Shield, UserPlus, UserRound } from 'lucide-react'
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
    title: 'Admin Account',
    description: 'Create a full-access management account.',
    icon: Shield,
  },
  {
    value: 'Student',
    title: 'Student Account',
    description: 'Create a student account with view-only access and seat application.',
    icon: UserRound,
  },
]

const Register = ({ forcedRole = '' }) => {
  const [formData, setFormData] = useState({
    role: forcedRole || 'Student',
    name: '',
    email: '',
    phoneNumber: '',
    guardian_contact: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  const isRoleLocked = Boolean(forcedRole)

  const isStudent = (forcedRole || formData.role) === 'Student'

  useEffect(() => {
    clearStoredSession()
  }, [])

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.name.trim()) nextErrors.name = 'Name is required.'
    if (!formData.email) nextErrors.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) nextErrors.email = 'Please enter a valid email.'

    if (formData.phoneNumber.trim() && !/^\+?[\d\s()-]{7,20}$/.test(formData.phoneNumber.trim())) {
      nextErrors.phoneNumber = 'Please enter a valid phone number.'
    }

    if (isStudent && formData.guardian_contact.trim() && !/^\+?[\d\s()-]{7,20}$/.test(formData.guardian_contact.trim())) {
      nextErrors.guardian_contact = 'Please enter a valid guardian contact.'
    }

    if (!formData.password) nextErrors.password = 'Password is required.'
    else if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'

    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'

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
      const data = await register({
        role: forcedRole || formData.role,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        guardian_contact: formData.guardian_contact.trim(),
        password: formData.password,
      })

      toast.success(`${data.user.role} account created successfully.`)
      navigate(data.user.role === 'Student' ? '/student' : '/admin', { replace: true })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Registration failed.')
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
          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg">
                    <UserPlus className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="mt-5 text-3xl font-bold text-gray-900 dark:text-white">
                    {isStudent ? 'Create Student Account' : 'Create Admin Account'}
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {isStudent
                      ? 'Register a student account with view-only access and seat application.'
                      : 'Register an admin account with full hostel management access.'}
                  </p>
                </div>

                {isRoleLocked ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary dark:text-blue-300">
                    <p className="text-sm font-semibold">{isStudent ? 'Student' : 'Admin'} registration</p>
                    <p className="mt-1 text-sm opacity-80">This page creates only {isStudent ? 'student' : 'admin'} accounts.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {roleCards.map((role) => (
                      <Link
                        key={role.value}
                        to={role.value === 'Student' ? '/register/student' : '/register/admin'}
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

                  <div className="grid gap-5 md:grid-cols-2">
                    <Input
                      label={isStudent ? 'Student Name' : 'Admin Name'}
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={errors.name}
                      placeholder={`Enter ${isStudent ? 'student' : 'admin'} name`}
                      icon={<UserRound className="h-5 w-5 text-gray-400" />}
                    />

                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      error={errors.email}
                      placeholder="Enter your email"
                      icon={<Mail className="h-5 w-5 text-gray-400" />}
                    />

                    <Input
                      label="Phone Number"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      error={errors.phoneNumber}
                      placeholder="Enter phone number"
                      icon={<Phone className="h-5 w-5 text-gray-400" />}
                    />

                    {isStudent && (
                      <Input
                        label="Guardian Contact"
                        name="guardian_contact"
                        value={formData.guardian_contact}
                        onChange={handleChange}
                        error={errors.guardian_contact}
                        placeholder="Enter guardian contact"
                        icon={<Phone className="h-5 w-5 text-gray-400" />}
                      />
                    )}

                    <Input
                      label="Password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      placeholder="Enter password"
                      icon={<Lock className="h-5 w-5 text-gray-400" />}
                    />

                    <Input
                      label="Confirm Password"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      error={errors.confirmPassword}
                      placeholder="Confirm password"
                      icon={<Lock className="h-5 w-5 text-gray-400" />}
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" loading={loading}>
                    Create {isStudent ? 'Student' : 'Admin'} Account
                  </Button>
                </form>

                <p className="text-center text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    to={isStudent ? '/login/student' : '/login/admin'}
                    className="font-medium text-primary hover:underline dark:text-blue-400"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </Card>

            <div className="rounded-[32px] border border-white/50 bg-white/60 p-6 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">Registration</p>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Built for both hostel roles</h2>
              <div className="mt-8 space-y-4">
                <div className="rounded-3xl bg-slate-900 p-5 text-white">
                  <p className="text-sm uppercase tracking-wide text-white/60">Admin Account</p>
                  <p className="mt-2 text-lg font-semibold">Create a management workspace</p>
                  <p className="mt-2 text-sm text-white/75">Admin users keep the existing dashboard with full edit, create, delete, and profile tools.</p>
                </div>
                <div className="rounded-3xl bg-cyan-50 p-5 dark:bg-cyan-950/30">
                  <p className="text-sm uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Student Account</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">Create a student profile automatically</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Student registration creates the student account and opens a dashboard for viewing hostel data and applying for an available seat.</p>
                </div>
              </div>

              <div className="mt-8 text-center lg:text-left">
                {!isRoleLocked && (
                  <div className="mb-4">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-cyan-300"
                    >
                      Go to login
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

export default Register
