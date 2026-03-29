import { Link } from 'react-router-dom'
import { Building2, Mail, Phone } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

const variantClasses = {
  public: {
    wrapper: 'border-slate-200/80 bg-white/75 text-slate-700 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/75 dark:text-slate-300',
    chip: 'border-slate-200 bg-white/70 text-slate-700 hover:border-cyan-400/40 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-white',
    divider: 'border-slate-200/80 dark:border-white/10',
    accent: 'text-cyan-600 dark:text-cyan-300',
    muted: 'text-slate-500 dark:text-slate-400',
  },
  auth: {
    wrapper: 'border-slate-200/80 bg-white/70 text-slate-700 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300',
    chip: 'border-slate-200 bg-white/60 text-slate-700 hover:border-cyan-400/40 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white',
    divider: 'border-slate-200/80 dark:border-slate-800',
    accent: 'text-cyan-600 dark:text-cyan-300',
    muted: 'text-slate-500 dark:text-slate-400',
  },
  admin: {
    wrapper: 'border-slate-200 bg-white/85 text-slate-700 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-300',
    chip: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400/40 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white',
    divider: 'border-slate-200 dark:border-slate-800',
    accent: 'text-cyan-600 dark:text-cyan-300',
    muted: 'text-slate-500 dark:text-slate-400',
  },
  student: {
    wrapper: 'border-slate-200 bg-white/85 text-slate-700 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 dark:text-slate-300',
    chip: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-400/40 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-white',
    divider: 'border-slate-200 dark:border-slate-800',
    accent: 'text-cyan-600 dark:text-cyan-300',
    muted: 'text-slate-500 dark:text-slate-400',
  },
}

const Footer = ({ variant = 'public' }) => {
  const { isAuthenticated, homePath } = useAuth()
  const styles = variantClasses[variant] || variantClasses.public
  const year = new Date().getFullYear()

  const quickLinks = variant === 'admin'
    ? [
        { label: 'Dashboard', to: '/admin' },
        { label: 'Students', to: '/admin/students' },
        { label: 'Rooms', to: '/admin/rooms' },
        { label: 'Profile', to: '/admin/profile' },
      ]
    : variant === 'student'
      ? [
          { label: 'Dashboard', to: '/student' },
          { label: 'Rooms', to: '/student/rooms' },
          { label: 'Payments', to: '/student/payments' },
          { label: 'Profile', to: '/student/profile' },
        ]
    : [
        { label: 'Home', to: '/' },
        { label: 'About', to: '/about' },
        { label: 'Rooms', to: '/rooms' },
        { label: 'Contact', to: '/contact' },
        isAuthenticated
          ? { label: 'Dashboard', to: homePath }
          : { label: 'Login', to: '/login' },
      ]

  return (
    <footer className={`border-t ${styles.wrapper}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 ${styles.accent}`}>
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className={`text-xs uppercase tracking-[0.35em] ${styles.accent}`}>HostelMS</p>
                <h2 className="text-lg font-semibold text-inherit">Hostel Management System</h2>
              </div>
            </div>
            <p className={`mt-4 text-sm leading-7 ${styles.muted}`}>
              {variant === 'admin'
                ? 'Admin workspace for managing students, rooms, payments, visitors, and hostel operations.'
                : variant === 'student'
                  ? 'Student workspace for checking hostel information, reviewing your records, and applying for an available seat.'
                : 'A connected hostel platform with public information, authentication, and MSSQL-backed admin workflows.'}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${styles.chip}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={`mt-6 flex flex-col gap-3 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}>
          <p className={styles.muted}>© {year} HostelMS. All rights reserved.</p>

          <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 ${styles.muted}`}>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              hello@hostelms.local
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              +880 2-8870422
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
