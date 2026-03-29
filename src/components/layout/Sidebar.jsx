import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  Building2,
  ClipboardList,
  CreditCard,
  Receipt,
  Utensils,
  Wrench,
  CalendarDays,
  X,
  Home
} from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

const adminNavItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/admin/students', label: 'Students', icon: Users },
  { path: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
  { path: '/admin/blocks', label: 'Hostel Blocks', icon: Building2 },
  { path: '/admin/visitors', label: 'Visitors', icon: ClipboardList },
  { path: '/admin/payments', label: 'Payments', icon: CreditCard },
  { path: '/admin/fees', label: 'Fee Structure', icon: Receipt },
  { path: '/admin/mess', label: 'Mess Menu', icon: Utensils },
  { path: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/admin/leaves', label: 'Leave Requests', icon: CalendarDays },
]

const studentNavItems = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { path: '/student/rooms', label: 'Rooms', icon: DoorOpen },
  { path: '/student/blocks', label: 'Blocks', icon: Building2 },
  { path: '/student/payments', label: 'Payments', icon: CreditCard },
  { path: '/student/fees', label: 'Fees', icon: Receipt },
  { path: '/student/mess', label: 'Mess Menu', icon: Utensils },
  { path: '/student/leaves', label: 'Leave History', icon: CalendarDays },
]

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth()
  const navItems = user?.role === 'Student' ? studentNavItems : adminNavItems

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-primary dark:bg-slate-900 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold text-white">HostelMS</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-64px)]">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-primary dark:bg-blue-500 dark:text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
