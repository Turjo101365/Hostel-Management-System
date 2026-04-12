import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Badge from '../components/common/Badge'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import { getApiErrorMessage } from '../services/api'
import publicRoomsService from '../services/publicRoomsService'
import studentBookingService from '../services/studentBookingService'
import { clearBookingIntent, getBookingIntent } from '../utils/bookingIntent'
import { formatCurrency } from '../utils/helpers'
import { handleRoomImageError } from '../utils/roomImageFallback'

const getDigitsOnly = (value) => String(value || '').replace(/\D/g, '')

const formatCardNumber = (value) => {
  const digits = getDigitsOnly(value).slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

const formatExpiry = (value) => {
  const digits = getDigitsOnly(value).slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const detectCardBrand = (digits) => {
  if (/^4/.test(digits)) return 'Visa'
  if (/^5[1-5]/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  if (/^6(?:011|5)/.test(digits)) return 'Discover'
  return 'Card'
}

const validateExpiry = (expiry) => {
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return false
  }

  const [monthText, yearText] = expiry.split('/')
  const month = Number(monthText)
  const year = 2000 + Number(yearText)
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999)
  return !Number.isNaN(expiryDate.getTime()) && expiryDate >= new Date()
}

const StudentRoomPayment = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [room, setRoom] = useState(null)
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [roomError, setRoomError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successPayload, setSuccessPayload] = useState(null)
  const [redirectCountdown, setRedirectCountdown] = useState(4)
  const [errors, setErrors] = useState({})
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)
  const [formData, setFormData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    pin: '',
  })

  const selectedRoomId = useMemo(() => {
    const fromQuery = Number.parseInt(searchParams.get('roomId') || '', 10)
    if (Number.isInteger(fromQuery) && fromQuery > 0) {
      return fromQuery
    }

    const intent = getBookingIntent()
    return intent?.roomId || null
  }, [searchParams])

  useEffect(() => {
    let active = true

    const loadRoom = async () => {
      if (!selectedRoomId) {
        setRoomError('No room was selected. Please choose a room first.')
        setLoadingRoom(false)
        return
      }

      setLoadingRoom(true)
      setRoomError('')

      try {
        const data = await publicRoomsService.getById(selectedRoomId)
        if (!active) return

        setRoom(data)
      } catch (error) {
        if (!active) return
        setRoom(null)
        setRoomError(getApiErrorMessage(error, 'Unable to load the selected room right now.'))
      } finally {
        if (active) {
          setLoadingRoom(false)
        }
      }
    }

    loadRoom()

    return () => {
      active = false
    }
  }, [selectedRoomId])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [])

  const cardDigits = getDigitsOnly(formData.cardNumber)
  const cardBrand = detectCardBrand(cardDigits)
  const payableAmount = Number(room?.price_min || room?.price_max || 0)

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))

    if (errors[field]) {
      setErrors((current) => ({
        ...current,
        [field]: '',
      }))
    }
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.cardholderName.trim()) {
      nextErrors.cardholderName = 'Cardholder name is required.'
    }

    if (cardDigits.length < 15 || cardDigits.length > 16) {
      nextErrors.cardNumber = 'Enter a valid card number.'
    }

    if (!validateExpiry(formData.expiry)) {
      nextErrors.expiry = 'Enter a valid future expiry date.'
    }

    if (!/^\d{3,4}$/.test(formData.cvv)) {
      nextErrors.cvv = 'CVV must be 3 or 4 digits.'
    }

    if (!/^\d{4}$/.test(formData.pin)) {
      nextErrors.pin = 'PIN must be 4 digits.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const startRedirectCountdown = () => {
    setRedirectCountdown(4)
    intervalRef.current = window.setInterval(() => {
      setRedirectCountdown((current) => {
        if (current <= 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return 0
        }
        return current - 1
      })
    }, 1000)

    timeoutRef.current = window.setTimeout(() => {
      navigate('/student', { replace: true })
    }, 4000)
  }

  const handlePayNow = async (event) => {
    event.preventDefault()

    if (!room) {
      toast.error('Please select a room before making payment.')
      return
    }

    if (!room.is_available) {
      toast.error('This room option is currently unavailable.')
      return
    }

    if (!validateForm()) {
      return
    }

    setProcessing(true)

    try {
      const response = await studentBookingService.checkout({
        showcaseRoomId: room.id,
        amount: payableAmount,
        cardLast4: cardDigits.slice(-4),
        cardBrand,
      })

      clearBookingIntent()
      setSuccessPayload(response)
      setShowSuccessModal(true)
      toast.success(response.message || 'Payment recorded. Your booking request is pending admin approval.')
      startRedirectCountdown()
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to process payment right now.')
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-cyan-700 to-emerald-500 p-6 text-white shadow-xl lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Student Checkout</p>
            <h1 className="mt-3 text-3xl font-bold lg:text-4xl">Secure Room Booking Payment</h1>
            <p className="mt-3 text-sm text-white/85 lg:text-base">
              Complete your payment to submit a room booking request for admin approval.
            </p>
          </div>

          <Link
            to="/rooms"
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Rooms
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <Card title="Selected Room" subtitle="This room request will stay pending until an admin approves it" className="border-0 shadow-md">
          {loadingRoom ? (
            <div className="space-y-4">
              <div className="h-52 rounded-2xl bg-gray-200 dark:bg-slate-700" />
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-64 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          ) : roomError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
              {roomError}
            </div>
          ) : room ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-700">
                <img
                  src={room.image}
                  alt={room.title}
                  onError={handleRoomImageError}
                  className="h-56 w-full object-cover"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{room.title}</h3>
                <Badge variant={room.is_available ? 'success' : 'danger'}>
                  {room.availability_status || (room.is_available ? 'Available' : 'Unavailable')}
                </Badge>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">{room.capacity}</p>
              <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{room.description}</p>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900/30 dark:bg-cyan-950/20">
                <p className="text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Payable Amount</p>
                <p className="mt-2 text-3xl font-bold text-cyan-900 dark:text-cyan-100">
                  {formatCurrency(payableAmount)}
                </p>
                <p className="mt-1 text-xs text-cyan-700/80 dark:text-cyan-300/80">
                  First payment is recorded immediately and reviewed with your booking request.
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card title="Card Payment" subtitle="Use your card credentials to submit this booking request" className="border-0 shadow-md">
          <form className="space-y-4" onSubmit={handlePayNow}>
            <Input
              label="Cardholder Name"
              name="cardholderName"
              placeholder="Name on card"
              value={formData.cardholderName}
              onChange={(event) => handleFieldChange('cardholderName', event.target.value)}
              error={errors.cardholderName}
              icon={<ShieldCheck className="h-5 w-5 text-gray-400" />}
            />

            <Input
              label="Card Number"
              name="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={formData.cardNumber}
              onChange={(event) => handleFieldChange('cardNumber', formatCardNumber(event.target.value))}
              error={errors.cardNumber}
              icon={<CreditCard className="h-5 w-5 text-gray-400" />}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Input
                label="Expiry"
                name="expiry"
                placeholder="MM/YY"
                value={formData.expiry}
                onChange={(event) => handleFieldChange('expiry', formatExpiry(event.target.value))}
                error={errors.expiry}
              />
              <Input
                label="CVV"
                name="cvv"
                type="password"
                placeholder="123"
                value={formData.cvv}
                onChange={(event) => handleFieldChange('cvv', getDigitsOnly(event.target.value).slice(0, 4))}
                error={errors.cvv}
              />
              <Input
                label="PIN"
                name="pin"
                type="password"
                placeholder="4-digit"
                value={formData.pin}
                onChange={(event) => handleFieldChange('pin', getDigitsOnly(event.target.value).slice(0, 4))}
                error={errors.pin}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Detected card type</p>
                <Badge variant="info">{cardBrand}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                Encrypted mock checkout for frontend payment flow testing
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={processing}
              disabled={loadingRoom || !room || !room.is_available}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Pay {formatCurrency(payableAmount)} & Submit Request
            </Button>
          </form>
        </Card>
      </div>

      {showSuccessModal && successPayload ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-emerald-400/30 bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <BadgeCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-300">Booking Complete</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Request Submitted</h3>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 p-4 dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Requested Room</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {successPayload.room?.requested?.title || 'Selected room'}{' '}
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  ({successPayload.bookingStatus || 'Pending'})
                </span>
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Payment recorded: {formatCurrency(successPayload.payment?.amount)} - {successPayload.paymentMethod || 'Card payment'}
              </p>
            </div>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Redirecting to your dashboard in {redirectCountdown} second{redirectCountdown === 1 ? '' : 's'}.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => navigate('/student', { replace: true })}
              >
                Open Dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/rooms', { replace: true })}
              >
                Browse Rooms
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default StudentRoomPayment
