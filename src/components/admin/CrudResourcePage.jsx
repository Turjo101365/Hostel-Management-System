import { useEffect, useState } from 'react'
import { AlertTriangle, Pencil, Plus, RefreshCcw, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Card from '../common/Card'
import Input from '../common/Input'
import Modal from '../common/Modal'
import Select from '../common/Select'
import Table from '../common/Table'
import { getApiErrorMessage } from '../../services/api'

const toneClasses = {
  blue: 'bg-sky-50 text-sky-900 border-sky-100 dark:bg-sky-950/30 dark:text-sky-100 dark:border-sky-900/40',
  amber: 'bg-amber-50 text-amber-900 border-amber-100 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900/40',
  emerald: 'bg-emerald-50 text-emerald-900 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-900/40',
  rose: 'bg-rose-50 text-rose-900 border-rose-100 dark:bg-rose-950/30 dark:text-rose-100 dark:border-rose-900/40',
  violet: 'bg-violet-50 text-violet-900 border-violet-100 dark:bg-violet-950/30 dark:text-violet-100 dark:border-violet-900/40',
}

const CrudResourcePage = ({
  title,
  description,
  service,
  columns,
  fields,
  summaryItems,
  loadDependencies,
  getInitialValues = () => ({}),
  getEditValues = (row) => ({ ...row }),
  buildCreatePayload = (values) => values,
  buildUpdatePayload = (values) => values,
  validate,
  getDeleteMessage,
  createLabel = 'Add Record',
  createTitle = 'Add Record',
  editTitle = 'Edit Record',
  emptyMessage = 'No records available yet.',
  searchPlaceholder = 'Search records...',
  formNote,
  modalSize = 'lg',
}) => {
  const [rows, setRows] = useState([])
  const [dependencies, setDependencies] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadPageData = async (includeDependencies = true) => {
    setLoading(true)
    setError('')

    try {
      const tasks = [service.getAll()]

      if (includeDependencies && loadDependencies) {
        tasks.push(loadDependencies())
      }

      const [data, dependencyData] = await Promise.all(tasks)

      setRows(Array.isArray(data) ? data : [])

      if (includeDependencies && loadDependencies) {
        setDependencies(dependencyData || {})
      }
    } catch (fetchError) {
      const message = getApiErrorMessage(fetchError, `Failed to load ${title.toLowerCase()}.`)
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPageData(true)
  }, [])

  const metrics = summaryItems ? summaryItems(rows) : []

  const resetForm = () => {
    setFormErrors({})
    setFormValues(getInitialValues({ dependencies, rows }))
  }

  const openCreateModal = () => {
    setEditingRow(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (row) => {
    setEditingRow(row)
    setFormErrors({})
    setFormValues(getEditValues(row, { dependencies, rows }))
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRow(null)
    setFormErrors({})
  }

  const handleChange = (name, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))

    setFormErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [name]: '',
      }
    })
  }

  const runValidation = () => {
    const nextErrors = {}

    fields.forEach((field) => {
      const rawValue = formValues[field.name]
      const hasValue =
        rawValue !== null &&
        rawValue !== undefined &&
        String(rawValue).trim() !== ''

      if (field.required && !hasValue) {
        nextErrors[field.name] = `${field.label} is required.`
      }
    })

    if (validate) {
      const customErrors = validate(formValues, { dependencies, rows, editingRow }) || {}
      Object.assign(nextErrors, customErrors)
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!runValidation()) {
      return
    }

    setSaving(true)

    try {
      if (editingRow) {
        const payload = buildUpdatePayload(formValues, { dependencies, rows, editingRow })
        await service.update(editingRow.id, payload)
        toast.success(`${title} record updated successfully.`)
      } else {
        const payload = buildCreatePayload(formValues, { dependencies, rows })
        await service.create(payload)
        toast.success(`${title} record added successfully.`)
      }

      closeModal()
      await loadPageData(true)
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, 'Unable to save changes right now.')
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row) => {
    const fallbackLabel = row.name || row.block_name || row.room_number || row.student_name || row.id
    const confirmationMessage =
      getDeleteMessage?.(row) || `Delete ${fallbackLabel}? This action cannot be undone.`

    if (!window.confirm(confirmationMessage)) {
      return
    }

    setDeletingId(row.id)

    try {
      await service.remove(row.id)
      toast.success('Record deleted successfully.')
      await loadPageData(true)
    } catch (deleteError) {
      const message = getApiErrorMessage(deleteError, 'Unable to delete this record right now.')
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const actionColumn = {
    header: 'Actions',
    key: 'actions',
    render: (row) => (
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => openEditModal(row)}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          loading={deletingId === row.id}
          onClick={() => handleDelete(row)}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>
    ),
  }

  const tableColumns = [...columns, actionColumn]
  const activeFormNote =
    typeof formNote === 'function' ? formNote({ editingRow, values: formValues }) : formNote
  const modalSubtitle = editingRow
    ? 'Update the details below and save the changes directly to the live database.'
    : 'Fill in the details below to create a new record and sync it instantly with MSSQL.'

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {createLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => loadPageData(true)}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border p-5 shadow-sm ${toneClasses[metric.tone || 'blue']}`}
            >
              <p className="text-sm font-medium opacity-80">{metric.label}</p>
              <p className="mt-3 text-3xl font-bold">{metric.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-red-100 dark:border-red-900/40">
          <div className="flex items-start gap-3 text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Could not load {title.toLowerCase()}</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </Card>
      )}

      <Table
        columns={tableColumns}
        data={rows}
        loading={loading}
        emptyMessage={emptyMessage}
        searchPlaceholder={searchPlaceholder}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRow ? editTitle : createTitle}
        subtitle={modalSubtitle}
        badge={editingRow ? 'Editing Live Record' : 'Create Live Record'}
        size={modalSize}
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm dark:border-sky-900/40 dark:from-sky-950/30 dark:to-slate-900/40">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                    {editingRow ? 'Editing existing data' : 'Adding fresh data'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-sky-800/80 dark:text-sky-200/80">
                    Changes here appear immediately in the table after save.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                Persistence
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100">
                This popup is connected to the real MSSQL backend, not local mock data.
              </p>
            </div>
          </div>

          {activeFormNote && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {activeFormNote}
            </div>
          )}

          <div className="rounded-[26px] border border-gray-100 bg-gray-50/70 p-4 shadow-inner dark:border-slate-700/80 dark:bg-slate-900/40 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-slate-700">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Record Details</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Complete the fields below before saving.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-500 shadow-sm dark:bg-slate-800 dark:text-gray-300">
                {fields.length} field{fields.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {fields.map((field) => {
                const value = formValues[field.name] ?? ''
                const fieldKey = `${field.name}-${editingRow ? 'edit' : 'create'}`
                const resolvedOptions =
                  typeof field.getOptions === 'function'
                    ? field.getOptions({ dependencies, rows, editingRow, values: formValues })
                    : field.options || []

                const options = field.type === 'select' && field.placeholder
                  ? [{ value: '', label: field.placeholder }, ...resolvedOptions]
                  : resolvedOptions

                return (
                  <div
                    key={fieldKey}
                    className={field.fullWidth ? 'md:col-span-2' : ''}
                  >
                    <div
                      className={`rounded-2xl border bg-white/90 p-4 shadow-sm transition-all dark:bg-slate-800/85 ${
                        formErrors[field.name]
                          ? 'border-red-200 dark:border-red-900/40'
                          : 'border-gray-100 dark:border-slate-700/70'
                      }`}
                    >
                      {field.type === 'select' ? (
                        <Select
                          label={field.label}
                          value={value}
                          error={formErrors[field.name]}
                          options={options}
                          disabled={saving || field.disabled}
                          onChange={(event) => handleChange(field.name, event.target.value)}
                        />
                      ) : (
                        <Input
                          label={field.label}
                          type={field.type === 'textarea' ? undefined : field.type || 'text'}
                          value={value}
                          error={formErrors[field.name]}
                          placeholder={field.placeholder}
                          disabled={saving || field.disabled}
                          multiline={field.type === 'textarea'}
                          rows={field.rows || 4}
                          min={field.min}
                          step={field.step}
                          onChange={(event) => handleChange(field.name, event.target.value)}
                        />
                      )}

                      {field.helpText && (
                        <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {editingRow ? 'Save to update the existing record.' : 'Save to create the new record.'}
            </p>
            <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingRow ? 'Save Changes' : 'Create Record'}
            </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CrudResourcePage
