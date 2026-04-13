import { useEffect, useState } from 'react'
import { Mail, Phone, Save, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Input from '../components/common/Input'
import { getApiErrorMessage } from '../services/api'
import { formatDateTime, validatePhone } from '../utils/helpers'

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth()
  const isStudent = user?.role === 'Student'
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    guardianContact: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      phoneNumber: user?.phoneNumber || '',
      guardianContact: user?.guardianContact || '',
    })
  }, [user])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: '',
      }))
    }
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (formData.phoneNumber.trim() && !validatePhone(formData.phoneNumber.trim())) {
      nextErrors.phoneNumber = 'Please enter a valid phone number.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      await updateProfile({
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        guardianContact: formData.guardianContact.trim(),
      })
      toast.success('Profile updated successfully.')
    } catch (error) {
      const message = getApiErrorMessage(error, 'Unable to update profile right now.')
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {isStudent
            ? 'Update the student account details stored in the Students table.'
            : 'Update the admin name and phone number stored in the Users table.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-0 shadow-md">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label={isStudent ? 'Student Name' : 'Admin Name'}
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder={isStudent ? 'Enter student name' : 'Enter admin name'}
              icon={<User className="h-5 w-5 text-gray-400" />}
            />

            <Input
              label="Phone Number"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              error={errors.phoneNumber}
              placeholder="Enter phone number"
              icon={<Phone className="h-5 w-5 text-gray-400" />}
            />

            {isStudent ? (
              <Input
                label="Guardian Contact"
                name="guardianContact"
                value={formData.guardianContact}
                onChange={handleChange}
                error={errors.guardianContact}
                placeholder="Enter guardian phone number"
                icon={<ShieldCheck className="h-5 w-5 text-gray-400" />}
              />
            ) : null}

            <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-slate-700">
              <Button type="submit" loading={saving}>
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title={isStudent ? 'Student Details' : 'Admin Details'}
          subtitle="Current account information"
          className="border-0 shadow-md"
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/30">
              <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">Email</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-sky-950 dark:text-sky-100">
                <Mail className="h-4 w-4" />
                {user?.email || '-'}
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Saved Name</p>
              <p className="mt-2 text-lg font-semibold text-emerald-950 dark:text-emerald-100">
                {user?.name || (isStudent ? 'Student' : 'Administrator')}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Saved Phone</p>
              <p className="mt-2 text-lg font-semibold text-amber-950 dark:text-amber-100">
                {user?.phoneNumber || 'Not added yet'}
              </p>
            </div>

            {isStudent ? (
              <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/30">
                <p className="text-xs uppercase tracking-wide text-violet-700 dark:text-violet-300">Guardian Contact</p>
                <p className="mt-2 text-lg font-semibold text-violet-950 dark:text-violet-100">
                  {user?.guardianContact || 'Not added yet'}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-700/50">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Last Login</p>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {user?.lastLogin ? formatDateTime(user.lastLogin) : 'Not available'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default ProfileSettings
