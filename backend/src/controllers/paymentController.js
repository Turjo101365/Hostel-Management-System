const sql = require("mssql");

// Note: getPool will be injected from the main server module
let getPoolFunction = null;

exports.setGetPool = (func) => {
  getPoolFunction = func;
};

// Get all pending payment requests (for admin)
exports.getPaymentRequests = async (req, res) => {
  try {
    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();
    const result = await pool
      .request()
      .query(`
        SELECT 
          p.Payment_id as payment_id,
          p.Booking_Transaction_id as booking_id,
          p.Student_id as student_id,
          s.Name as student_name,
          s.Email as student_email,
          p.Amount as amount,
          p.Month as month,
          p.Payment_Date as payment_date,
          p.PaymentStatus as payment_status,
          p.CreatedAt as created_at,
          u.fullName as verified_by_name,
          p.VerifiedAt as verified_at
        FROM dbo.Payment p
        INNER JOIN dbo.Students s ON p.Student_id = s.Student_id
        LEFT JOIN dbo.Users u ON p.VerifiedBy = u.id
        ORDER BY p.CreatedAt DESC
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching payment requests:", error);
    res.status(500).json({ message: "Failed to fetch payment requests" });
  }
};

// Verify payment (admin action)
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    // Get the payment record
    const paymentResponse = await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .query(
        `SELECT * FROM dbo.Payment WHERE Payment_id = @paymentId`
      );

    if (paymentResponse.recordset.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Update payment status to Verified
    await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .input("adminId", sql.Int, adminId)
      .input("verifiedAt", sql.DateTime, new Date())
      .query(`
        UPDATE dbo.Payment
        SET PaymentStatus = 'Verified', VerifiedBy = @adminId, VerifiedAt = @verifiedAt
        WHERE Payment_id = @paymentId
      `);

    // Return updated payment record
    const updatedPayment = await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .query(
        `SELECT * FROM dbo.Payment WHERE Payment_id = @paymentId`
      );

    res.json({
      message: "Payment verified successfully",
      payment: updatedPayment.recordset[0],
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

// Reject payment (admin action)
exports.rejectPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    // Update payment status to Rejected
    await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .input("status", sql.NVarChar, "Rejected")
      .query(`
        UPDATE dbo.Payment
        SET PaymentStatus = @status
        WHERE Payment_id = @paymentId
      `);

    res.json({ message: "Payment rejected successfully" });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    res.status(500).json({ message: "Failed to reject payment" });
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    const result = await pool
      .request()
      .input("paymentId", sql.Int, paymentId)
      .query(`
        SELECT 
          p.*,
          s.Name as student_name,
          s.Email as student_email
        FROM dbo.Payment p
        INNER JOIN dbo.Students s ON p.Student_id = s.Student_id
        WHERE p.Payment_id = @paymentId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ message: "Failed to fetch payment" });
  }
};
