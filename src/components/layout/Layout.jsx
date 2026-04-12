import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import AnimatedBackdrop from './AnimatedBackdrop'

const pageTitles = {
  '/admin': 'Admin Dashboard',
  '/admin/students': 'Student Directory',
  '/admin/rooms': 'Room Directory',
  '/admin/blocks': 'Hostel Blocks',
  '/admin/bookings': 'Booking Transactions',
  '/admin/payments': 'Payment Ledger',
  '/admin/fees': 'Fee Structure',
  '/admin/mess': 'Mess Menu',
  '/admin/maintenance': 'Maintenance Tracker',
  '/admin/leaves': 'Leave Requests',
  '/admin/profile': 'Profile Settings',
  '/student': 'Student Dashboard',
  '/student/payment': 'Room Payment',
  '/student/profile': 'Profile Settings',
}

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const isStudent = user?.role === 'Student'
  const title = pageTitles[location.pathname] || 'Hostel Management System'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 dark:bg-slate-900">
      <AnimatedBackdrop variant={isStudent ? 'auth' : 'admin'} />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="relative z-10 flex min-h-screen flex-col lg:pl-64">
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <Footer variant={isStudent ? 'student' : 'admin'} />
      </div>
    </div>
  )
}

export default Layout
