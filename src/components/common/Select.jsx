const Select = ({ label, error, options = [], className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        className={`w-full rounded-2xl border bg-white/95 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 outline-none hover:border-gray-300 dark:bg-slate-900/80 dark:text-white dark:border-slate-700 dark:hover:border-slate-500 focus:ring-2 focus:ring-primary dark:focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        }`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default Select
