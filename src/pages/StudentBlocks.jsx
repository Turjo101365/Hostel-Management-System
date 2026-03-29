import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentBlocksService } from '../services/studentService'

const columns = [
  { header: 'Block ID', key: 'block_id', sortable: true },
  { header: 'Block Name', key: 'block_name', sortable: true },
  { header: 'Total Rooms', key: 'total_rooms', sortable: true },
]

const summaryItems = (rows) => [
  { label: 'Total Blocks', value: rows.length, tone: 'blue' },
  { label: 'Rooms Across Blocks', value: rows.reduce((sum, row) => sum + Number(row.total_rooms || 0), 0), tone: 'amber' },
]

const StudentBlocks = () => (
  <StudentResourcePage
    title="Hostel Blocks"
    description="See how the hostel is organized across blocks and room capacity."
    service={studentBlocksService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search blocks by name or ID..."
    emptyMessage="No hostel blocks were found in the database."
  />
)

export default StudentBlocks
