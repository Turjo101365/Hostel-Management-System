# Hostel Management System
1. Folder Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── Table.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Badge.jsx
│   │   ├── Loader.jsx
│   │   ├── Toast.jsx
│   │   └── Pagination.jsx
│   ├── layout/
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   └── Layout.jsx
│   └── charts/
│       └── StatsChart.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Students.jsx
│   ├── Rooms.jsx
│   ├── Blocks.jsx
│   ├── Wardens.jsx
│   ├── Visitors.jsx
│   ├── Payments.jsx
│   ├── FeeStructure.jsx
│   ├── MessMenu.jsx
│   ├── Maintenance.jsx
│   └── LeaveRequests.jsx
├── services/
│   ├── api.js
│   └── studentService.js
│   ├── roomService.js
│   ├── blockService.js
│   ├── wardenService.js
│   ├── visitorService.js
│   ├── paymentService.js
│   ├── feeService.js
│   ├── messService.js
│   ├── maintenanceService.js
│   └── leaveService.js
├── contexts/
│   └── AuthContext.jsx
├── hooks/
│   ├── useAuth.js
│   └── useFetch.js
├── utils/
│   └── helpers.js
├── App.jsx
├── main.jsx
└── index.css
```

## 2. UI/UX Specification

### Color Palette

**Light Mode:**
- Primary: `#1E3A5F` (Deep Navy Blue)
- Primary Light: `#2D5A8A`
- Secondary: `#F59E0B` (Amber/Gold)
- Accent: `#10B981` (Emerald Green)
- Background: `#F8FAFC` (Light Gray)
- Surface: `#FFFFFF` (White)
- Text Primary: `#1E293B` (Slate 800)
- Text Secondary: `#64748B` (Slate 500)
- Border: `#E2E8F0` (Slate 200)
- Error: `#EF4444` (Red)
- Warning: `#F59E0B` (Amber)
- Success: `#10B981` (Green)

**Dark Mode:**
- Primary: `#3B82F6` (Blue)
- Background: `#0F172A` (Slate 900)
- Surface: `#1E293B` (Slate 800)
- Text Primary: `#F1F5F9` (Slate 100)
- Text Secondary: `#94A3B8` (Slate 400)

### 3.Typography

- **Font Family**: `'Inter', sans-serif` (Primary), `'Poppins', sans-serif` (Headings)
- **Headings**: 
  - H1: 32px, font-weight: 700
  - H2: 24px, font-weight: 600
  - H3: 20px, font-weight: 600
  - H4: 16px, font-weight: 600
- **Body**: 14px, font-weight: 400
- **Small**: 12px, font-weight: 400

###   4. Layout Structure

- **Sidebar**: Fixed left, 260px width (desktop), collapsible on mobile
- **Navbar**: Fixed top, 64px height
- **Content Area**: Fluid, padding 24px
- **Responsive Breakpoints**:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

### Spacing System

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Components Specification

**1. Sidebar Navigation**
- Logo at top with app name
- Navigation items with icons
- Active state: Primary color background with white text
- Hover state: Light primary background
- Collapsible on mobile with hamburger menu

**2. Navbar**
- Search bar (optional)
- Dark mode toggle
- User profile dropdown
- Mobile menu toggle

**3. Dashboard Cards**
- White background with subtle shadow
- Icon in colored circle
- Title (small, uppercase)
- Value (large, bold)
- Optional trend indicator

**4. Data Tables**
- Striped rows
- Hover effect
- Sortable columns
- Pagination at bottom
- Action buttons (Edit, Delete, View)

**5. Forms**
- Label above input
- Input with border
- Focus state: Primary color border
- Error state: Red border with error message
- Submit button at bottom

**6. Modal Dialogs**
- Centered overlay
- White background
- Close button at top right
- Action buttons at bottom

**7. Status Badges**
- Rounded pills
- Color coded:
  - Active/Approved: Green
  - Pending: Amber
  - Inactive/Rejected: Red
  - Info: Blue

## 5. Pages Specification

### 5.1 Dashboard
- **Stats Cards**: Total Students, Total Rooms, Occupied Rooms, Pending Requests
- **Recent Payments Table**: Last 5 payments
- **Quick Actions**: Add Student, Add Room, View Requests
- **Charts**: Room occupancy pie chart

### 5.2 Student Management
- **List View**: Table with all students
- **Search**: By name, student ID
- **Filters**: By room, status
- **Actions**: Add, Edit, Delete, Assign Room
- **Fields**: Student ID, Name, Room ID, Guardian Contact, Status
- **Modal Form**: Add/Edit student with validation

### 5.3 Room Management
- **List View**: All rooms with details
- **Filters**: By block, by type, by availability
- **Actions**: Add, Edit, Delete
- **Fields**: Room ID, Room Number, Capacity, Current Occupancy, Type, Hostel Block
- **Status Indicators**: Available (green), Full (red), Partial (amber)

### 5.4 Hostel Block Management
- **List View**: All blocks
- **Actions**: Add, Edit, Delete
- **Fields**: Block ID, Block Name, Total Rooms, Warden ID

### 5.5 Warden Management
- **List View**: All wardens
- **Actions**: Add, Edit, Delete
- **Fields**: Warden ID, Name, Contact, Block Assigned

### 5.6 Visitor Log
- **Check-in Form**: Visitor details, student visited, purpose
- **Check-out**: Record exit time
- **History Table**: All visitor records
- **Filters**: By date, by student

### 5.7 Payment Management
- **Record Payment Form**: Student, amount, month
- **Payment History**: All payments
- **Filters**: By month, by student
- **Fields**: Payment ID, Student ID, Amount, Payment Date, Month

### 5.8 Fee Structure
- **Fee Types List**: All fee types
- **Add/Edit Form**: Fee type, amount
- **Fields**: Fee ID, Type, Amount

### 5.9 Mess Menu
- **Weekly View**: Monday - Sunday
- **Meal Types**: Breakfast, Lunch, Dinner
- **Edit Mode**: Add/edit items per meal
- **Fields**: Menu ID, Day, Meal Type, Items

### 5.10 Maintenance Requests
- **Request Form**: Room, issue type, description
- **Request List**: All requests with status
- **Status Update**: Mark as In Progress, Completed
- **Filters**: By status, by room
- **Fields**: Request ID, Room ID, Issue Type, Date Reported, Status

### 5.11 Leave Request System
- **Apply Leave Form**: From date, To date, Reason
- **My Requests**: Student's own requests
- **All Requests**: Admin view with approve/reject
- **Fields**: Leave ID, Student ID, From Date, To Date, Reason, Status

## 6. API Endpoints (Assumed)

All endpoints assumed to exist at base URL: `http://localhost:5000/api`

```
Students:    /students, /students/:id
Rooms:       /rooms, /rooms/:id
Blocks:      /blocks, /blocks/:id
Wardens:     /wardens, /wardens/:id
Visitors:    /visitors, /visitors/:id
Payments:    /payments, /payments/:id
Fees:        /fees, /fees/:id
Mess:        /mess, /mess/:id
Maintenance: /maintenance, /maintenance/:id
Leaves:      /leaves, /leaves/:id
Dashboard:   /dashboard/stats
```

## 7. Functionality Specification

### Core Features
1. **CRUD Operations**: Create, Read, Update, Delete for all entities
2. **Navigation**: React Router with protected routes
3. **Data Fetching**: Axios with interceptors for auth
4. **Form Validation**: Client-side validation for all forms
5. **Loading States**: Skeleton loaders during data fetch
6. **Error Handling**: Toast notifications for errors
7. **Responsive Design**: Mobile-first approach
8. **Dark Mode**: Toggle between light/dark themes

### User Interactions
- Click sidebar items to navigate
- Click "Add" button to open create modal
- Click table row action buttons for edit/delete
- Click status badges to filter
- Submit forms with validation feedback
- Toggle dark mode from navbar

### Data Handling
- Mock data for demonstration
- LocalStorage for theme preference
- Context for auth state

## 8. Acceptance Criteria

1. ✅ Application builds without errors
2. ✅ All 11 pages are accessible via navigation
3. ✅ CRUD forms work with mock data
4. ✅ Tables display data with pagination
5. ✅ Dark mode toggle works
6. ✅ Responsive on mobile/tablet/desktop
7. ✅ Toast notifications appear for actions
8. ✅ Loading states show during data fetch
9. ✅ Forms validate input before submission
10. ✅ Navigation highlights active page

## 9. Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`
