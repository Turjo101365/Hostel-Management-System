const express = require("express");
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Get all payment requests (admin only)
router.get("/", authMiddleware, paymentController.getPaymentRequests);

// Get payment by ID
router.get("/:paymentId", authMiddleware, paymentController.getPaymentById);

// Verify payment (admin action)
router.put("/:paymentId/verify", authMiddleware, paymentController.verifyPayment);

// Reject payment (admin action)
router.put("/:paymentId/reject", authMiddleware, paymentController.rejectPayment);

module.exports = router;
