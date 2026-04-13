import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import { paymentsService } from '../services/adminService'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'

const toneClasses = {
  blue: 'bg-sky-50 text-sky-900 border-sky-100 dark:bg-sky-950/30 dark:text-sky-100 dark:border-sky-900/40',
  amber: 'bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900/40',
  rose: 'bg-rose-50 text-rose-900 border-rose-100 dark:bg-rose-950/30 dark:text-rose-100 dark:border-rose-900/40',
}

const getNormalizedStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'approved' || normalized === 'verified') return 'Approved'
  if (normalized === 'rejected') return 'Rejected'
  return 'Pending'
}

const getVerifierRoleLabel = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase()
  if (normalizedRole === 'superadmin' || normalizedRole === 'super admin') {
    return 'super admin'
  }
  return 'admin'
}

const getStatusVariant = (status) => {
  const normalizedStatus = getNormalizedStatus(status)
  if (normalizedStatus === 'Approved') return 'success'
  if (normalizedStatus === 'Rejected') return 'danger'
  return 'warning'
}

const summaryItems = (rows) => [
  { label: 'Payment Requests', value: rows.length, tone: 'blue' },
  { label: 'Pending Verification', value: rows.filter((row) => getNormalizedStatus(row.payment_status) === 'Pending').length, tone: 'amber' },
  { label: 'Approved', value: rows.filter((row) => getNormalizedStatus(row.payment_status) === 'Approved').length, tone: 'emerald' },
  { label: 'Rejected', value: rows.filter((row) => getNormalizedStatus(row.payment_status) === 'Rejected').length, tone: 'rose' },
]

const Payments = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingPaymentId, setProcessingPaymentId] = useState(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await paymentsService.getAll()
      setRows(Array.isArray(data) ? data : [])
    } catch (fetchError) {
      const message = fetchError.response?.data?.message || 'Failed to load payment requests from the server.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const handleVerify = async (paymentId) => {
    setProcessingPaymentId(paymentId)
    try {
      const response = await paymentsService.verify(paymentId)
      toast.success(response?.message || 'Payment approved successfully.')
      await loadRows()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to approve this payment right now.'
      toast.error(message)
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const handleReject = async (paymentId) => {
    const reason = window.prompt('Optional: add a short rejection reason')
    if (reason === null) {
      return
    }
    setProcessingPaymentId(paymentId)

    try {
      const response = await paymentsService.reject(paymentId, { reason })
      toast.success(response?.message || 'Payment rejected successfully.')
      await loadRows()
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to reject this payment right now.'
      toast.error(message)
    } finally {
      setProcessingPaymentId(null)
    }
  }

  const columns = [
    { header: 'Payment ID', key: 'payment_id', sortable: true },
    { header: 'Booking ID', key: 'booking_id', sortable: true },
    { header: 'Booking Status', key: 'booking_status', sortable: true, render: (row) => (
        <span className="text-sm text-gray-700 dark:text-gray-200">
          {row.booking_status || 'Pending'}
        </span>
      ) },
    { header: 'Requested On', key: 'booking_requested_at', sortable: true, render: (row) => (
        <p>{row.booking_requested_at ? formatDateTime(row.booking_requested_at) : '-'}</p>
      ) },
    { header: 'Room Request', key: 'room_title', sortable: true, render: (row) => (
        <div>
          <p className="font-medium">{row.room_title || '-'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{row.room_category || '-'}</p>
        </div>
      ) },
    { header: 'Student', key: 'student_name', sortable: true },
    {
      header: 'Amount',
      key: 'amount',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-semibold">{formatCurrency(row.amount)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {row.card_brand || 'Card'} {row.card_last4 ? `ending ${row.card_last4}` : ''}
          </p>
        </div>
      ),
    },
    {
      header: 'Paid On',
      key: 'payment_date',
      sortable: true,
      render: (row) => <p>{formatDate(row.payment_date)}</p>,
    },
    {
      header: 'Payment',
      key: 'payment_status',
      render: (row) => {
        const normalizedStatus = getNormalizedStatus(row.payment_status || row.status || row.PaymentStatus)
        return <Badge variant={getStatusVariant(normalizedStatus)}>{normalizedStatus}</Badge>
      },
    },
    {
      header: 'Verified By',
      key: 'verified_by_name',
      render: (row) => {
        const normalizedStatus = getNormalizedStatus(row.payment_status || row.status || row.PaymentStatus)
        const verifiedName = String(row.verified_by_name || '').trim()
        const roleLabel = getVerifierRoleLabel(row.verified_by_role)
        const verificationText = normalizedStatus === 'Pending'
          ? 'Pending verification'
          : `Verified by ${roleLabel}${verifiedName ? ` (${verifiedName})` : ''}`

        return (
          <div>
            <p>{verificationText}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {row.verified_at ? formatDateTime(row.verified_at) : 'Not verified yet'}
            </p>
          </div>
        )
      },
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => {
        const currentStatus = getNormalizedStatus(row.payment_status || row.status || row.PaymentStatus)
        const isPending = currentStatus === 'Pending'

        return isPending ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              loading={processingPaymentId === row.payment_id}
              onClick={() => handleVerify(row.payment_id)}
            >
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              loading={processingPaymentId === row.payment_id}
              onClick={() => handleReject(row.payment_id)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">No action needed</span>
        )
      },
    },
  ]

  const metrics = summaryItems(rows)

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Requests</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Verify student payments here. Booking is completed for students only after both booking and payment are approved.
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
              <p className="font-semibold">Could not load payment requests</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No payment requests found."
        searchPlaceholder="Search payments by student, room, payment ID, or status..."
      />
    </div>
  )
}

export default Payments
