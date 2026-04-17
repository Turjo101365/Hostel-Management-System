import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  BedDouble,
  ClipboardList,
  CreditCard,
  UserCircle2,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Card from '../components/common/Card'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import studentPortalService from '../services/studentPortalService'

const summaryTone = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-violet-500',
]

const getBookingBadgeVariant = (status) => {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'danger'
  return 'warning'
}

const getPaymentBadgeVariant = (status) => {
  if (status === 'Approved' || status === 'Verified') return 'success'
  if (status === 'Rejected') return 'danger'
  return 'warning'
}

const getPaymentStatusLabel = (status) => {
  if (status === 'Approved' || status === 'Verified') return 'Approved'
  return status || 'Pending'
}

// Determine combined status: both payment AND booking must be approved
const getCombinedRequestStatus = (bookingStatus, paymentStatus) => {
  if (bookingStatus === 'Rejected' || paymentStatus === 'Rejected') {
    return 'rejected'
  }
  if (bookingStatus === 'Approved' && (paymentStatus === 'Approved' || paymentStatus === 'Verified')) {
    return 'fully_approved'
  }
  return 'pending'
}

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)

      try {
        const data = await studentPortalService.getDashboard()
        if (active) {
          setDashboard(data)
          const workflowNotifications = Array.isArray(data?.workflowNotifications)
            ? data.workflowNotifications
            : []

          if (workflowNotifications.length > 0) {
            const latest = workflowNotifications[0]
            const notificationCount = Number(data?.summary?.completedApprovals || workflowNotifications.length)

            toast.success(
              notificationCount > 1
                ? `Great news! ${notificationCount} of your room bookings are fully approved.`
                : `Great news! Your ${latest?.title || 'room'} booking is fully approved.`,
              { duration: 5000 }
            )
          }
        }
      } catch (error) {
        if (active) {
          const message = error.response?.data?.message || 'Failed to load your student dashboard.'
          toast.error(message)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-3xl bg-gray-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-gray-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 rounded-2xl bg-gray-200 dark:bg-slate-700" />
          <div className="h-80 rounded-2xl bg-gray-200 dark:bg-slate-700" />
        </div>
      </div>
    )
  }

  const profile = dashboard?.profile || {}
  const summary = dashboard?.summary || {}
  const recentPayments = dashboard?.recentPayments || []
  const roommateProfiles = dashboard?.roommateProfiles || []
  const bookings = dashboard?.bookings || []
  const recentRoomBookings = dashboard?.recentRoomBookings || []
  const hasAssignedRoom = Boolean(profile.room_id)
  const pendingBookingCount = recentRoomBookings.filter(
    (booking) => (booking.booking_status || booking.status) === 'Pending'
  ).length
  const pendingPaymentCount = summary.pendingPaymentVerifications
    || recentRoomBookings.filter((booking) => booking.payment_status === 'Pending').length

  // Find requests where both booking and payment are approved.
  const approvedBookingsWithApprovedPayments = recentRoomBookings.filter(
    (booking) =>
      (booking.booking_status || booking.status) === 'Approved'
      && (booking.payment_status === 'Approved' || booking.payment_status === 'Verified')
  )

  const summaryCards = [
    { label: 'Payment Records', value: summary.paymentRecords || 0, note: 'Saved against your account', icon: CreditCard },
    { label: 'Total Paid', value: formatCurrency(summary.totalPaid), note: 'Collected hostel payments', icon: BadgeCheck },
    {
      label: 'Booking Requests',
      value: summary.bookingRequests || recentRoomBookings.length,
      note: (summary.pendingBookings || pendingBookingCount)
        ? `${summary.pendingBookings || pendingBookingCount} booking + ${pendingPaymentCount} payment pending`
        : 'Track your room booking requests',
      icon: ClipboardList,
    },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-sky-700 to-cyan-500 p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Student Workspace</p>
            <h1 className="mt-3 text-3xl font-bold lg:text-4xl">
              Welcome back, {profile.name || 'Student'}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/80 lg:text-base">
              Check your room assignment, payment history, and booking activity from one student portal.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Badge className="border border-white/10 bg-white/15 text-white">
                {hasAssignedRoom
                  ? `Room ${profile.room_number} - ${profile.block_name || 'Block pending'}`
                  : 'Room assignment pending'}
              </Badge>
              <Badge className="border border-white/10 bg-white/15 text-white">
                Last login: {profile.last_login ? formatDateTime(profile.last_login) : 'Not available'}
              </Badge>
            </div>
            <Link
              to="/rooms"
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-900"
            >
              Book Another Room
            </Link>
          </div>
        </div>
      </section>

      {approvedBookingsWithApprovedPayments.length > 0 && (
        <div className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-4 dark:border-emerald-600 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                Room Booking Approved!
              </h3>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                Your booking request and payment have both been approved by an admin.
              </p>
              {approvedBookingsWithApprovedPayments.map((booking) => (
                <p key={booking.booking_id} className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  - {booking.room_name || 'Room'} - {booking.room_category || 'Category unknown'}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, index) => (
          <Card key={card.label} className="border-0 shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{card.note}</p>
              </div>
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${summaryTone[index]}`}>
                <card.icon className="h-5 w-5 text-white" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <Card title="My Profile" subtitle="Student account information">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/30">
              <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">Email</p>
              <p className="mt-2 text-sm font-semibold text-sky-950 dark:text-sky-100">
                {profile.email || 'Not available'}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Phone</p>
              <p className="mt-2 text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                {profile.phone_number || 'Not added yet'}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Guardian Contact</p>
              <p className="mt-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                {profile.guardian_contact || 'Not added yet'}
              </p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30">
              <p className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300">Room Status</p>
              <p className="mt-2 text-sm font-semibold text-violet-950 dark:text-violet-100">
                {hasAssignedRoom
                  ? `Room ${profile.room_number} - ${profile.block_name || 'Block pending'}`
                  : 'Pending room assignment'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Room Allocation" subtitle="Your current accommodation details">
          {hasAssignedRoom ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                    <BedDouble className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Room {profile.room_number}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {profile.block_name || 'Block pending'} - {profile.room_type || 'Type pending'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Capacity</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                    {profile.room_capacity || 0}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Current Occupancy</p>
                  <p className="mt-2 text-2xl font-bold text-amber-950 dark:text-amber-100">
                    {profile.current_occupancy || 0}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Roommates</p>
                {roommateProfiles.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {Number(profile.room_capacity || 0) <= 1
                      ? 'Single room selected, so no roommates are assigned.'
                      : 'Roommate allocation is pending.'}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {roommateProfiles.map((roommate) => (
                      <div key={roommate.id} className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-slate-800 dark:text-gray-200">
                        {roommate.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
              <UserCircle2 className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-4 font-semibold text-gray-900 dark:text-white">No room assigned yet</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Your student account is active, but an admin still needs to allocate a room.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card title="Recent Bookings" subtitle="Your room booking activity and allocations">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">No room booking requests found yet. Submit a room payment request to see it here.</p>
            <Link
              to="/rooms"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Browse Available Rooms
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.booking_transaction_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{booking.requested_room_name || 'Booked room'}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Allocated Room {booking.allocated_room_number || 'Pending'} - {booking.allocated_block_name || 'Block pending'}
                    </p>
                  </div>
                  <Badge variant={getBookingBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Amount</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(booking.amount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Booked On</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatDateTime(booking.booked_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            <Link
              to="/rooms"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              Book Another Room
            </Link>
          </div>
        )}
      </Card>

      <Card title="Room Booking Requests" subtitle="Your latest room booking activity">
        <div className="space-y-3">
          {recentRoomBookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You have not submitted any room booking requests yet.
            </p>
          ) : (
            recentRoomBookings.map((booking) => (
              <div key={booking.booking_id} className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-700/50">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">{booking.room_name || booking.room_title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {booking.room_category} room
                      {booking.amount ? ` - ${formatCurrency(booking.amount)}` : ''}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Requested on {formatDateTime(booking.requested_at || booking.booked_at)}
                    </p>
                    {/* Show payment and booking status */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Booking:</p>
                        <Badge variant={getBookingBadgeVariant(booking.booking_status)}>
                          {booking.booking_status || 'Pending'}
                        </Badge>
                      </div>
                      {booking.payment_status && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Payment:</p>
                          <Badge variant={getPaymentBadgeVariant(booking.payment_status)}>
                            {getPaymentStatusLabel(booking.payment_status)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Combined status indicator */}
                  {getCombinedRequestStatus(booking.booking_status, booking.payment_status) === 'fully_approved' && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 dark:bg-emerald-900/40">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Approved</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Recent Payments" subtitle="Latest payment history for your account">
        <div className="space-y-3">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No payment records are available yet.</p>
          ) : (
            recentPayments.map((payment) => (
              <div key={payment.payment_id} className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-slate-700/50">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{payment.month}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Paid on {formatDate(payment.payment_date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(payment.amount)}</p>
                  <Badge variant={getPaymentBadgeVariant(payment.status)} className="mt-2">
                    {getPaymentStatusLabel(payment.status)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

export default StudentDashboard
