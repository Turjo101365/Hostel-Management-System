import Badge from '../components/common/Badge'
import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentPaymentsService } from '../services/studentService'
import { formatCurrency, formatDate } from '../utils/helpers'

const columns = [
  { header: 'Payment ID', key: 'payment_id', sortable: true },
  {
    header: 'Amount',
    key: 'amount',
    sortable: true,
    render: (row) => formatCurrency(row.amount),
  },
  { header: 'Month', key: 'month', sortable: true },
  {
    header: 'Payment Date',
    key: 'payment_date',
    render: (row) => formatDate(row.payment_date),
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => <Badge variant="success">{row.status}</Badge>,
  },
]

const summaryItems = (rows) => [
  { label: 'My Payments', value: rows.length, tone: 'blue' },
  { label: 'Total Paid', value: formatCurrency(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)), tone: 'emerald' },
  { label: 'Billing Months', value: new Set(rows.map((row) => row.month)).size, tone: 'amber' },
]

const StudentPayments = () => (
  <StudentResourcePage
    title="My Payments"
    description="Review the payment records linked to your student account."
    service={studentPaymentsService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search payments by month or amount..."
    emptyMessage="No payment records were found for your account."
  />
)

export default StudentPayments
