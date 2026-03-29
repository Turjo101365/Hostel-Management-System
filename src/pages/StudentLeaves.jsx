import Badge from '../components/common/Badge'
import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentLeavesService } from '../services/studentService'
import { formatDate } from '../utils/helpers'

const columns = [
  { header: 'Leave ID', key: 'leave_id', sortable: true },
  {
    header: 'From',
    key: 'from_date',
    render: (row) => formatDate(row.from_date),
  },
  {
    header: 'To',
    key: 'to_date',
    render: (row) => formatDate(row.to_date),
  },
  { header: 'Reason', key: 'reason' },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Rejected' ? 'danger' : 'warning'}>
        {row.status}
      </Badge>
    ),
  },
]

const summaryItems = (rows) => [
  { label: 'Leave Records', value: rows.length, tone: 'blue' },
  { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, tone: 'amber' },
  { label: 'Approved', value: rows.filter((row) => row.status === 'Approved').length, tone: 'emerald' },
]

const StudentLeaves = () => (
  <StudentResourcePage
    title="My Leave History"
    description="Review the leave records connected to your student account."
    service={studentLeavesService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search leave records by status, reason, or date..."
    emptyMessage="No leave records were found for your account."
  />
)

export default StudentLeaves
