const Loader = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} border-3 border-gray-200 border-t-primary dark:border-t-blue-500 rounded-full animate-spin`} />
    </div>
  )
}

export const TableLoader = () => (
  <div className="animate-pulse space-y-4 p-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded" />
    ))}
  </div>
)

export default Loader

