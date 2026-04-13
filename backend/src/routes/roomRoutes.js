const express = require("express");
const roomController = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Book a room (creates both booking and payment requests)
router.post("/book", authMiddleware, roomController.bookRoom);

// Get all room bookings (with optional student filter)
router.get("/bookings", authMiddleware, roomController.getRoomBookings);

// Get room booking by ID
router.get("/bookings/:bookingId", authMiddleware, roomController.getRoomBookingById);

// Approve room booking (admin only)
router.put("/bookings/:bookingId/approve", authMiddleware, roomController.approveBooking);

// Reject room booking (admin only)
router.put("/bookings/:bookingId/reject", authMiddleware, roomController.rejectBooking);

module.exports = router;
