const sql = require("mssql");

// Note: getPool will be injected from the main server module
let getPoolFunction = null;

exports.setGetPool = (func) => {
  getPoolFunction = func;
};

// Book a room - creates both booking AND payment requests
exports.bookRoom = async (req, res) => {
  try {
    const { studentId, showcaseRoomId, amount, cardBrand, cardLast4, month } = req.body;

    if (!studentId || !showcaseRoomId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Create booking request (Status: Pending)
      const bookingResult = await transaction
        .request()
        .input("studentId", sql.Int, studentId)
        .input("showcaseRoomId", sql.Int, showcaseRoomId)
        .input("amount", sql.Int, amount)
        .input("cardBrand", sql.NVarChar, cardBrand || null)
        .input("cardLast4", sql.NVarChar, cardLast4 || null)
        .input("status", sql.NVarChar, "Pending")
        .query(`
          INSERT INTO dbo.Student_Room_Booking (
            Student_id,
            Showcase_Room_id,
            Amount,
            Card_Brand,
            Card_Last4,
            Status
          )
          VALUES (
            @studentId,
            @showcaseRoomId,
            @amount,
            @cardBrand,
            @cardLast4,
            @status
          );
          SELECT SCOPE_IDENTITY() AS Booking_Transaction_id;
        `);

      const bookingId = bookingResult.recordset[0].Booking_Transaction_id;

      // Create payment request (Status: Pending - waiting for admin verification)
      const paymentDate = new Date().toISOString().split("T")[0];
      const paymentResult = await transaction
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("studentId", sql.Int, studentId)
        .input("amount", sql.Int, amount)
        .input("paymentDate", sql.DateTime, paymentDate)
        .input("month", sql.NVarChar, month || "NA")
        .input("paymentStatus", sql.NVarChar, "Pending")
        .query(`
          INSERT INTO dbo.Payment (
            Booking_Transaction_id,
            Student_id,
            Amount,
            Payment_Date,
            Month,
            PaymentStatus
          )
          VALUES (
            @bookingId,
            @studentId,
            @amount,
            @paymentDate,
            @month,
            @paymentStatus
          );
          SELECT SCOPE_IDENTITY() AS Payment_id;
        `);

      const paymentId = paymentResult.recordset[0].Payment_id;

      // Update booking with payment ID
      await transaction
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("paymentId", sql.Int, paymentId)
        .query(`
          UPDATE dbo.Student_Room_Booking
          SET Payment_id = @paymentId
          WHERE Booking_Transaction_id = @bookingId
        `);

      await transaction.commit();

      res.status(201).json({
        message: "Room booking and payment request created successfully",
        booking_id: bookingId,
        payment_id: paymentId,
        status: "pending_approval"
      });
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    console.error("Error creating room booking:", error);
    res.status(500).json({ message: "Failed to create room booking" });
  }
};

// Get all room bookings (for student or admin)
exports.getRoomBookings = async (req, res) => {
  try {
    const { studentId } = req.query;

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();
    let query = `
      SELECT 
        b.Booking_Transaction_id as booking_id,
        b.Student_id as student_id,
        s.Name as student_name,
        b.Showcase_Room_id as showcase_room_id,
        r.Room_Name as room_name,
        b.Amount as amount,
        b.Status as booking_status,
        p.Payment_id as payment_id,
        p.PaymentStatus as payment_status,
        b.Booked_At as booked_at
      FROM dbo.Student_Room_Booking b
      INNER JOIN dbo.Students s ON b.Student_id = s.Student_id
      INNER JOIN dbo.Public_Room_Showcase r ON b.Showcase_Room_id = r.Showcase_Room_id
      LEFT JOIN dbo.Payment p ON b.Payment_id = p.Payment_id
    `;

    if (studentId) {
      query += `WHERE b.Student_id = @studentId`;
    }

    query += `ORDER BY b.Booked_At DESC`;

    const request = pool.request();
    if (studentId) {
      request.input("studentId", sql.Int, studentId);
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching room bookings:", error);
    res.status(500).json({ message: "Failed to fetch room bookings" });
  }
};

// Get room booking by ID
exports.getRoomBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    const result = await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query(`
        SELECT 
          b.*,
          s.Name as student_name,
          r.Room_Name as room_name,
          p.Payment_id as payment_id,
          p.PaymentStatus as payment_status
        FROM dbo.Student_Room_Booking b
        INNER JOIN dbo.Students s ON b.Student_id = s.Student_id
        INNER JOIN dbo.Public_Room_Showcase r ON b.Showcase_Room_id = r.Showcase_Room_id
        LEFT JOIN dbo.Payment p ON b.Payment_id = p.Payment_id
        WHERE b.Booking_Transaction_id = @bookingId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching room booking:", error);
    res.status(500).json({ message: "Failed to fetch room booking" });
  }
};

// Approve room booking (admin action)
exports.approveBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    // Check if payment is verified
    const booking = await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query(`
        SELECT b.*, p.PaymentStatus FROM dbo.Student_Room_Booking b
        LEFT JOIN dbo.Payment p ON b.Payment_id = p.Payment_id
        WHERE b.Booking_Transaction_id = @bookingId
      `);

    if (booking.recordset.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update booking status to Approved
    await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query(`
        UPDATE dbo.Student_Room_Booking
        SET Status = 'Approved'
        WHERE Booking_Transaction_id = @bookingId
      `);

    res.json({ message: "Booking approved successfully" });
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({ message: "Failed to approve booking" });
  }
};

// Reject room booking (admin action)
exports.rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!getPoolFunction) {
      return res.status(500).json({ message: "Database connection not initialized" });
    }

    const pool = await getPoolFunction();

    // Update booking status to Rejected
    await pool
      .request()
      .input("bookingId", sql.Int, bookingId)
      .query(`
        UPDATE dbo.Student_Room_Booking
        SET Status = 'Rejected'
        WHERE Booking_Transaction_id = @bookingId
      `);

    res.json({ message: "Booking rejected successfully" });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ message: "Failed to reject booking" });
  }
};
