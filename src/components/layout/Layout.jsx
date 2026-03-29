import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import Footer from './Footer'
import AnimatedBackdrop from './AnimatedBackdrop'
import { useAuth } from '../../auth/AuthContext'

const adminPageTitles = {
  '/admin': 'Admin Dashboard',
  '/admin/students': 'Student Directory',
  '/admin/rooms': 'Room Directory',
  '/admin/blocks': 'Hostel Blocks',
  '/admin/visitors': 'Visitor Log',
  '/admin/payments': 'Payment Ledger',
  '/admin/fees': 'Fee Structure',
  '/admin/mess': 'Mess Menu',
  '/admin/maintenance': 'Maintenance Tracker',
  '/admin/leaves': 'Leave Requests',
  '/admin/profile': 'Profile Settings',
}

const studentPageTitles = {
  '/student': 'Student Dashboard',
  '/student/rooms': 'Available Rooms',
  '/student/blocks': 'Hostel Blocks',
  '/student/payments': 'My Payments',
  '/student/fees': 'Fee Structure',
  '/student/mess': 'Mess Menu',
  '/student/leaves': 'My Leave History',
  '/student/profile': 'Student Profile',
}

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const pageTitles = user?.role === 'Student' ? studentPageTitles : adminPageTitles
  const title = pageTitles[location.pathname] || 'Hostel Management System'
  const footerVariant = user?.role === 'Student' ? 'student' : 'admin'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gray-50 dark:bg-slate-900">
      <AnimatedBackdrop variant="admin" />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="relative z-10 flex min-h-screen flex-col lg:pl-64">
        <Navbar 
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
        />
        
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <Footer variant={footerVariant} />
      </div>
    </div>
  )
}

export default Layout
