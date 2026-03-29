import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Card from '../common/Card'
import Table from '../common/Table'

const toneClasses = {
  blue: 'bg-sky-50 text-sky-900 border-sky-100 dark:bg-sky-950/30 dark:text-sky-100 dark:border-sky-900/40',
  amber: 'bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900/40',
  rose: 'bg-rose-50 text-rose-900 border-rose-100 dark:bg-rose-950/30 dark:text-rose-100 dark:border-rose-900/40',
  violet: 'bg-violet-50 text-violet-900 border-violet-100 dark:bg-violet-950/30 dark:text-violet-100 dark:border-violet-900/40',
}

const ResourcePage = ({
  title,
  description,
  fetchData,
  columns,
  summaryItems,
  emptyMessage = 'No records available yet.',
  searchPlaceholder = 'Search records...',
}) => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRows = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchData()
      setRows(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      const message = fetchError.response?.data?.message || 'Failed to load data from the server.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [fetchData])

  const metrics = summaryItems ? summaryItems(rows) : []

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
        </div>

        <Button variant="outline" onClick={loadRows}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border p-5 shadow-sm ${toneClasses[metric.tone || 'blue']}`}
            >
              <p className="text-sm font-medium opacity-80">{metric.label}</p>
              <p className="mt-3 text-3xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-100 dark:border-red-900/40">
          <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-semibold">Could not load {title.toLowerCase()}</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage={emptyMessage}
        searchPlaceholder={searchPlaceholder}
      />
    </div>
  )
}

export default ResourcePage
