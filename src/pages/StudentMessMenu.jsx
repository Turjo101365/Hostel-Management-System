import StudentResourcePage from '../components/student/StudentResourcePage'
import { studentMessService } from '../services/studentService'

const columns = [
  { header: 'Day', key: 'day', sortable: true },
  { header: 'Breakfast', key: 'breakfast' },
  { header: 'Lunch', key: 'lunch' },
  { header: 'Dinner', key: 'dinner' },
]

const summaryItems = (rows) => [
  { label: 'Scheduled Days', value: rows.length, tone: 'blue' },
  { label: 'Breakfast Slots', value: rows.filter((row) => row.breakfast).length, tone: 'amber' },
  { label: 'Dinner Slots', value: rows.filter((row) => row.dinner).length, tone: 'emerald' },
]

const StudentMessMenu = () => (
  <StudentResourcePage
    title="Mess Menu"
    description="View the current weekly breakfast, lunch, and dinner menu."
    service={studentMessService}
    columns={columns}
    summaryItems={summaryItems}
    searchPlaceholder="Search the weekly menu by day or meal items..."
    emptyMessage="No mess menu entries were found in the database."
  />
)

export default StudentMessMenu
