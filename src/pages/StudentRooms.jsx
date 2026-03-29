import Badge from '../components/common/Badge'
import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentRoomsService } from '../services/studentService'

const columns = [
  { header: 'Room Number', key: 'room_number', sortable: true },
  { header: 'Block', key: 'hostel_block', sortable: true },
  { header: 'Type', key: 'type', sortable: true },
  {
    header: 'Occupancy',
    key: 'current_occupancy',
    render: (row) => `${row.current_occupancy} / ${row.capacity}`,
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Full' ? 'danger' : row.status === 'Available' ? 'success' : 'warning'}>
        {row.status}
      </Badge>
    ),
  },
]

const summaryItems = (rows) => {
  const totalCapacity = rows.reduce((sum, row) => sum + Number(row.capacity || 0), 0)
  const occupiedBeds = rows.reduce((sum, row) => sum + Number(row.current_occupancy || 0), 0)

  return [
    { label: 'Total Rooms', value: rows.length, tone: 'blue' },
    { label: 'Available Rooms', value: rows.filter((row) => row.status !== 'Full').length, tone: 'emerald' },
    { label: 'Full Rooms', value: rows.filter((row) => row.status === 'Full').length, tone: 'rose' },
    { label: 'Bed Usage', value: `${occupiedBeds}/${totalCapacity}`, tone: 'amber' },
  ]
}

const StudentRooms = () => (
  <StudentResourcePage
    title="Available Rooms"
    description="Browse hostel rooms and check which ones still have free capacity before applying for a seat."
    service={studentRoomsService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search rooms by number, block, type, or status..."
    emptyMessage="No rooms were found in the database."
  />
)

export default StudentRooms
