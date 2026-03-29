import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { blocksService, roomsService } from '../services/adminService'

const columns = [
  { header: 'Room Number', key: 'room_number', sortable: true },
  { header: 'Block', key: 'hostel_block', sortable: true },
  { header: 'Type', key: 'type', sortable: true },
  {
    header: 'Occupancy',
    key: 'current_occupancy',
    render: (row) => `${row.current_occupancy} / ${row.capacity}`
  },
  {
    header: 'Status',
    key: 'status',
    render: (row) => (
      <Badge variant={row.status === 'Full' ? 'danger' : row.status === 'Available' ? 'success' : 'warning'}>
        {row.status}
      </Badge>
    )
  }
]

const fields = [
  {
    name: 'room_number',
    label: 'Room Number',
    type: 'text',
    required: true,
    placeholder: 'Enter room number'
  },
  {
    name: 'hostel_block_id',
    label: 'Block',
    type: 'select',
    required: true,
    placeholder: 'Select a block',
    getOptions: ({ dependencies }) =>
      (dependencies.blocks || []).map((block) => ({
        value: String(block.block_id),
        label: `${block.block_name} (${block.total_rooms} rooms)`,
      }))
  },
  {
    name: 'capacity',
    label: 'Capacity',
    type: 'number',
    required: true,
    min: 1,
    placeholder: 'Enter room capacity'
  },
  {
    name: 'type',
    label: 'Room Type',
    type: 'select',
    required: true,
    placeholder: 'Select room type',
    options: [
      { value: 'Single', label: 'Single' },
      { value: 'Double', label: 'Double' },
      { value: 'Triple', label: 'Triple' },
      { value: 'Shared', label: 'Shared' },
    ]
  }
]

const summaryItems = (rows) => {
  const totalCapacity = rows.reduce((sum, row) => sum + Number(row.capacity || 0), 0)
  const occupiedBeds = rows.reduce((sum, row) => sum + Number(row.current_occupancy || 0), 0)

  return [
    { label: 'Total Rooms', value: rows.length, tone: 'blue' },
    { label: 'Available Rooms', value: rows.filter((row) => row.status === 'Available').length, tone: 'emerald' },
    { label: 'Full Rooms', value: rows.filter((row) => row.status === 'Full').length, tone: 'rose' },
    { label: 'Bed Usage', value: `${occupiedBeds}/${totalCapacity}`, tone: 'amber' },
  ]
}

const loadDependencies = async () => {
  const blocks = await blocksService.getAll()
  return { blocks }
}

const getInitialValues = () => ({
  room_number: '',
  hostel_block_id: '',
  capacity: '',
  type: '',
})

const getEditValues = (row) => ({
  room_number: row.room_number || '',
  hostel_block_id: row.hostel_block_id ? String(row.hostel_block_id) : '',
  capacity: row.capacity ? String(row.capacity) : '',
  type: row.type || '',
})

const buildRoomPayload = (values) => ({
  room_number: values.room_number.trim(),
  hostel_block_id: Number(values.hostel_block_id),
  capacity: Number(values.capacity),
  type: values.type.trim(),
})

const Rooms = () => (
  <CrudResourcePage
    title="Room Directory"
    description="Manage rooms, block placement, and capacity with live MSSQL updates."
    service={roomsService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildRoomPayload}
    buildUpdatePayload={buildRoomPayload}
    createLabel="Add Room"
    createTitle="Add Room"
    editTitle="Edit Room"
    searchPlaceholder="Search rooms by number, block, type, or status..."
    emptyMessage="No rooms were found in the database."
    formNote="Current occupancy is updated automatically from the students assigned to each room."
    getDeleteMessage={(row) => `Delete Room ${row.room_number}? This will also remove its maintenance records.`}
  />
)

export default Rooms
