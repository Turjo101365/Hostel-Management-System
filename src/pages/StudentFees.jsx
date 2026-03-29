import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentFeesService } from '../services/studentService'
import { formatCurrency } from '../utils/helpers'

const columns = [
  { header: 'Fee ID', key: 'fee_id', sortable: true },
  { header: 'Type', key: 'type', sortable: true },
  {
    header: 'Amount',
    key: 'amount',
    sortable: true,
    render: (row) => formatCurrency(row.amount),
  },
]

const summaryItems = (rows) => [
  { label: 'Fee Types', value: rows.length, tone: 'blue' },
  { label: 'Highest Fee', value: formatCurrency(Math.max(0, ...rows.map((row) => Number(row.amount || 0)))), tone: 'amber' },
]

const StudentFees = () => (
  <StudentResourcePage
    title="Fee Structure"
    description="Check the latest fee types and amounts published by hostel administration."
    service={studentFeesService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search fee type or amount..."
    emptyMessage="No fee records were found in the database."
  />
)

export default StudentFees
