import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  DoorOpen,
  Users,
  Wrench
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/common/Card'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import StatsChart from '../components/charts/StatsChart'
import {
  dashboardService,
  maintenanceService,
  paymentsService,
} from '../services/adminService'
import { formatCurrency, formatDate } from '../utils/helpers'

const quickLinks = [
  { to: '/admin/students', label: 'Students', description: 'Review student allocations', icon: Users, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300' },
  { to: '/admin/rooms', label: 'Rooms', description: 'Track room occupancy', icon: DoorOpen, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' },
  { to: '/admin/blocks', label: 'Blocks', description: 'See block capacity and room groups', icon: Building2, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
  { to: '/admin/payments', label: 'Payments', description: 'Monitor recent collections', icon: CreditCard, tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
  { to: '/admin/maintenance', label: 'Maintenance', description: 'Handle pending work', icon: Wrench, tone: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300' },
  { to: '/admin/visitors', label: 'Visitors', description: 'Audit visit records', icon: ClipboardList, tone: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300' },
  { to: '/admin/leaves', label: 'Leaves', description: 'Watch leave approvals', icon: CalendarDays, tone: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/30 dark:text-fuchsia-300' },
]

const metricTone = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-orange-500',
]

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [payments, setPayments] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)

    try {
      const [summaryData, paymentsData, maintenanceData] = await Promise.all([
        dashboardService.getSummary(),
        paymentsService.getAll(),
        maintenanceService.getAll(),
      ])

      setSummary(summaryData)
      setPayments(paymentsData.slice(0, 5))
      setMaintenance(
        maintenanceData
          .filter((item) => item.status === 'Pending')
          .slice(0, 4)
      )
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load dashboard data.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-gray-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-2xl bg-gray-200 dark:bg-slate-700" />
          <div className="h-80 rounded-2xl bg-gray-200 dark:bg-slate-700" />
        </div>
      </div>
    )
  }

  const metrics = [
    { label: 'Students', value: summary?.totalStudents || 0, note: 'Registered in MSSQL', to: '/admin/students' },
    { label: 'Rooms', value: summary?.totalRooms || 0, note: 'Available to manage', to: '/admin/rooms' },
    { label: 'Occupied', value: summary?.occupiedRooms || 0, note: 'Currently filled rooms', to: '/admin/rooms' },
    { label: 'Pending', value: summary?.pendingMaintenance || 0, note: 'Maintenance requests', to: '/admin/maintenance' },
  ]

  const chartData = {
    available: summary?.availableRooms || 0,
    occupied: summary?.occupiedRooms || 0,
    maintenance: summary?.pendingMaintenance || 0,
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-primary to-sky-700 p-6 lg:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Admin Workspace</p>
            <h1 className="mt-3 text-3xl lg:text-4xl font-bold">
              Hostel operations, payments, and approvals in one control room
            </h1>
            <p className="mt-3 max-w-xl text-sm lg:text-base text-white/80">
              Your dashboard is now connected to the live MSSQL-backed API. Use the cards below to jump across the rest of the admin pages.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge className="bg-white/15 text-white border border-white/10">
              Last sync: {summary?.lastUpdatedAt ? new Date(summary.lastUpdatedAt).toLocaleTimeString() : 'Just now'}
            </Badge>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white hover:text-slate-900" onClick={loadDashboard}>
              Refresh Dashboard
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Link
            key={metric.label}
            to={metric.to}
            className="block transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:focus-visible:ring-blue-500 rounded-xl"
          >
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{metric.note}</p>
                </div>
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${metricTone[index]}`}>
                  <ArrowRight className="w-5 h-5 text-white" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,0.9fr] gap-6">
        <Card title="Room Occupancy" subtitle="Available rooms, occupied rooms, and pending maintenance">
          <StatsChart data={chartData} />
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Available</p>
              <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{summary?.availableRooms || 0}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-3">
              <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Occupied</p>
              <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100">{summary?.occupiedRooms || 0}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Pending</p>
              <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">{summary?.pendingMaintenance || 0}</p>
            </div>
          </div>
        </Card>

        <Card
          title="Recent Payments"
          subtitle={`Total collection: ${formatCurrency(summary?.totalCollection)}`}
          action={<Link to="/admin/payments" className="text-sm text-primary dark:text-blue-400 hover:underline">View ledger</Link>}
        >
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No payments available yet.</p>
            ) : (
              payments.map((payment) => (
                <div key={payment.payment_id} className="flex items-center justify-between rounded-2xl bg-gray-50 dark:bg-slate-700/50 p-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{payment.student_name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {payment.month} • {formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                    <Badge variant="success" className="mt-2">{payment.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr,0.85fr] gap-6">
        <Card title="Admin Navigation" subtitle="Jump directly into the rest of the dashboard pages">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-2xl border border-gray-100 dark:border-slate-700 p-4 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card
          title="Pending Maintenance"
          subtitle="Rooms needing attention first"
          action={<Link to="/admin/maintenance" className="text-sm text-primary dark:text-blue-400 hover:underline">Open tracker</Link>}
        >
          <div className="space-y-3">
            {maintenance.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending issues at the moment.</p>
            ) : (
              maintenance.map((request) => (
                <div key={request.request_id} className="rounded-2xl bg-gray-50 dark:bg-slate-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 dark:text-white">Room {request.room_number}</p>
                    <Badge variant="warning">{request.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{request.issue_type}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(request.date_reported)}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
