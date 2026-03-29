const Input = ({ label, error, className = '', multiline, rows = 3, icon, ...props }) => {
  const inputClasses = `w-full rounded-2xl border bg-white/95 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 outline-none placeholder:text-gray-400 hover:border-gray-300 dark:bg-slate-900/80 dark:text-white dark:border-slate-700 dark:hover:border-slate-500 focus:ring-2 focus:ring-primary dark:focus:ring-blue-500 focus:border-transparent ${
    error ? 'border-red-500 focus:ring-red-500' : ''
  } ${icon ? (multiline ? 'pl-11' : 'pl-11') : ''}`

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </div>
        )}
        {multiline ? (
          <textarea
            className={`${inputClasses} resize-none`}
            rows={rows}
            {...props}
          />
        ) : (
          <input
            className={inputClasses}
            {...props}
          />
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default Input
