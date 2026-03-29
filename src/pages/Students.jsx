import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { roomsService, studentsService } from '../services/adminService'

const columns = [
  { header: 'Student ID', key: 'student_id', sortable: true },
  { header: 'Name', key: 'name', sortable: true },
  {
    header: 'Room',
    key: 'room_id',
    sortable: true,
    render: (row) => row.room_number ? `Room ${row.room_number}` : `Room ${row.room_id}`
  },
  {
    header: 'Block',
    key: 'block_name',
    sortable: true,
    render: (row) => row.block_name || '-'
  },
  { header: 'Guardian Contact', key: 'guardian_contact' },
  {
    header: 'Status',
    key: 'status',
    render: (row) => <Badge variant="success">{row.status}</Badge>
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
        label: `Room ${room.room_number} • ${room.hostel_block} • ${room.current_occupancy}/${room.capacity}`,
      }))
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
]

const loadDependencies = async () => {
  const rooms = await roomsService.getAll()
  return { rooms }
}

const getInitialValues = () => ({
  name: '',
  room_id: '',
  guardian_contact: '',
})

const getEditValues = (row) => ({
  name: row.name || '',
  room_id: row.room_id ? String(row.room_id) : '',
  guardian_contact: row.guardian_contact || '',
})

const buildStudentPayload = (values) => ({
  name: values.name.trim(),
  room_id: Number(values.room_id),
  guardian_contact: values.guardian_contact.trim(),
})

const Students = () => (
  <CrudResourcePage
    title="Student Directory"
    description="Add, edit, and remove student allocations with live MSSQL updates."
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
    searchPlaceholder="Search students by ID, name, room, block, or guardian..."
    emptyMessage="No students were found in the database."
    getDeleteMessage={(row) => `Delete ${row.name}? Related visitor, payment, and leave records for this student will also be removed.`}
  />
)

export default Students
