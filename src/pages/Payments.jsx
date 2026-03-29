import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { paymentsService, studentsService } from '../services/adminService'
import { formatCurrency, formatDate } from '../utils/helpers'

const monthOptions = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const getToday = () => new Date().toISOString().slice(0, 10)

const columns = [
  { header: 'Payment ID', key: 'payment_id', sortable: true },
  { header: 'Student', key: 'student_name', sortable: true },
  {
    header: 'Amount',
    key: 'amount',
    sortable: true,
    render: (row) => formatCurrency(row.amount)
  },
  { header: 'Month', key: 'month', sortable: true },
  {
    header: 'Payment Date',
    key: 'payment_date',
    render: (row) => formatDate(row.payment_date)
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => <Badge variant="success">{row.status}</Badge>
  }
]

const fields = [
  {
    name: 'student_id',
    label: 'Student',
    type: 'select',
    required: true,
    placeholder: 'Select a student',
    getOptions: ({ dependencies }) =>
      (dependencies.students || []).map((student) => ({
        value: String(student.student_id),
        label: `${student.name} • Room ${student.room_number || student.room_id}`,
      }))
  },
  {
    name: 'amount',
    label: 'Amount',
    type: 'number',
    required: true,
    min: 1,
    placeholder: 'Enter payment amount'
  },
  {
    name: 'month',
    label: 'Billing Month',
    type: 'select',
    required: true,
    placeholder: 'Select month',
    options: monthOptions.map((month) => ({ value: month, label: month }))
  },
  {
    name: 'payment_date',
    label: 'Payment Date',
    type: 'date',
    required: true
  }
]

const summaryItems = (rows) => [
  { label: 'Payment Records', value: rows.length, tone: 'blue' },
  { label: 'Collected', value: formatCurrency(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)), tone: 'emerald' },
  { label: 'Billing Months', value: new Set(rows.map((row) => row.month)).size, tone: 'amber' },
]

const loadDependencies = async () => {
  const students = await studentsService.getAll()
  return { students }
}

const getInitialValues = () => ({
  student_id: '',
  amount: '',
  month: '',
  payment_date: getToday(),
})

const getEditValues = (row) => ({
  student_id: row.student_id ? String(row.student_id) : '',
  amount: row.amount ? String(row.amount) : '',
  month: row.month || '',
  payment_date: row.payment_date ? String(row.payment_date).slice(0, 10) : getToday(),
})

const buildPaymentPayload = (values) => ({
  student_id: Number(values.student_id),
  amount: Number(values.amount),
  month: values.month,
  payment_date: values.payment_date,
})

const Payments = () => (
  <CrudResourcePage
    title="Payment Ledger"
    description="Add, edit, and remove payment records with direct MSSQL updates."
    service={paymentsService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildPaymentPayload}
    buildUpdatePayload={buildPaymentPayload}
    createLabel="Add Payment"
    createTitle="Add Payment"
    editTitle="Edit Payment"
    searchPlaceholder="Search payments by ID, student, month, or amount..."
    emptyMessage="No payments were found in the database."
    getDeleteMessage={(row) => `Delete payment #${row.payment_id} for ${row.student_name}?`}
  />
)

export default Payments
