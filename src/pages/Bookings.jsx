import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import { bookingRequestsService } from '../services/adminService'
import { formatDateTime } from '../utils/helpers'

const toneClasses = {
  blue: 'bg-sky-50 text-sky-900 border-sky-100 dark:bg-sky-950/30 dark:text-sky-100 dark:border-sky-900/40',
  amber: 'bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900/40',
  rose: 'bg-rose-50 text-rose-900 border-rose-100 dark:bg-rose-950/30 dark:text-rose-100 dark:border-rose-900/40',
}

const getBookingBadgeVariant = (status) => {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'danger'
  return 'warning'
}

const summaryItems = (rows) => [
  { label: 'Total Requests', value: rows.length, tone: 'blue' },
  { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, tone: 'amber' },
  { label: 'Approved', value: rows.filter((row) => row.status === 'Approved').length, tone: 'emerald' },
  { label: 'Rejected', value: rows.filter((row) => row.status === 'Rejected').length, tone: 'rose' },
]

const Bookings = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [approvingBookingId, setApprovingBookingId] = useState(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await bookingRequestsService.getAll()
      setRows(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      const message = fetchError.response?.data?.message || 'Failed to load booking requests from the server.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const handleApproveBooking = async (bookingId) => {
    setApprovingBookingId(bookingId)

    try {
      await bookingRequestsService.updateStatus(bookingId, { status: 'Approved' })
      toast.success('Booking approved successfully.')
      await loadRows()
    } catch (saveError) {
      const message = saveError.response?.data?.message || 'Unable to approve this booking right now.'
      toast.error(message)
    } finally {
      setApprovingBookingId(null)
    }
  }

  const columns = [
    { header: 'Booking ID', key: 'booking_id', sortable: true },
    { header: 'Student', key: 'student_name', sortable: true },
    {
      header: 'Contact',
      key: 'student_email',
      render: (row) => (
        <div className="space-y-1">
          <p>{row.student_email || '-'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.student_phone || 'No phone'}</p>
        </div>
      ),
    },
    {
      header: 'Requested Room',
      key: 'room_title',
      render: (row) => (
        <div>
          <p className="font-medium">{row.room_title || '-'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{row.room_category || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Allocated Room',
      key: 'allocated_room_number',
      render: (row) => (
        <div>
          <p className="font-medium">{row.allocated_room_number ? `Room ${row.allocated_room_number}` : 'Pending'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.allocated_block_name || 'Block pending'}</p>
        </div>
      ),
    },
    {
      header: 'Requested At',
      key: 'requested_at',
      sortable: true,
      render: (row) => formatDateTime(row.requested_at),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <Badge variant={getBookingBadgeVariant(row.status)}>{row.status || 'Pending'}</Badge>,
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        row.status === 'Pending' ? (
          <Button
            type="button"
            size="sm"
            loading={approvingBookingId === row.booking_id}
            onClick={() => handleApproveBooking(row.booking_id)}
          >
            Accept
          </Button>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">No action needed</span>
        )
      ),
    },
  ]

  const metrics = summaryItems(rows)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Transactions</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Review room booking requests here. Payment approvals are handled in the Payments page.
          </p>
        </div>

        <Button variant="outline" onClick={loadRows}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      {error && (
        <Card className="border-red-100 dark:border-red-900/40">
          <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Could not load booking transactions</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No booking transactions have been recorded yet."
        searchPlaceholder="Search bookings by student, room, email, or status..."
      />
    </div>
  )
}

export default Bookings
