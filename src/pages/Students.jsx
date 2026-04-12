import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { roomsService, studentsService } from '../services/adminService'
import { formatCurrency, formatDateTime } from '../utils/helpers'

const columns = [
  { header: 'Student ID', key: 'student_id', sortable: true },
  { header: 'Name', key: 'name', sortable: true },
  {
    header: 'Email',
    key: 'email',
    sortable: true,
    render: (row) => row.email || '-'
  },
  {
    header: 'Phone',
    key: 'phone_number',
    sortable: true,
    render: (row) => row.phone_number || '-'
  },
  {
    header: 'Room',
    key: 'room_id',
    sortable: true,
    render: (row) => row.room_number ? `Room ${row.room_number}` : row.room_id ? `Room ${row.room_id}` : 'Unassigned'
  },
  {
    header: 'Block',
    key: 'block_name',
    sortable: true,
    render: (row) => row.block_name || '-'
  },
  {
    header: 'Room Type',
    key: 'room_type',
    sortable: true,
    render: (row) => row.room_type || '-'
  },
  { header: 'Guardian Contact', key: 'guardian_contact' },
  {
    header: 'Payments',
    key: 'total_paid',
    sortable: true,
    render: (row) => `${formatCurrency(row.total_paid)} (${Number(row.payment_records || 0)})`
  },
  {
    header: 'Created',
    key: 'created_at',
    sortable: true,
    render: (row) => formatDateTime(row.created_at)
  },
  {
    header: 'Last Login',
    key: 'last_login',
    sortable: true,
    render: (row) => row.last_login ? formatDateTime(row.last_login) : 'Never'
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
        {row.status}
      </Badge>
    )
  }
]

const fields = [
  {
    name: 'name',
    label: 'Student Name',
    type: 'text',
    required: true,
    placeholder: 'Enter student name'
  },
  {
    name: 'room_id',
    label: 'Room',
    type: 'select',
    required: true,
    placeholder: 'Select a room',
    getOptions: ({ dependencies }) =>
      (dependencies.rooms || []).map((room) => ({
        value: String(room.room_id),
        label: `Room ${room.room_number} - ${room.hostel_block} - ${room.current_occupancy}/${room.capacity}`,
      }))
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter student email'
  },
  {
    name: 'phone_number',
    label: 'Phone Number',
    type: 'text',
    placeholder: 'Enter phone number'
  },
  {
    name: 'guardian_contact',
    label: 'Guardian Contact',
    type: 'text',
    placeholder: 'Enter guardian phone number'
  }
]

const summaryItems = (rows) => [
  { label: 'Total Students', value: rows.length, tone: 'blue' },
  { label: 'Rooms Used', value: new Set(rows.map((row) => row.room_id)).size, tone: 'amber' },
  { label: 'Guardian Records', value: rows.filter((row) => row.guardian_contact).length, tone: 'emerald' },
  { label: 'Total Paid', value: formatCurrency(rows.reduce((sum, row) => sum + Number(row.total_paid || 0), 0)), tone: 'violet' },
]

const loadDependencies = async () => {
  const rooms = await roomsService.getAll()
  return { rooms }
}

const getInitialValues = () => ({
  name: '',
  room_id: '',
  email: '',
  phone_number: '',
  guardian_contact: '',
})

const getEditValues = (row) => ({
  name: row.name || '',
  room_id: row.room_id ? String(row.room_id) : '',
  email: row.email || '',
  phone_number: row.phone_number || '',
  guardian_contact: row.guardian_contact || '',
})

const buildStudentPayload = (values) => ({
  name: values.name.trim(),
  room_id: Number(values.room_id),
  email: values.email.trim(),
  phone_number: values.phone_number.trim(),
  guardian_contact: values.guardian_contact.trim(),
})

const Students = () => (
  <CrudResourcePage
    title="Student Directory"
    description="Full student profile records with live room and payment context from backend."
    service={studentsService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildStudentPayload}
    buildUpdatePayload={buildStudentPayload}
    createLabel="Add Student"
    createTitle="Add Student"
    editTitle="Edit Student"
    searchPlaceholder="Search students by ID, name, email, phone, room, block, or payment..."
    emptyMessage="No students were found in the database."
    getDeleteMessage={(row) => `Delete ${row.name}? Related booking, payment, leave, and roommate records for this student will also be removed.`}
  />
)

export default Students
