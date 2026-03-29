import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Building2, CreditCard, DoorOpen, RefreshCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Select from '../components/common/Select'
import { useAuth } from '../auth/AuthContext'
import { getApiErrorMessage } from '../services/api'
import { studentPortalService, studentRoomsService } from '../services/studentService'
import { formatCurrency, formatDate } from '../utils/helpers'

const StudentDashboard = () => {
  const { user, refreshUser } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  const loadDashboard = async () => {
    setLoading(true)

    try {
      const [dashboardData, roomsData] = await Promise.all([
        studentPortalService.getDashboard(),
        studentRoomsService.getAll(),
      ])

      setDashboard(dashboardData)
      setRooms(roomsData)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load student dashboard.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const availableRoomOptions = useMemo(
    () =>
      rooms
        .filter((room) => room.status !== 'Full')
        .map((room) => ({
          value: String(room.room_id),
          label: `Room ${room.room_number} • ${room.hostel_block} • ${room.current_occupancy}/${room.capacity}`,
        })),
    [rooms]
  )

  const handleSeatApply = async (event) => {
    event.preventDefault()

    if (!selectedRoomId) {
      toast.error('Select a room before applying.')
      return
    }

    setApplying(true)

    try {
      await studentPortalService.applyForSeat(Number(selectedRoomId))
      await Promise.all([loadDashboard(), refreshUser()])
      toast.success('Seat applied successfully.')
      setSelectedRoomId('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Seat application failed.'))
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-3xl bg-gray-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    )
  }

  const student = dashboard?.student
  const roomAssigned = dashboard?.roomAssigned || Boolean(user?.roomId)

  const metrics = [
    { label: 'Assigned Room', value: student?.room_number ? `Room ${student.room_number}` : 'Not assigned', tone: 'bg-sky-500' },
    { label: 'Block', value: student?.block_name || 'Pending', tone: 'bg-violet-500' },
    { label: 'Payments', value: dashboard?.totalPayments || 0, tone: 'bg-emerald-500' },
    { label: 'Open Rooms', value: dashboard?.availableRooms || 0, tone: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-primary to-cyan-700 p-6 lg:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Student Workspace</p>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold">
              Welcome back, {user?.name || 'Student'}
            </h1>
            <p className="mt-3 max-w-xl text-sm lg:text-base text-white/80">
              Check your room assignment, review your records, and apply for an available seat from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge className="bg-white/15 text-white border border-white/10">
              Last sync: {dashboard?.lastUpdatedAt ? new Date(dashboard.lastUpdatedAt).toLocaleTimeString() : 'Just now'}
            </Badge>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white hover:text-slate-900" onClick={loadDashboard}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-0 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{metric.label}</p>
                <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
              </div>
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${metric.tone}`}>
                <BedDouble className="h-5 w-5 text-white" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <Card title="Seat Application" subtitle="Choose a room only if you have not been assigned one yet.">
          {roomAssigned ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Seat already assigned</p>
                <p className="mt-2 text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                  {student?.room_number ? `Room ${student.room_number}` : 'Room assigned'}
                </p>
                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-200/80">
                  {student?.block_name ? `${student.block_name} block` : 'Your seat is active.'}
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contact hostel administration if you need to change your room assignment.
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSeatApply}>
              <Select
                label="Available Room"
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
                options={[
                  { value: '', label: 'Select a room' },
                  ...availableRoomOptions,
                ]}
              />
              <Button type="submit" loading={applying} className="w-full sm:w-auto">
                Apply For Seat
              </Button>
            </form>
          )}
        </Card>

        <Card title="My Snapshot" subtitle="Current student details connected to your account.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/30">
              <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">Student ID</p>
              <p className="mt-2 text-lg font-semibold text-sky-950 dark:text-sky-100">{student?.student_id || '-'}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30">
              <p className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300">Guardian Contact</p>
              <p className="mt-2 text-lg font-semibold text-violet-950 dark:text-violet-100">{user?.guardianContact || 'Not added yet'}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Latest Payment</p>
              <p className="mt-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                {dashboard?.latestPayment ? `${dashboard.latestPayment.month} • ${formatCurrency(dashboard.latestPayment.amount)}` : 'No payment yet'}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Last Payment Date</p>
              <p className="mt-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {dashboard?.latestPayment ? formatDate(dashboard.latestPayment.payment_date) : 'Not available'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link to="/student/rooms" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <DoorOpen className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">Browse Rooms</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">See all rooms and availability.</p>
        </Link>
        <Link to="/student/blocks" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <Building2 className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">View Blocks</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Understand hostel block layout.</p>
        </Link>
        <Link to="/student/payments" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <CreditCard className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">My Payments</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review your own payment history.</p>
        </Link>
        <Link to="/student/mess" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <BedDouble className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          <p className="mt-4 font-semibold text-gray-900 dark:text-white">Mess Menu</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check this week&apos;s meals.</p>
        </Link>
      </div>
    </div>
  )
}

export default StudentDashboard
