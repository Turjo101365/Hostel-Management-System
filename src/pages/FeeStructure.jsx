import CrudResourcePage from '../components/admin/CrudResourcePage'
import { feesService } from '../services/adminService'
import { formatCurrency } from '../utils/helpers'

const columns = [
  { header: 'Fee ID', key: 'fee_id', sortable: true },
  { header: 'Type', key: 'type', sortable: true },
  {
    header: 'Amount',
    key: 'amount',
    sortable: true,
    render: (row) => formatCurrency(row.amount)
  }
]

const fields = [
  {
    name: 'type',
    label: 'Fee Type',
    type: 'text',
    required: true,
    placeholder: 'Enter fee type'
  },
  {
    name: 'amount',
    label: 'Amount',
    type: 'number',
    required: true,
    min: 1,
    placeholder: 'Enter fee amount'
  }
]

const summaryItems = (rows) => {
  const amounts = rows.map((row) => Number(row.amount || 0))
  const highestFee = amounts.length ? Math.max(...amounts) : 0
  const averageFee = amounts.length ? Math.round(amounts.reduce((sum, value) => sum + value, 0) / amounts.length) : 0

  return [
    { label: 'Fee Types', value: rows.length, tone: 'blue' },
    { label: 'Highest Fee', value: formatCurrency(highestFee), tone: 'amber' },
    { label: 'Average Fee', value: formatCurrency(averageFee), tone: 'emerald' },
  ]
}

const getInitialValues = () => ({
  type: '',
  amount: '',
})

const getEditValues = (row) => ({
  type: row.type || '',
  amount: row.amount ? String(row.amount) : '',
})

const buildFeePayload = (values) => ({
  type: values.type.trim(),
  amount: Number(values.amount),
})

const FeeStructure = () => (
  <CrudResourcePage
    title="Fee Structure"
    description="Manage fee types and their amounts with live updates to the fee structure table."
    service={feesService}
    columns={columns}
    fields={fields}
    summaryItems={summaryItems}
    getInitialValues={getInitialValues}
    getEditValues={getEditValues}
    buildCreatePayload={buildFeePayload}
    buildUpdatePayload={buildFeePayload}
    createLabel="Add Fee Type"
    createTitle="Add Fee Type"
    editTitle="Edit Fee Type"
    searchPlaceholder="Search fees by type, ID, or amount..."
    emptyMessage="No fee structure records were found in the database."
    getDeleteMessage={(row) => `Delete fee type "${row.type}"?`}
  />
)

export default FeeStructure
