import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { leavesService, studentsService } from '../services/adminService'
import { formatDate } from '../utils/helpers'

const leaveStatusOptions = ['Pending', 'Approved', 'Rejected']

const getToday = () => new Date().toISOString().slice(0, 10)

const columns = [
  { header: 'Leave ID', key: 'leave_id', sortable: true },
  { header: 'Student', key: 'student_name', sortable: true },
  {
    header: 'From',
    key: 'from_date',
    render: (row) => formatDate(row.from_date)
  },
  {
    header: 'To',
    key: 'to_date',
    render: (row) => formatDate(row.to_date)
  },
  { header: 'Reason', key: 'reason' },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Approved' ? 'success' : row.status === 'Rejected' ? 'danger' : 'warning'}>
        {row.status}
      </Badge>
    )
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
    name: 'from_date',
    label: 'From Date',
    type: 'date',
    required: true
  },
  {
    name: 'to_date',
    label: 'To Date',
    type: 'date',
    required: true
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    placeholder: 'Select status',
    options: leaveStatusOptions.map((status) => ({ value: status, label: status }))
  },
  {
    name: 'reason',
    label: 'Reason',
    type: 'textarea',
    required: true,
    placeholder: 'Enter leave reason',
    rows: 4,
    fullWidth: true
  }
]

const summaryItems = (rows) => [
  { label: 'Leave Requests', value: rows.length, tone: 'blue' },
  { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, tone: 'amber' },
  { label: 'Approved', value: rows.filter((row) => row.status === 'Approved').length, tone: 'emerald' },
  { label: 'Rejected', value: rows.filter((row) => row.status === 'Rejected').length, tone: 'rose' },
]

const loadDependencies = async () => {
  const students = await studentsService.getAll()
  return { students }
}

const getInitialValues = () => ({
  student_id: '',
  from_date: getToday(),
  to_date: getToday(),
  status: 'Pending',
  reason: '',
})

const getEditValues = (row) => ({
  student_id: row.student_id ? String(row.student_id) : '',
  from_date: row.from_date ? String(row.from_date).slice(0, 10) : getToday(),
  to_date: row.to_date ? String(row.to_date).slice(0, 10) : getToday(),
  status: row.status || 'Pending',
  reason: row.reason || '',
})

const buildLeavePayload = (values) => ({
  student_id: Number(values.student_id),
  from_date: values.from_date,
  to_date: values.to_date,
  status: values.status,
  reason: values.reason.trim(),
})

const validateLeave = (values) => {
  if (values.from_date && values.to_date && values.to_date < values.from_date) {
    return {
      to_date: 'To date must be later than or equal to from date.',
    }
  }

  return {}
}

const LeaveRequests = () => (
  <CrudResourcePage
    title="Leave Requests"
    description="Manage leave applications, date ranges, and approval outcomes in the live database."
    service={leavesService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildLeavePayload}
    buildUpdatePayload={buildLeavePayload}
    validate={validateLeave}
    createLabel="Add Leave"
    createTitle="Add Leave Request"
    editTitle="Edit Leave Request"
    searchPlaceholder="Search leave requests by student, reason, status, or date..."
    emptyMessage="No leave requests were found in the database."
    getDeleteMessage={(row) => `Delete leave request #${row.leave_id} for ${row.student_name}?`}
  />
)

export default LeaveRequests
