// Mock data for the Hostel Management System

export const mockStudents = [
  { id: 1, student_id: 'STU001', name: 'John Smith', room_id: 101, guardian_contact: '+1-555-0101', status: 'Active', email: 'john.smith@hostel.edu' },
  { id: 2, student_id: 'STU002', name: 'Sarah Johnson', room_id: 102, guardian_contact: '+1-555-0102', status: 'Active', email: 'sarah.j@hostel.edu' },
  { id: 3, student_id: 'STU003', name: 'Michael Brown', room_id: 103, guardian_contact: '+1-555-0103', status: 'Active', email: 'm.brown@hostel.edu' },
  { id: 4, student_id: 'STU004', name: 'Emily Davis', room_id: 201, guardian_contact: '+1-555-0104', status: 'Active', email: 'emily.d@hostel.edu' },
  { id: 5, student_id: 'STU005', name: 'David Wilson', room_id: 202, guardian_contact: '+1-555-0105', status: 'Active', email: 'd.wilson@hostel.edu' },
  { id: 6, student_id: 'STU006', name: 'Jessica Taylor', room_id: 203, guardian_contact: '+1-555-0106', status: 'Active', email: 'j.taylor@hostel.edu' },
  { id: 7, student_id: 'STU007', name: 'James Anderson', room_id: 301, guardian_contact: '+1-555-0107', status: 'Active', email: 'j.anderson@hostel.edu' },
  { id: 8, student_id: 'STU008', name: 'Ashley Thomas', room_id: 302, guardian_contact: '+1-555-0108', status: 'Inactive', email: 'a.thomas@hostel.edu' },
]

export const mockRooms = [
  { id: 1, room_id: 'R001', room_number: 101, capacity: 4, current_occupancy: 3, type: 'AC', hostel_block: 'Block A', status: 'Partial' },
  { id: 2, room_id: 'R002', room_number: 102, capacity: 4, current_occupancy: 4, type: 'AC', hostel_block: 'Block A', status: 'Full' },
  { id: 3, room_id: 'R003', room_number: 103, capacity: 4, current_occupancy: 2, type: 'Non-AC', hostel_block: 'Block A', status: 'Partial' },
  { id: 4, room_id: 'R004', room_number: 201, capacity: 3, current_occupancy: 3, type: 'AC', hostel_block: 'Block B', status: 'Full' },
  { id: 5, room_id: 'R005', room_number: 202, capacity: 3, current_occupancy: 1, type: 'Non-AC', hostel_block: 'Block B', status: 'Available' },
  { id: 6, room_id: 'R006', room_number: 203, capacity: 3, current_occupancy: 3, type: 'AC', hostel_block: 'Block B', status: 'Full' },
  { id: 7, room_id: 'R007', room_number: 301, capacity: 2, current_occupancy: 1, type: 'AC', hostel_block: 'Block C', status: 'Partial' },
  { id: 8, room_id: 'R008', room_number: 302, capacity: 2, current_occupancy: 0, type: 'Non-AC', hostel_block: 'Block C', status: 'Available' },
]

export const mockBlocks = [
  { id: 1, block_id: 'B001', block_name: 'Block A', total_rooms: 20 },
  { id: 2, block_id: 'B002', block_name: 'Block B', total_rooms: 25 },
  { id: 3, block_id: 'B003', block_name: 'Block C', total_rooms: 15 },
]

export const mockVisitors = [
  { id: 1, visitor_id: 'V001', student_id: 'STU001', visitor_name: 'Mark Smith', entry_time: '2024-01-15 10:30', exit_time: '2024-01-15 14:30', purpose: 'Family Visit' },
  { id: 2, visitor_id: 'V002', student_id: 'STU002', visitor_name: 'Anna Johnson', entry_time: '2024-01-15 09:00', exit_time: '2024-01-15 17:00', purpose: 'Guardian Visit' },
  { id: 3, visitor_id: 'V003', student_id: 'STU003', visitor_name: 'Tom Brown', entry_time: '2024-01-14 11:00', exit_time: '2024-01-14 13:00', purpose: 'Personal' },
  { id: 4, visitor_id: 'V004', student_id: 'STU004', visitor_name: 'Rachel Davis', entry_time: '2024-01-16 15:00', exit_time: null, purpose: 'Family Visit' },
]

export const mockPayments = [
  { id: 1, payment_id: 'PAY001', student_id: 'STU001', student_name: 'John Smith', amount: 500, payment_date: '2024-01-01', month: 'January 2024', status: 'Paid' },
  { id: 2, payment_id: 'PAY002', student_id: 'STU002', student_name: 'Sarah Johnson', amount: 500, payment_date: '2024-01-02', month: 'January 2024', status: 'Paid' },
  { id: 3, payment_id: 'PAY003', student_id: 'STU003', student_name: 'Michael Brown', amount: 500, payment_date: '2024-01-03', month: 'January 2024', status: 'Paid' },
  { id: 4, payment_id: 'PAY004', student_id: 'STU004', student_name: 'Emily Davis', amount: 450, payment_date: '2024-01-05', month: 'January 2024', status: 'Paid' },
  { id: 5, payment_id: 'PAY005', student_id: 'STU005', student_name: 'David Wilson', amount: 500, payment_date: null, month: 'January 2024', status: 'Pending' },
]

export const mockFees = [
  { id: 1, fee_id: 'FEE001', type: 'Hostel Fee', amount: 500 },
  { id: 2, fee_id: 'FEE002', type: 'Mess Fee', amount: 200 },
  { id: 3, fee_id: 'FEE003', type: 'Security Deposit', amount: 100 },
  { id: 4, fee_id: 'FEE004', type: 'Maintenance Charge', amount: 50 },
]

export const mockMessMenu = [
  { id: 1, day: 'Monday', breakfast: 'Poha, Tea, Toast', lunch: 'Rice, Dal, Paneer, Salad', dinner: 'Roti, Sabzi, Dal' },
  { id: 2, day: 'Tuesday', breakfast: 'Idli, Sambar, Tea', lunch: 'Rice, Dal Makhani, Chapati', dinner: 'Biryani, Raita' },
  { id: 3, day: 'Wednesday', breakfast: 'Paratha, Curd, Tea', lunch: 'Rice, Dal, Mix Veg, Papad', dinner: 'Roti, Paneer, Salad' },
  { id: 4, day: 'Thursday', breakfast: 'Dosa, Chutney, Tea', lunch: 'Rice, Sambar, Fish Fry', dinner: 'Chapati, Pulao, Dal' },
  { id: 5, day: 'Friday', breakfast: 'Puri, Sabzi, Tea', lunch: 'Rice, Dal, Kofta, Pickle', dinner: 'Roti, Chicken, Salad' },
  { id: 6, day: 'Saturday', breakfast: 'Upma, Tea, Banana', lunch: 'Rice, Dal, Egg Curry, Chapati', dinner: 'Pizza, Pasta, Cold Drink' },
  { id: 7, day: 'Sunday', breakfast: 'Bread, Omelette, Tea', lunch: 'Biryani, Chicken, Curd', dinner: 'Puri, Paneer, Sweet' },
]

export const mockMaintenanceRequests = [
  { id: 1, request_id: 'M001', room_id: 101, room_number: '101', issue_type: 'Electrical', description: 'Fan not working', date_reported: '2024-01-10', status: 'Pending' },
  { id: 2, request_id: 'M002', room_id: 102, room_number: '102', issue_type: 'Plumbing', description: 'Tap leakage', date_reported: '2024-01-12', status: 'In Progress' },
  { id: 3, request_id: 'M003', room_id: 201, room_number: '201', issue_type: 'Furniture', description: 'Bed repair needed', date_reported: '2024-01-08', status: 'Completed' },
  { id: 4, request_id: 'M004', room_id: 202, room_number: '202', issue_type: 'Electrical', description: 'Light not working', date_reported: '2024-01-14', status: 'Pending' },
]

export const mockLeaveRequests = [
  { id: 1, leave_id: 'L001', student_id: 'STU001', student_name: 'John Smith', from_date: '2024-01-20', to_date: '2024-01-25', reason: 'Family emergency', status: 'Approved' },
  { id: 2, leave_id: 'L002', student_id: 'STU002', student_name: 'Sarah Johnson', from_date: '2024-01-22', to_date: '2024-01-24', reason: 'Personal work', status: 'Pending' },
  { id: 3, leave_id: 'L003', student_id: 'STU003', student_name: 'Michael Brown', from_date: '2024-01-18', to_date: '2024-01-19', reason: 'Medical checkup', status: 'Rejected' },
  { id: 4, leave_id: 'L004', student_id: 'STU004', student_name: 'Emily Davis', from_date: '2024-01-28', to_date: '2024-01-30', reason: 'Festival celebration', status: 'Pending' },
]

export const dashboardStats = {
  totalStudents: 8,
  totalRooms: 8,
  occupiedRooms: 6,
  availableRooms: 2,
  pendingMaintenance: 2,
  totalPayments: 2500,
  monthlyCollection: 2450
}
