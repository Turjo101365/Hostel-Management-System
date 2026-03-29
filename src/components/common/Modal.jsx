import { X } from 'lucide-react'
import { useEffect } from 'react'

const Modal = ({ isOpen, onClose, title, subtitle, badge, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-3 md:p-6">
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative w-full ${sizes[size]} max-h-[calc(100vh-1.5rem)] overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_100px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-800/95 animate-fadeIn`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-sky-500/10 via-transparent to-emerald-500/10 dark:from-sky-400/10 dark:to-emerald-400/10" />

          <div className="relative flex items-start justify-between gap-4 border-b border-gray-100/80 px-6 py-5 dark:border-slate-700/80">
            <div className="max-w-2xl">
              {badge && (
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
                  {badge}
                </span>
              )}
              <h3 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200/80 bg-white/80 p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-gray-400 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="relative max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-6 md:px-7 md:py-7">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modal
