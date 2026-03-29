import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Building2, Menu, Moon, Sun, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useTheme } from '../../theme/ThemeContext'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Rooms', to: '/rooms' },
  { label: 'Contact', to: '/contact' },
]

const getNavClasses = ({ isActive }) => (
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-cyan-500/12 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-200'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
  }`
)

const PublicNavbar = () => {
  const { isAuthenticated } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" onClick={closeMenu}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-600 ring-1 ring-cyan-400/30 dark:text-cyan-300">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">HostelMS</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Hostel Management System</h1>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={getNavClasses}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-cyan-200"
            aria-label="Toggle light and dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {isAuthenticated ? (
            <Link
              to="/admin"
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl border border-slate-200 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-700 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Register
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-cyan-200"
            aria-label="Toggle light and dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 transition hover:border-cyan-400/40 hover:text-cyan-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:text-white"
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 py-4 dark:border-white/10 dark:bg-slate-950/95 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={getNavClasses} onClick={closeMenu}>
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-200/80 pt-3 dark:border-white/10">
              {isAuthenticated ? (
                <Link
                  to="/admin"
                  onClick={closeMenu}
                  className="rounded-xl bg-cyan-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="rounded-xl border border-slate-200 bg-white/70 px-5 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-cyan-400/50 hover:text-cyan-700 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="rounded-xl bg-cyan-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default PublicNavbar
