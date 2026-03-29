import CrudResourcePage from '../components/admin/CrudResourcePage'
import { messService } from '../services/adminService'

const dayOptions = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const columns = [
  { header: 'Day', key: 'day', sortable: true },
  { header: 'Breakfast', key: 'breakfast' },
  { header: 'Lunch', key: 'lunch' },
  { header: 'Dinner', key: 'dinner' },
]

const fields = [
  {
    name: 'day',
    label: 'Day',
    type: 'select',
    required: true,
    placeholder: 'Select day',
    options: dayOptions.map((day) => ({ value: day, label: day }))
  },
  {
    name: 'breakfast',
    label: 'Breakfast',
    type: 'textarea',
    placeholder: 'Enter breakfast items',
    rows: 3
  },
  {
    name: 'lunch',
    label: 'Lunch',
    type: 'textarea',
    placeholder: 'Enter lunch items',
    rows: 3
  },
  {
    name: 'dinner',
    label: 'Dinner',
    type: 'textarea',
    placeholder: 'Enter dinner items',
    rows: 3
  }
]

const summaryItems = (rows) => [
  { label: 'Scheduled Days', value: rows.length, tone: 'blue' },
  { label: 'Breakfast Slots', value: rows.filter((row) => row.breakfast).length, tone: 'amber' },
  { label: 'Dinner Slots', value: rows.filter((row) => row.dinner).length, tone: 'emerald' },
]

const getInitialValues = () => ({
  day: '',
  breakfast: '',
  lunch: '',
  dinner: '',
})

const getEditValues = (row) => ({
  day: row.day || '',
  breakfast: row.breakfast || '',
  lunch: row.lunch || '',
  dinner: row.dinner || '',
})

const buildMessPayload = (values) => ({
  day: values.day,
  breakfast: values.breakfast.trim(),
  lunch: values.lunch.trim(),
  dinner: values.dinner.trim(),
})

const validateMessMenu = (values) => {
  if (!values.breakfast.trim() && !values.lunch.trim() && !values.dinner.trim()) {
    return {
      breakfast: 'Enter at least one meal item.',
    }
  }

  return {}
}

const MessMenu = () => (
  <CrudResourcePage
    title="Mess Menu"
    description="Manage the weekly breakfast, lunch, and dinner schedule in the live database."
    service={messService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildMessPayload}
    buildUpdatePayload={buildMessPayload}
    validate={validateMessMenu}
    createLabel="Add Day Menu"
    createTitle="Add Day Menu"
    editTitle="Edit Day Menu"
    searchPlaceholder="Search the weekly menu by day or meal items..."
    emptyMessage="No mess menu entries were found in the database."
    formNote="Each row represents one day. You can fill breakfast, lunch, dinner, or any combination of them."
    getDeleteMessage={(row) => `Delete the entire mess menu for ${row.day}?`}
  />
)

export default MessMenu
