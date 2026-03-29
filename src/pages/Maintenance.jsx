import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { maintenanceService, roomsService } from '../services/adminService'
import { formatDate } from '../utils/helpers'

const maintenanceStatusOptions = ['Pending', 'In Progress', 'Completed']

const getToday = () => new Date().toISOString().slice(0, 10)

const columns = [
  { header: 'Request ID', key: 'request_id', sortable: true },
  {
    header: 'Room',
    key: 'room_number',
    render: (row) => `Room ${row.room_number}`
  },
  { header: 'Issue Type', key: 'issue_type', sortable: true },
  { header: 'Description', key: 'description' },
  {
    header: 'Date Reported',
    key: 'date_reported',
    render: (row) => formatDate(row.date_reported)
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Completed' ? 'success' : row.status === 'In Progress' ? 'info' : 'warning'}>
        {row.status}
      </Badge>
    )
  }
]

const fields = [
  {
    name: 'room_id',
    label: 'Room',
    type: 'select',
    required: true,
    placeholder: 'Select a room',
    getOptions: ({ dependencies }) =>
      (dependencies.rooms || []).map((room) => ({
        value: String(room.room_id),
        label: `Room ${room.room_number} • ${room.hostel_block}`,
      }))
  },
  {
    name: 'issue_type',
    label: 'Issue Type',
    type: 'text',
    required: true,
    placeholder: 'Enter issue type'
  },
  {
    name: 'date_reported',
    label: 'Date Reported',
    type: 'date',
    required: true
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    placeholder: 'Select status',
    options: maintenanceStatusOptions.map((status) => ({ value: status, label: status }))
  }
]

const summaryItems = (rows) => [
  { label: 'Requests', value: rows.length, tone: 'blue' },
  { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, tone: 'amber' },
  { label: 'Completed', value: rows.filter((row) => row.status === 'Completed').length, tone: 'emerald' },
]

const loadDependencies = async () => {
  const rooms = await roomsService.getAll()
  return { rooms }
}

const getInitialValues = () => ({
  room_id: '',
  issue_type: '',
  date_reported: getToday(),
  status: 'Pending',
})

const getEditValues = (row) => ({
  room_id: row.room_id ? String(row.room_id) : '',
  issue_type: row.issue_type || '',
  date_reported: row.date_reported ? String(row.date_reported).slice(0, 10) : getToday(),
  status: row.status || 'Pending',
})

const buildMaintenancePayload = (values) => ({
  room_id: Number(values.room_id),
  issue_type: values.issue_type.trim(),
  date_reported: values.date_reported,
  status: values.status,
})

const Maintenance = () => (
  <CrudResourcePage
    title="Maintenance Tracker"
    description="Create, update, and remove maintenance requests that stay in sync with MSSQL."
    service={maintenanceService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildMaintenancePayload}
    buildUpdatePayload={buildMaintenancePayload}
    createLabel="Add Request"
    createTitle="Add Maintenance Request"
    editTitle="Edit Maintenance Request"
    searchPlaceholder="Search maintenance by room, issue type, status, or date..."
    emptyMessage="No maintenance requests were found in the database."
    getDeleteMessage={(row) => `Delete maintenance request #${row.request_id} for Room ${row.room_number}?`}
  />
)

export default Maintenance
