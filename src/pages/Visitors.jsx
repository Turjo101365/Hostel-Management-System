import Badge from '../components/common/Badge'
import CrudResourcePage from '../components/admin/CrudResourcePage'
import { studentsService, visitorsService } from '../services/adminService'
import { formatDateTime } from '../utils/helpers'

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const getCurrentDateTimeValue = () => toDateTimeLocalValue(new Date().toISOString())

const columns = [
  { header: 'Visitor ID', key: 'visitor_id', sortable: true },
  { header: 'Student', key: 'student_name', sortable: true },
  { header: 'Purpose', key: 'purpose', sortable: true },
  {
    header: 'Entry Time',
    key: 'entry_time',
    render: (row) => formatDateTime(row.entry_time)
  },
  {
    header: 'Exit Time',
    key: 'exit_time',
    render: (row) => row.exit_time ? formatDateTime(row.exit_time) : <Badge variant="warning">Still inside</Badge>
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
    name: 'purpose',
    label: 'Purpose',
    type: 'textarea',
    required: true,
    placeholder: 'Enter visit purpose',
    fullWidth: true,
    rows: 3
  },
  {
    name: 'entry_time',
    label: 'Entry Time',
    type: 'datetime-local',
    required: true
  },
  {
    name: 'exit_time',
    label: 'Exit Time',
    type: 'datetime-local',
    helpText: 'Leave blank if the visitor is still inside.'
  }
]

const summaryItems = (rows) => [
  { label: 'Total Visits', value: rows.length, tone: 'blue' },
  { label: 'Onsite Now', value: rows.filter((row) => !row.exit_time).length, tone: 'rose' },
  { label: 'Students Visited', value: new Set(rows.map((row) => row.student_id)).size, tone: 'emerald' },
]

const loadDependencies = async () => {
  const students = await studentsService.getAll()
  return { students }
}

const getInitialValues = () => ({
  student_id: '',
  purpose: '',
  entry_time: getCurrentDateTimeValue(),
  exit_time: '',
})

const getEditValues = (row) => ({
  student_id: row.student_id ? String(row.student_id) : '',
  purpose: row.purpose || '',
  entry_time: toDateTimeLocalValue(row.entry_time),
  exit_time: toDateTimeLocalValue(row.exit_time),
})

const buildVisitorPayload = (values) => ({
  student_id: Number(values.student_id),
  purpose: values.purpose.trim(),
  entry_time: values.entry_time,
  exit_time: values.exit_time || null,
})

const validateVisitor = (values) => {
  if (values.exit_time && values.entry_time && values.exit_time < values.entry_time) {
    return {
      exit_time: 'Exit time must be later than entry time.'
    }
  }

  return {}
}

const Visitors = () => (
  <CrudResourcePage
    title="Visitor Log"
    description="Track visitor entries and exits with direct updates to the Visitor table in MSSQL."
    service={visitorsService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    loadDependencies={loadDependencies}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildVisitorPayload}
    buildUpdatePayload={buildVisitorPayload}
    validate={validateVisitor}
    createLabel="Add Visitor"
    createTitle="Add Visitor Entry"
    editTitle="Edit Visitor Entry"
    searchPlaceholder="Search visitors by student, purpose, or timestamp..."
    emptyMessage="No visitor activity was found in the database."
    getDeleteMessage={(row) => `Delete visitor log #${row.visitor_id} for ${row.student_name}?`}
  />
)

export default Visitors
