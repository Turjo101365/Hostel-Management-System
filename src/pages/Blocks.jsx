import CrudResourcePage from '../components/admin/CrudResourcePage'
import { blocksService } from '../services/adminService'

const columns = [
  { header: 'Block ID', key: 'block_id', sortable: true },
  { header: 'Block Name', key: 'block_name', sortable: true },
  { header: 'Total Rooms', key: 'total_rooms', sortable: true },
]

const fields = [
  {
    name: 'block_name',
    label: 'Block Name',
    type: 'text',
    required: true,
    placeholder: 'Enter block name'
  },
  {
    name: 'total_rooms',
    label: 'Total Rooms',
    type: 'number',
    required: true,
    min: 0,
    placeholder: 'Enter total room count'
  }
]

const summaryItems = (rows) => [
  { label: 'Total Blocks', value: rows.length, tone: 'blue' },
  { label: 'Rooms Across Blocks', value: rows.reduce((sum, row) => sum + Number(row.total_rooms || 0), 0), tone: 'amber' },
]

const getInitialValues = () => ({
  block_name: '',
  total_rooms: '',
})

const getEditValues = (row) => ({
  block_name: row.block_name || '',
  total_rooms: row.total_rooms === 0 ? '0' : String(row.total_rooms || ''),
})

const buildBlockPayload = (values) => ({
  block_name: values.block_name.trim(),
  total_rooms: Number(values.total_rooms),
})

const Blocks = () => (
  <CrudResourcePage
    title="Hostel Blocks"
    description="Create, edit, and remove hostel blocks while keeping room capacity organized."
    service={blocksService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildBlockPayload}
    buildUpdatePayload={buildBlockPayload}
    createLabel="Add Block"
    createTitle="Add Block"
    editTitle="Edit Block"
    searchPlaceholder="Search blocks by name or ID..."
    emptyMessage="No hostel blocks were found in the database."
    getDeleteMessage={(row) => `Delete ${row.block_name}? Make sure all rooms have been moved or removed first.`}
  />
)

export default Blocks
