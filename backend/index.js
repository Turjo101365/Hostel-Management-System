const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

const PORT = Number(process.env.PORT || 5000);
const JWT_SECRET = process.env.JWT_SECRET || "change-this-jwt-secret";
const RESET_CODE_TTL_MINUTES = Number(process.env.RESET_CODE_TTL_MINUTES || 15);
const CLIENT_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || CLIENT_ORIGINS.length === 0 || CLIENT_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  })
);
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 1433),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== "false",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const missingDatabaseConfigMessage =
  "Database configuration is missing. Set DB_USER, DB_PASS, DB_SERVER, and DB_NAME in backend/.env.";

let poolPromise = null;
let userColumnsEnsured = false;

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const hasDatabaseConfig = () =>
  Boolean(dbConfig.user && dbConfig.password && dbConfig.server && dbConfig.database);

const getPool = async () => {
  if (!hasDatabaseConfig()) {
    throw new Error(missingDatabaseConfigMessage);
  }

  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then((pool) => {
        console.log("Connected to MSSQL");
        return pool;
      })
      .catch((error) => {
        poolPromise = null;
        throw error;
      });
  }

  return poolPromise;
};

const ensureUserColumns = async () => {
  if (userColumnsEnsured) {
    return;
  }

  const pool = await getPool();

  await pool.request().query(`
    IF COL_LENGTH('Users', 'fullName') IS NULL
    BEGIN
      ALTER TABLE Users ADD fullName NVARCHAR(120) NULL;
    END;

    IF COL_LENGTH('Users', 'phoneNumber') IS NULL
    BEGIN
      ALTER TABLE Users ADD phoneNumber NVARCHAR(30) NULL;
    END;

    IF COL_LENGTH('Users', 'passwordResetCodeHash') IS NULL
    BEGIN
      ALTER TABLE Users ADD passwordResetCodeHash NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH('Users', 'passwordResetExpiresAt') IS NULL
    BEGIN
      ALTER TABLE Users ADD passwordResetExpiresAt DATETIME NULL;
    END;

    IF COL_LENGTH('Users', 'role') IS NULL
    BEGIN
      ALTER TABLE Users ADD role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'Admin';
    END;

    IF COL_LENGTH('Users', 'studentId') IS NULL
    BEGIN
      ALTER TABLE Users ADD studentId INT NULL;
    END;
  `);

  userColumnsEnsured = true;
};

const requestWithInputs = (pool, applyInputs) => {
  const request = pool.request();
  return applyInputs ? applyInputs(request) : request;
};

const executeQuery = async (query, applyInputs) => {
  const pool = await getPool();
  return requestWithInputs(pool, applyInputs).query(query);
};

const queryRows = async (query, applyInputs) => {
  const result = await executeQuery(query, applyInputs);
  return result.recordset;
};

const queryOne = async (query, applyInputs) => {
  const rows = await queryRows(query, applyInputs);
  return rows[0] || null;
};

const normalizeString = (value) => String(value || "").trim();

const normalizeNullableString = (value) => {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
};

const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseNonNegativeInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const parseOptionalInt = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const parseDateTimeValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateValue = (value) => {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNextId = async (tableName, columnName) => {
  const row = await queryOne(
    `SELECT ISNULL(MAX(${columnName}), 0) + 1 AS next_id FROM ${tableName}`
  );

  return Number(row?.next_id || 1);
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_ORDER_CASE = `
  CASE [Day]
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    WHEN 'Sunday' THEN 7
    ELSE 8
  END
`;

const MESS_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];
const MAINTENANCE_STATUSES = ["Pending", "In Progress", "Completed"];
const LEAVE_STATUSES = ["Pending", "Approved", "Rejected"];

const isAllowedValue = (value, allowedValues) => allowedValues.includes(value);

const studentSelectQuery = `
  SELECT
    s.Student_id AS id,
    s.Student_id AS student_id,
    s.Name AS name,
    s.Room_id AS room_id,
    r.Room_Number AS room_number,
    hb.Block_Name AS block_name,
    s.Guardian_Contact AS guardian_contact,
    'Active' AS status
  FROM Student s
  LEFT JOIN Room r ON r.Room_id = s.Room_id
  LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
`;

const roomSelectQuery = `
  SELECT
    r.Room_id AS id,
    r.Room_id AS room_id,
    r.Room_Number AS room_number,
    r.Capacity AS capacity,
    r.Current_Occupancy AS current_occupancy,
    r.Type AS type,
    r.Hostel_Block AS hostel_block_id,
    hb.Block_Name AS hostel_block,
    CASE
      WHEN r.Current_Occupancy >= r.Capacity THEN 'Full'
      WHEN r.Current_Occupancy = 0 THEN 'Available'
      ELSE 'Partial'
    END AS status
  FROM Room r
  LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
`;

const blockSelectQuery = `
  SELECT
    hb.Block_id AS id,
    hb.Block_id AS block_id,
    hb.Block_Name AS block_name,
    hb.Total_Rooms AS total_rooms
  FROM Hostel_Block hb
`;

const visitorSelectQuery = `
  SELECT
    v.Visitor_id AS id,
    v.Visitor_id AS visitor_id,
    v.Student_id AS student_id,
    s.Name AS student_name,
    v.Date_time_Entry AS entry_time,
    v.Date_time_Exit AS exit_time,
    v.Purpose AS purpose
  FROM Visitor v
  LEFT JOIN Student s ON s.Student_id = v.Student_id
`;

const paymentSelectQuery = `
  SELECT
    p.Payment_id AS id,
    p.Payment_id AS payment_id,
    p.Student_id AS student_id,
    s.Name AS student_name,
    p.Amount AS amount,
    p.Payment_Date AS payment_date,
    p.[Month] AS [month],
    'Paid' AS status
  FROM Payment p
  LEFT JOIN Student s ON s.Student_id = p.Student_id
`;

const feeSelectQuery = `
  SELECT
    f.Fee_id AS id,
    f.Fee_id AS fee_id,
    f.Type AS type,
    f.Amount AS amount
  FROM Fee_Structure f
`;

const messSelectQuery = `
  SELECT
    [Day] AS id,
    [Day] AS [day],
    MAX(CASE WHEN Meal_type = 'Breakfast' THEN Items END) AS breakfast,
    MAX(CASE WHEN Meal_type = 'Lunch' THEN Items END) AS lunch,
    MAX(CASE WHEN Meal_type = 'Dinner' THEN Items END) AS dinner
  FROM Mess_Menu
  GROUP BY [Day]
`;

const maintenanceSelectQuery = `
  SELECT
    m.Request_id AS id,
    m.Request_id AS request_id,
    m.Room_id AS room_id,
    r.Room_Number AS room_number,
    m.Issue_type AS issue_type,
    CONCAT(m.Issue_type, ' issue reported for room ', r.Room_Number) AS description,
    m.Date_Reported AS date_reported,
    m.Status AS status
  FROM Maintenance m
  LEFT JOIN Room r ON r.Room_id = m.Room_id
`;

const leaveSelectQuery = `
  SELECT
    l.leave_id AS id,
    l.leave_id AS leave_id,
    l.student_id AS student_id,
    s.Name AS student_name,
    l.from_date AS from_date,
    l.to_date AS to_date,
    l.reason AS reason,
    l.Status AS status
  FROM Leave_Request l
  LEFT JOIN Student s ON s.Student_id = l.student_id
`;

const getStudentById = (studentId) =>
  queryOne(`${studentSelectQuery} WHERE s.Student_id = @id`, (request) =>
    request.input("id", sql.Int, studentId)
  );

const getRoomById = (roomId) =>
  queryOne(`${roomSelectQuery} WHERE r.Room_id = @id`, (request) =>
    request.input("id", sql.Int, roomId)
  );

const getBlockById = (blockId) =>
  queryOne(`${blockSelectQuery} WHERE hb.Block_id = @id`, (request) =>
    request.input("id", sql.Int, blockId)
  );

const getVisitorById = (visitorId) =>
  queryOne(`${visitorSelectQuery} WHERE v.Visitor_id = @id`, (request) =>
    request.input("id", sql.Int, visitorId)
  );

const getPaymentById = (paymentId) =>
  queryOne(`${paymentSelectQuery} WHERE p.Payment_id = @id`, (request) =>
    request.input("id", sql.Int, paymentId)
  );

const getFeeById = (feeId) =>
  queryOne(`${feeSelectQuery} WHERE f.Fee_id = @id`, (request) =>
    request.input("id", sql.Int, feeId)
  );

const getMessDayById = (day) =>
  queryOne(`${messSelectQuery} HAVING [Day] = @day`, (request) =>
    request.input("day", sql.NVarChar(20), day)
  );

const getMaintenanceById = (requestId) =>
  queryOne(`${maintenanceSelectQuery} WHERE m.Request_id = @id`, (request) =>
    request.input("id", sql.Int, requestId)
  );

const getLeaveById = (leaveId) =>
  queryOne(`${leaveSelectQuery} WHERE l.leave_id = @id`, (request) =>
    request.input("id", sql.Int, leaveId)
  );

const getRoomAvailability = (roomId, excludedStudentId = null) => {
  const exclusionClause = excludedStudentId
    ? "AND s.Student_id <> @excludedStudentId"
    : "";

  return queryOne(
    `
      SELECT
        r.Room_id AS room_id,
        r.Capacity AS capacity,
        (
          SELECT COUNT(*)
          FROM Student s
          WHERE s.Room_id = r.Room_id ${exclusionClause}
        ) AS current_occupancy
      FROM Room r
      WHERE r.Room_id = @roomId
    `,
    (request) => {
      request.input("roomId", sql.Int, roomId);

      if (excludedStudentId) {
        request.input("excludedStudentId", sql.Int, excludedStudentId);
      }

      return request;
    }
  );
};

const getStudentCountForRoom = async (roomId) => {
  const row = await queryOne(
    "SELECT COUNT(*) AS total FROM Student WHERE Room_id = @roomId",
    (request) => request.input("roomId", sql.Int, roomId)
  );

  return Number(row?.total || 0);
};

const syncRoomOccupancy = async (roomIds = []) => {
  const uniqueRoomIds = [...new Set(roomIds.filter(Boolean))];

  for (const roomId of uniqueRoomIds) {
    await executeQuery(
      `
        UPDATE Room
        SET Current_Occupancy = (
          SELECT COUNT(*)
          FROM Student
          WHERE Room_id = @roomId
        )
        WHERE Room_id = @roomId
      `,
      (request) => request.input("roomId", sql.Int, roomId)
    );
  }
};

const replaceMessMealsForDay = async (day, meals) => {
  await executeQuery(
    "DELETE FROM Mess_Menu WHERE [Day] = @day",
    (request) => request.input("day", sql.NVarChar(20), day)
  );

  let nextMenuId = await getNextId("Mess_Menu", "Menu_Id");

  for (const mealType of MESS_MEAL_TYPES) {
    const items = normalizeNullableString(meals[mealType.toLowerCase()]);

    if (!items) {
      continue;
    }

    await executeQuery(
      `
        INSERT INTO Mess_Menu (Menu_Id, [Day], Meal_type, Items)
        VALUES (@menuId, @day, @mealType, @items)
      `,
      (request) =>
        request
          .input("menuId", sql.Int, nextMenuId)
          .input("day", sql.NVarChar(20), day)
          .input("mealType", sql.NVarChar(20), mealType)
          .input("items", sql.NVarChar(255), items)
    );

    nextMenuId += 1;
  }
};

const getDisplayName = (email) =>
  email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getUserName = (user) => normalizeString(user.fullName) || getDisplayName(user.email);
const getUserRole = (user) => {
  const normalizedRole = normalizeString(user?.role);
  return normalizedRole === "Student" ? "Student" : "Admin";
};
const getUserHomePath = (role) => (role === "Student" ? "/student" : "/admin");
const isAdminUser = (user) => getUserRole(user) === "Admin";
const isStudentUser = (user) => getUserRole(user) === "Student";

const getStudentProfileById = (studentId) =>
  queryOne(
    `
      SELECT
        s.Student_id AS student_id,
        s.Name AS name,
        s.Room_id AS room_id,
        r.Room_Number AS room_number,
        hb.Block_Name AS block_name,
        s.Guardian_Contact AS guardian_contact
      FROM Student s
      LEFT JOIN Room r ON r.Room_id = s.Room_id
      LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
      WHERE s.Student_id = @studentId
    `,
    (request) => request.input("studentId", sql.Int, studentId)
  );

const buildStudentUser = async (user) => {
  const studentId = parsePositiveInt(user.studentId);
  const studentProfile = studentId ? await getStudentProfileById(studentId) : null;

  return {
    id: user.id,
    email: user.email,
    name: studentProfile?.name || getUserName(user),
    phoneNumber: user.phoneNumber || null,
    role: "Student",
    studentId: studentProfile?.student_id || studentId || null,
    roomId: studentProfile?.room_id || null,
    roomNumber: studentProfile?.room_number || null,
    blockName: studentProfile?.block_name || null,
    guardianContact: studentProfile?.guardian_contact || null,
  };
};

const getStudentAccountForRequest = async (req) => {
  if (!req.user?.studentId) {
    return null;
  }

  return getStudentProfileById(req.user.studentId);
};

const buildAdminUser = (user) => ({
  id: user.id,
  email: user.email,
  name: getUserName(user),
  phoneNumber: user.phoneNumber || null,
  role: "Admin",
  studentId: null,
  roomId: null,
  roomNumber: null,
  blockName: null,
  guardianContact: null,
});

const hashResetCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const generateResetCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const createMailTransport = () => {
  if (process.env.SMTP_SERVICE && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendResetEmail = async ({ email, code, expiresAt }) => {
  const transport = createMailTransport();

  if (!transport) {
    return {
      delivered: false,
      previewOnly: true,
    };
  }

  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "HostelMS password reset code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
        <h2 style="margin-bottom: 12px; color: #1E3A5F;">Reset your HostelMS password</h2>
        <p style="color: #334155; line-height: 1.6;">
          Use the verification code below in the Reset Password screen.
        </p>
        <div style="margin: 24px 0; padding: 16px; border-radius: 12px; background: #EFF6FF; text-align: center;">
          <span style="font-size: 30px; letter-spacing: 6px; font-weight: 700; color: #1D4ED8;">${code}</span>
        </div>
        <p style="color: #475569; line-height: 1.6;">
          This code expires at ${expiresAt.toLocaleString()}.
        </p>
        <p style="color: #64748B; font-size: 14px; line-height: 1.6;">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return {
    delivered: true,
    previewOnly: false,
  };
};

const buildAuthPayload = async (user) => {
  const role = getUserRole(user);
  const normalizedUser = role === "Student" ? await buildStudentUser(user) : buildAdminUser(user);

  const token = jwt.sign(
    {
      id: normalizedUser.id,
      email: normalizedUser.email,
      role: normalizedUser.role,
      studentId: normalizedUser.studentId,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  return { token, user: normalizedUser };
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ message: "Authentication token is required." });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: "Your session has expired. Please sign in again." });
  }
};

const requireAdmin = (req, res, next) => {
  if (!isAdminUser(req.user)) {
    res.status(403).json({ message: "Admin access is required for this action." });
    return;
  }

  next();
};

const requireStudent = (req, res, next) => {
  if (!isStudentUser(req.user)) {
    res.status(403).json({ message: "Student access is required for this action." });
    return;
  }

  next();
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phoneNumber) => /^\+?[\d\s()-]{7,20}$/.test(phoneNumber);
const withForcedRole = (role, handler) => async (req, res, next) => {
  req.body = {
    ...req.body,
    role,
  };

  return handler(req, res, next);
};

const registerUser = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = normalizeString(req.body.role) === "Student" ? "Student" : "Admin";
  const fullName = normalizeNullableString(req.body.name) || getDisplayName(email);
  const phoneNumber = normalizeNullableString(req.body.phoneNumber);
  const guardianContact = normalizeNullableString(req.body.guardian_contact);

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters long." });
    return;
  }

  if (role === "Student" && !fullName) {
    res.status(400).json({ message: "Student name is required." });
    return;
  }

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ message: "Please enter a valid phone number." });
    return;
  }

  await ensureUserColumns();

  const pool = await getPool();
  const existingUser = await queryOne(
    "SELECT id FROM Users WHERE email = @email",
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (existingUser) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let studentId = null;

  if (role === "Student") {
    studentId = await getNextId("Student", "Student_id");

    await executeQuery(
      `
        INSERT INTO Student (Student_id, Name, Room_id, Guardian_Contact)
        VALUES (@studentId, @name, NULL, @guardianContact)
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("name", sql.NVarChar(100), fullName)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
    );
  }

  const insertResult = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .input("fullName", sql.NVarChar(120), fullName)
    .input("phoneNumber", sql.NVarChar(30), phoneNumber)
    .input("role", sql.NVarChar(20), role)
    .input("studentId", sql.Int, studentId)
    .query(`
      INSERT INTO Users (email, passwordHash, fullName, phoneNumber, role, studentId)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.fullName, INSERTED.phoneNumber, INSERTED.role, INSERTED.studentId
      VALUES (@email, @passwordHash, @fullName, @phoneNumber, @role, @studentId);
    `);

  const createdUser = insertResult.recordset[0];
  const { token, user } = await buildAuthPayload(createdUser);

  await pool
    .request()
    .input("id", sql.Int, createdUser.id)
    .input("token", sql.NVarChar(500), token)
    .query(`
      UPDATE Users
      SET jwtToken = @token, lastLogin = GETDATE()
      WHERE id = @id;
    `);

  res.status(201).json({
    message: "Registration successful.",
    token,
    user,
  });
};

const loginUser = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const requestedRole = normalizeString(req.body.role);

  if (!validateEmail(email) || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  await ensureUserColumns();

  const pool = await getPool();
  const userRecord = await queryOne(
    "SELECT * FROM Users WHERE email = @email",
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (!userRecord) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  if (requestedRole && getUserRole({ role: requestedRole }) !== getUserRole(userRecord)) {
    res.status(403).json({ message: `This account is registered as ${getUserRole(userRecord)}.` });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, userRecord.passwordHash);

  if (!passwordMatches) {
    res.status(401).json({ message: "Invalid password." });
    return;
  }

  const { token, user } = await buildAuthPayload(userRecord);

  await pool
    .request()
    .input("id", sql.Int, userRecord.id)
    .input("token", sql.NVarChar(500), token)
    .query(`
      UPDATE Users
      SET jwtToken = @token, lastLogin = GETDATE()
      WHERE id = @id;
    `);

  res.json({
    message: "Login successful.",
    token,
    user,
  });
};

const forgotPassword = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  await ensureUserColumns();

  const pool = await getPool();
  const userRecord = await queryOne(
    "SELECT id, email FROM Users WHERE email = @email",
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (!userRecord) {
    res.status(404).json({ message: "No account was found for this email address." });
    return;
  }

  const resetCode = generateResetCode();
  const resetCodeHash = hashResetCode(resetCode);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await pool
    .request()
    .input("id", sql.Int, userRecord.id)
    .input("passwordResetCodeHash", sql.NVarChar(255), resetCodeHash)
    .input("passwordResetExpiresAt", sql.DateTime, expiresAt)
    .query(`
      UPDATE Users
      SET passwordResetCodeHash = @passwordResetCodeHash,
          passwordResetExpiresAt = @passwordResetExpiresAt
      WHERE id = @id;
    `);

  const emailResult = await sendResetEmail({
    email,
    code: resetCode,
    expiresAt,
  });

  res.json({
    message: emailResult.delivered
      ? "A reset code has been sent to your email."
      : "Reset code generated. Configure SMTP to deliver emails automatically.",
    email,
    emailSent: emailResult.delivered,
    previewResetCode: emailResult.previewOnly ? resetCode : undefined,
    expiresAt: expiresAt.toISOString(),
  });
};

const resetPassword = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const code = String(req.body.code || "").trim();
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || req.body.password_confirmation || "");

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  if (!code) {
    res.status(400).json({ message: "Reset code is required." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters long." });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ message: "Passwords do not match." });
    return;
  }

  await ensureUserColumns();

  const pool = await getPool();
  const userRecord = await queryOne(
    `
      SELECT id, passwordResetCodeHash, passwordResetExpiresAt
      FROM Users
      WHERE email = @email
    `,
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (!userRecord || !userRecord.passwordResetCodeHash) {
    res.status(400).json({ message: "No active password reset request was found for this email." });
    return;
  }

  const isExpired =
    !userRecord.passwordResetExpiresAt ||
    new Date(userRecord.passwordResetExpiresAt).getTime() < Date.now();

  if (isExpired) {
    res.status(400).json({ message: "This reset code has expired. Please request a new one." });
    return;
  }

  const incomingCodeHash = hashResetCode(code);

  if (incomingCodeHash !== userRecord.passwordResetCodeHash) {
    res.status(400).json({ message: "The reset code is invalid." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool
    .request()
    .input("id", sql.Int, userRecord.id)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .query(`
      UPDATE Users
      SET passwordHash = @passwordHash,
          jwtToken = NULL,
          passwordResetCodeHash = NULL,
          passwordResetExpiresAt = NULL
      WHERE id = @id;
    `);

  res.json({ message: "Password reset successful. You can sign in with your new password now." });
};

const authMe = async (req, res) => {
  await ensureUserColumns();

  const currentUser = await queryOne(
    `
      SELECT id, email, fullName, phoneNumber, lastLogin, role, studentId
      FROM Users
      WHERE id = @id
    `,
    (request) => request.input("id", sql.Int, req.user.id)
  );

  if (!currentUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const normalizedUser = await (async () => {
    if (isStudentUser(currentUser)) {
      return buildStudentUser(currentUser);
    }

    return buildAdminUser(currentUser);
  })();

  res.json({
    ...normalizedUser,
    lastLogin: currentUser.lastLogin,
    homePath: getUserHomePath(normalizedUser.role),
  });
};

const updateProfile = async (req, res) => {
  await ensureUserColumns();

  const fullName = normalizeString(req.body.name);
  const phoneNumber = normalizeNullableString(req.body.phoneNumber);
  const guardianContact = normalizeNullableString(req.body.guardianContact);

  if (!fullName) {
    res.status(400).json({ message: "Name is required." });
    return;
  }

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ message: "Please enter a valid phone number." });
    return;
  }

  await executeQuery(
    `
      UPDATE Users
      SET fullName = @fullName,
          phoneNumber = @phoneNumber
      WHERE id = @id
    `,
    (request) =>
      request
        .input("id", sql.Int, req.user.id)
        .input("fullName", sql.NVarChar(120), fullName)
        .input("phoneNumber", sql.NVarChar(30), phoneNumber)
  );

  if (isStudentUser(req.user) && req.user.studentId) {
    await executeQuery(
      `
        UPDATE Student
        SET Name = @name,
            Guardian_Contact = @guardianContact
        WHERE Student_id = @studentId
      `,
      (request) =>
        request
          .input("name", sql.NVarChar(100), fullName)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
          .input("studentId", sql.Int, req.user.studentId)
    );
  }

  const updatedUser = await queryOne(
    `
      SELECT id, email, fullName, phoneNumber, lastLogin, role, studentId
      FROM Users
      WHERE id = @id
    `,
    (request) => request.input("id", sql.Int, req.user.id)
  );

  const normalizedUser = await (async () => {
    if (isStudentUser(updatedUser)) {
      return buildStudentUser(updatedUser);
    }

    return buildAdminUser(updatedUser);
  })();

  res.json({
    ...normalizedUser,
    lastLogin: updatedUser.lastLogin,
    message: "Profile updated successfully.",
    homePath: getUserHomePath(normalizedUser.role),
  });
};

const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);

protectedRouter.get(
  "/dashboard/summary",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const summary = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM Student) AS totalStudents,
        (SELECT COUNT(*) FROM Room) AS totalRooms,
        (SELECT COUNT(*) FROM Room WHERE Current_Occupancy >= Capacity) AS occupiedRooms,
        (SELECT COUNT(*) FROM Room WHERE Current_Occupancy < Capacity) AS availableRooms,
        (SELECT COUNT(*) FROM Maintenance WHERE Status = 'Pending') AS pendingMaintenance,
        (SELECT ISNULL(SUM(Amount), 0) FROM Payment) AS totalCollection
    `);

    res.json({
      ...summary,
      lastUpdatedAt: new Date().toISOString(),
    });
  })
);

protectedRouter.get(
  "/student/dashboard",
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await getStudentAccountForRequest(req);

    if (!student) {
      res.status(404).json({ message: "Student profile not found for this account." });
      return;
    }

    const [availableRooms, totalPayments, pendingLeaves, latestPayment] = await Promise.all([
      queryOne("SELECT COUNT(*) AS total FROM Room WHERE Current_Occupancy < Capacity"),
      queryOne(
        "SELECT COUNT(*) AS total FROM Payment WHERE Student_id = @studentId",
        (request) => request.input("studentId", sql.Int, student.student_id)
      ),
      queryOne(
        "SELECT COUNT(*) AS total FROM Leave_Request WHERE student_id = @studentId AND Status = 'Pending'",
        (request) => request.input("studentId", sql.Int, student.student_id)
      ),
      queryOne(
        `
          SELECT TOP 1 Amount AS amount, Payment_Date AS payment_date, [Month] AS [month]
          FROM Payment
          WHERE Student_id = @studentId
          ORDER BY Payment_Date DESC, Payment_id DESC
        `,
        (request) => request.input("studentId", sql.Int, student.student_id)
      ),
    ]);

    res.json({
      student,
      roomAssigned: Boolean(student.room_id),
      availableRooms: Number(availableRooms?.total || 0),
      totalPayments: Number(totalPayments?.total || 0),
      pendingLeaves: Number(pendingLeaves?.total || 0),
      latestPayment: latestPayment || null,
      lastUpdatedAt: new Date().toISOString(),
    });
  })
);

protectedRouter.post(
  "/student/apply-seat",
  requireStudent,
  asyncHandler(async (req, res) => {
    const requestedRoomId = parsePositiveInt(req.body.room_id);

    if (!requestedRoomId) {
      res.status(400).json({ message: "Please choose a valid room." });
      return;
    }

    const student = await getStudentAccountForRequest(req);

    if (!student) {
      res.status(404).json({ message: "Student profile not found for this account." });
      return;
    }

    if (student.room_id) {
      res.status(400).json({ message: "A seat is already assigned to your account." });
      return;
    }

    const roomAvailability = await getRoomAvailability(requestedRoomId);

    if (!roomAvailability) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    if (Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)) {
      res.status(400).json({ message: "The selected room is already full." });
      return;
    }

    await executeQuery(
      `
        UPDATE Student
        SET Room_id = @roomId
        WHERE Student_id = @studentId
      `,
      (request) =>
        request
          .input("roomId", sql.Int, requestedRoomId)
          .input("studentId", sql.Int, student.student_id)
    );

    await syncRoomOccupancy([requestedRoomId]);

    const updatedStudent = await getStudentProfileById(student.student_id);
    res.json({
      message: "Seat application successful. Your room has been assigned.",
      student: updatedStudent,
    });
  })
);

protectedRouter.get(
  "/students",
  asyncHandler(async (req, res) => {
    const rows = isStudentUser(req.user)
      ? await queryRows(
          `${studentSelectQuery} WHERE s.Student_id = @studentId ORDER BY s.Student_id`,
          (request) => request.input("studentId", sql.Int, req.user.studentId)
        )
      : await queryRows(`${studentSelectQuery} ORDER BY s.Student_id`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/students",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const name = normalizeString(req.body.name);
    const roomId = parsePositiveInt(req.body.room_id);
    const guardianContact = normalizeNullableString(req.body.guardian_contact);

    if (!name) {
      res.status(400).json({ message: "Student name is required." });
      return;
    }

    if (!roomId) {
      res.status(400).json({ message: "Please choose a valid room." });
      return;
    }

    const roomAvailability = await getRoomAvailability(roomId);

    if (!roomAvailability) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    if (Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)) {
      res.status(400).json({ message: "The selected room is already full." });
      return;
    }

    const studentId = await getNextId("Student", "Student_id");

    await executeQuery(
      `
        INSERT INTO Student (Student_id, Name, Room_id, Guardian_Contact)
        VALUES (@studentId, @name, @roomId, @guardianContact)
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("name", sql.NVarChar(100), name)
          .input("roomId", sql.Int, roomId)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
    );

    await syncRoomOccupancy([roomId]);

    const student = await getStudentById(studentId);
    res.status(201).json(student);
  })
);

protectedRouter.put(
  "/students/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.params.id);
    const name = normalizeString(req.body.name);
    const roomId = parsePositiveInt(req.body.room_id);
    const guardianContact = normalizeNullableString(req.body.guardian_contact);

    if (!studentId) {
      res.status(400).json({ message: "A valid student ID is required." });
      return;
    }

    if (!name) {
      res.status(400).json({ message: "Student name is required." });
      return;
    }

    if (!roomId) {
      res.status(400).json({ message: "Please choose a valid room." });
      return;
    }

    const existingStudent = await queryOne(
      "SELECT Student_id AS student_id, Room_id AS room_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!existingStudent) {
      res.status(404).json({ message: "Student not found." });
      return;
    }

    const roomAvailability = await getRoomAvailability(roomId, studentId);

    if (!roomAvailability) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    if (Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)) {
      res.status(400).json({ message: "The selected room is already full." });
      return;
    }

    await executeQuery(
      `
        UPDATE Student
        SET Name = @name,
            Room_id = @roomId,
            Guardian_Contact = @guardianContact
        WHERE Student_id = @studentId
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("name", sql.NVarChar(100), name)
          .input("roomId", sql.Int, roomId)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
    );

    await syncRoomOccupancy([existingStudent.room_id, roomId]);

    const student = await getStudentById(studentId);
    res.json(student);
  })
);

protectedRouter.delete(
  "/students/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.params.id);

    if (!studentId) {
      res.status(400).json({ message: "A valid student ID is required." });
      return;
    }

    const existingStudent = await queryOne(
      "SELECT Student_id AS student_id, Room_id AS room_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!existingStudent) {
      res.status(404).json({ message: "Student not found." });
      return;
    }

    await executeQuery(
      `
        DELETE FROM Users WHERE studentId = @studentId;
        DELETE FROM Visitor WHERE Student_id = @studentId;
        DELETE FROM Payment WHERE Student_id = @studentId;
        DELETE FROM Leave_Request WHERE student_id = @studentId;
        DELETE FROM Student WHERE Student_id = @studentId;
      `,
      (request) => request.input("studentId", sql.Int, studentId)
    );

    await syncRoomOccupancy([existingStudent.room_id]);

    res.json({ message: "Student deleted successfully." });
  })
);

protectedRouter.get(
  "/rooms",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${roomSelectQuery} ORDER BY r.Room_Number`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/rooms",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const roomNumber = normalizeString(req.body.room_number);
    const capacity = parsePositiveInt(req.body.capacity);
    const type = normalizeString(req.body.type);
    const hostelBlockId = parsePositiveInt(
      req.body.hostel_block_id ?? req.body.hostel_block
    );

    if (!roomNumber) {
      res.status(400).json({ message: "Room number is required." });
      return;
    }

    if (!capacity) {
      res.status(400).json({ message: "Capacity must be a positive number." });
      return;
    }

    if (!type) {
      res.status(400).json({ message: "Room type is required." });
      return;
    }

    if (!hostelBlockId) {
      res.status(400).json({ message: "Please choose a valid block." });
      return;
    }

    const block = await queryOne(
      "SELECT Block_id AS block_id FROM Hostel_Block WHERE Block_id = @blockId",
      (request) => request.input("blockId", sql.Int, hostelBlockId)
    );

    if (!block) {
      res.status(400).json({ message: "The selected block does not exist." });
      return;
    }

    const roomId = await getNextId("Room", "Room_id");

    await executeQuery(
      `
        INSERT INTO Room (Room_id, Room_Number, Capacity, Current_Occupancy, Type, Hostel_Block)
        VALUES (@roomId, @roomNumber, @capacity, 0, @type, @hostelBlockId)
      `,
      (request) =>
        request
          .input("roomId", sql.Int, roomId)
          .input("roomNumber", sql.NVarChar(20), roomNumber)
          .input("capacity", sql.Int, capacity)
          .input("type", sql.NVarChar(20), type)
          .input("hostelBlockId", sql.Int, hostelBlockId)
    );

    const room = await getRoomById(roomId);
    res.status(201).json(room);
  })
);

protectedRouter.put(
  "/rooms/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const roomId = parsePositiveInt(req.params.id);
    const roomNumber = normalizeString(req.body.room_number);
    const capacity = parsePositiveInt(req.body.capacity);
    const type = normalizeString(req.body.type);
    const hostelBlockId = parsePositiveInt(
      req.body.hostel_block_id ?? req.body.hostel_block
    );

    if (!roomId) {
      res.status(400).json({ message: "A valid room ID is required." });
      return;
    }

    if (!roomNumber) {
      res.status(400).json({ message: "Room number is required." });
      return;
    }

    if (!capacity) {
      res.status(400).json({ message: "Capacity must be a positive number." });
      return;
    }

    if (!type) {
      res.status(400).json({ message: "Room type is required." });
      return;
    }

    if (!hostelBlockId) {
      res.status(400).json({ message: "Please choose a valid block." });
      return;
    }

    const existingRoom = await queryOne(
      "SELECT Room_id AS room_id FROM Room WHERE Room_id = @roomId",
      (request) => request.input("roomId", sql.Int, roomId)
    );

    if (!existingRoom) {
      res.status(404).json({ message: "Room not found." });
      return;
    }

    const block = await queryOne(
      "SELECT Block_id AS block_id FROM Hostel_Block WHERE Block_id = @blockId",
      (request) => request.input("blockId", sql.Int, hostelBlockId)
    );

    if (!block) {
      res.status(400).json({ message: "The selected block does not exist." });
      return;
    }

    const assignedStudents = await getStudentCountForRoom(roomId);

    if (assignedStudents > capacity) {
      res.status(400).json({
        message: `This room already has ${assignedStudents} student(s). Increase capacity or move students before saving.`,
      });
      return;
    }

    await executeQuery(
      `
        UPDATE Room
        SET Room_Number = @roomNumber,
            Capacity = @capacity,
            Current_Occupancy = @currentOccupancy,
            Type = @type,
            Hostel_Block = @hostelBlockId
        WHERE Room_id = @roomId
      `,
      (request) =>
        request
          .input("roomId", sql.Int, roomId)
          .input("roomNumber", sql.NVarChar(20), roomNumber)
          .input("capacity", sql.Int, capacity)
          .input("currentOccupancy", sql.Int, assignedStudents)
          .input("type", sql.NVarChar(20), type)
          .input("hostelBlockId", sql.Int, hostelBlockId)
    );

    const room = await getRoomById(roomId);
    res.json(room);
  })
);

protectedRouter.delete(
  "/rooms/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const roomId = parsePositiveInt(req.params.id);

    if (!roomId) {
      res.status(400).json({ message: "A valid room ID is required." });
      return;
    }

    const existingRoom = await queryOne(
      "SELECT Room_id AS room_id FROM Room WHERE Room_id = @roomId",
      (request) => request.input("roomId", sql.Int, roomId)
    );

    if (!existingRoom) {
      res.status(404).json({ message: "Room not found." });
      return;
    }

    const assignedStudents = await getStudentCountForRoom(roomId);

    if (assignedStudents > 0) {
      res.status(400).json({
        message: "Move or delete the students assigned to this room before removing it.",
      });
      return;
    }

    await executeQuery(
      `
        DELETE FROM Maintenance WHERE Room_id = @roomId;
        DELETE FROM Room WHERE Room_id = @roomId;
      `,
      (request) => request.input("roomId", sql.Int, roomId)
    );

    res.json({ message: "Room deleted successfully." });
  })
);

protectedRouter.get(
  "/blocks",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${blockSelectQuery} ORDER BY hb.Block_id`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/blocks",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const blockName = normalizeString(req.body.block_name);
    const totalRooms = parseNonNegativeInt(req.body.total_rooms);

    if (!blockName) {
      res.status(400).json({ message: "Block name is required." });
      return;
    }

    if (totalRooms === null) {
      res.status(400).json({ message: "Total rooms must be zero or more." });
      return;
    }

    const blockId = await getNextId("Hostel_Block", "Block_id");

    await executeQuery(
      `
        INSERT INTO Hostel_Block (Block_id, Block_Name, Total_Rooms)
        VALUES (@blockId, @blockName, @totalRooms)
      `,
      (request) =>
        request
          .input("blockId", sql.Int, blockId)
          .input("blockName", sql.NVarChar(50), blockName)
          .input("totalRooms", sql.Int, totalRooms)
    );

    const block = await getBlockById(blockId);
    res.status(201).json(block);
  })
);

protectedRouter.put(
  "/blocks/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const blockId = parsePositiveInt(req.params.id);
    const blockName = normalizeString(req.body.block_name);
    const totalRooms = parseNonNegativeInt(req.body.total_rooms);

    if (!blockId) {
      res.status(400).json({ message: "A valid block ID is required." });
      return;
    }

    if (!blockName) {
      res.status(400).json({ message: "Block name is required." });
      return;
    }

    if (totalRooms === null) {
      res.status(400).json({ message: "Total rooms must be zero or more." });
      return;
    }

    const existingBlock = await queryOne(
      "SELECT Block_id AS block_id FROM Hostel_Block WHERE Block_id = @blockId",
      (request) => request.input("blockId", sql.Int, blockId)
    );

    if (!existingBlock) {
      res.status(404).json({ message: "Block not found." });
      return;
    }

    await executeQuery(
      `
        UPDATE Hostel_Block
        SET Block_Name = @blockName,
            Total_Rooms = @totalRooms
        WHERE Block_id = @blockId
      `,
      (request) =>
        request
          .input("blockId", sql.Int, blockId)
          .input("blockName", sql.NVarChar(50), blockName)
          .input("totalRooms", sql.Int, totalRooms)
    );

    const block = await getBlockById(blockId);
    res.json(block);
  })
);

protectedRouter.delete(
  "/blocks/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const blockId = parsePositiveInt(req.params.id);

    if (!blockId) {
      res.status(400).json({ message: "A valid block ID is required." });
      return;
    }

    const existingBlock = await queryOne(
      "SELECT Block_id AS block_id FROM Hostel_Block WHERE Block_id = @blockId",
      (request) => request.input("blockId", sql.Int, blockId)
    );

    if (!existingBlock) {
      res.status(404).json({ message: "Block not found." });
      return;
    }

    const linkedRooms = await queryOne(
      "SELECT COUNT(*) AS total FROM Room WHERE Hostel_Block = @blockId",
      (request) => request.input("blockId", sql.Int, blockId)
    );

    if (Number(linkedRooms?.total || 0) > 0) {
      res.status(400).json({
        message: "Move or delete the rooms in this block before removing it.",
      });
      return;
    }

    await executeQuery("DELETE FROM Hostel_Block WHERE Block_id = @blockId", (request) =>
      request.input("blockId", sql.Int, blockId)
    );

    res.json({ message: "Block deleted successfully." });
  })
);

protectedRouter.get(
  "/visitors",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${visitorSelectQuery} ORDER BY v.Date_time_Entry DESC`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/visitors",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.body.student_id);
    const purpose = normalizeString(req.body.purpose);
    const entryTime = parseDateTimeValue(req.body.entry_time);
    const exitTime = parseDateTimeValue(req.body.exit_time);

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!purpose) {
      res.status(400).json({ message: "Purpose is required." });
      return;
    }

    if (!entryTime) {
      res.status(400).json({ message: "Entry time is required." });
      return;
    }

    if (exitTime && exitTime.getTime() < entryTime.getTime()) {
      res.status(400).json({ message: "Exit time cannot be earlier than entry time." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    const visitorId = await getNextId("Visitor", "Visitor_id");

    await executeQuery(
      `
        INSERT INTO Visitor (Visitor_id, Student_id, Date_time_Entry, Date_time_Exit, Purpose)
        VALUES (@visitorId, @studentId, @entryTime, @exitTime, @purpose)
      `,
      (request) =>
        request
          .input("visitorId", sql.Int, visitorId)
          .input("studentId", sql.Int, studentId)
          .input("entryTime", sql.DateTime, entryTime)
          .input("exitTime", sql.DateTime, exitTime)
          .input("purpose", sql.NVarChar(255), purpose)
    );

    const visitor = await getVisitorById(visitorId);
    res.status(201).json(visitor);
  })
);

protectedRouter.put(
  "/visitors/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const visitorId = parsePositiveInt(req.params.id);
    const studentId = parsePositiveInt(req.body.student_id);
    const purpose = normalizeString(req.body.purpose);
    const entryTime = parseDateTimeValue(req.body.entry_time);
    const exitTime = parseDateTimeValue(req.body.exit_time);

    if (!visitorId) {
      res.status(400).json({ message: "A valid visitor ID is required." });
      return;
    }

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!purpose) {
      res.status(400).json({ message: "Purpose is required." });
      return;
    }

    if (!entryTime) {
      res.status(400).json({ message: "Entry time is required." });
      return;
    }

    if (exitTime && exitTime.getTime() < entryTime.getTime()) {
      res.status(400).json({ message: "Exit time cannot be earlier than entry time." });
      return;
    }

    const existingVisitor = await queryOne(
      "SELECT Visitor_id AS visitor_id FROM Visitor WHERE Visitor_id = @visitorId",
      (request) => request.input("visitorId", sql.Int, visitorId)
    );

    if (!existingVisitor) {
      res.status(404).json({ message: "Visitor record not found." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    await executeQuery(
      `
        UPDATE Visitor
        SET Student_id = @studentId,
            Date_time_Entry = @entryTime,
            Date_time_Exit = @exitTime,
            Purpose = @purpose
        WHERE Visitor_id = @visitorId
      `,
      (request) =>
        request
          .input("visitorId", sql.Int, visitorId)
          .input("studentId", sql.Int, studentId)
          .input("entryTime", sql.DateTime, entryTime)
          .input("exitTime", sql.DateTime, exitTime)
          .input("purpose", sql.NVarChar(255), purpose)
    );

    const visitor = await getVisitorById(visitorId);
    res.json(visitor);
  })
);

protectedRouter.delete(
  "/visitors/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const visitorId = parsePositiveInt(req.params.id);

    if (!visitorId) {
      res.status(400).json({ message: "A valid visitor ID is required." });
      return;
    }

    const existingVisitor = await queryOne(
      "SELECT Visitor_id AS visitor_id FROM Visitor WHERE Visitor_id = @visitorId",
      (request) => request.input("visitorId", sql.Int, visitorId)
    );

    if (!existingVisitor) {
      res.status(404).json({ message: "Visitor record not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Visitor WHERE Visitor_id = @visitorId",
      (request) => request.input("visitorId", sql.Int, visitorId)
    );

    res.json({ message: "Visitor deleted successfully." });
  })
);

protectedRouter.get(
  "/payments",
  asyncHandler(async (req, res) => {
    const rows = isStudentUser(req.user)
      ? await queryRows(
          `${paymentSelectQuery} WHERE p.Student_id = @studentId ORDER BY p.Payment_Date DESC, p.Payment_id DESC`,
          (request) => request.input("studentId", sql.Int, req.user.studentId)
        )
      : await queryRows(`${paymentSelectQuery} ORDER BY p.Payment_Date DESC, p.Payment_id DESC`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/payments",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.body.student_id);
    const amount = parsePositiveInt(req.body.amount);
    const paymentDate = parseDateValue(req.body.payment_date);
    const month = normalizeString(req.body.month);

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!amount) {
      res.status(400).json({ message: "Amount must be a positive number." });
      return;
    }

    if (!paymentDate) {
      res.status(400).json({ message: "Payment date is required." });
      return;
    }

    if (!month) {
      res.status(400).json({ message: "Month is required." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    const paymentId = await getNextId("Payment", "Payment_id");

    await executeQuery(
      `
        INSERT INTO Payment (Payment_id, Student_id, Amount, Payment_Date, [Month])
        VALUES (@paymentId, @studentId, @amount, @paymentDate, @month)
      `,
      (request) =>
        request
          .input("paymentId", sql.Int, paymentId)
          .input("studentId", sql.Int, studentId)
          .input("amount", sql.Int, amount)
          .input("paymentDate", sql.Date, paymentDate)
          .input("month", sql.NVarChar(20), month)
    );

    const payment = await getPaymentById(paymentId);
    res.status(201).json(payment);
  })
);

protectedRouter.put(
  "/payments/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const paymentId = parsePositiveInt(req.params.id);
    const studentId = parsePositiveInt(req.body.student_id);
    const amount = parsePositiveInt(req.body.amount);
    const paymentDate = parseDateValue(req.body.payment_date);
    const month = normalizeString(req.body.month);

    if (!paymentId) {
      res.status(400).json({ message: "A valid payment ID is required." });
      return;
    }

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!amount) {
      res.status(400).json({ message: "Amount must be a positive number." });
      return;
    }

    if (!paymentDate) {
      res.status(400).json({ message: "Payment date is required." });
      return;
    }

    if (!month) {
      res.status(400).json({ message: "Month is required." });
      return;
    }

    const existingPayment = await queryOne(
      "SELECT Payment_id AS payment_id FROM Payment WHERE Payment_id = @paymentId",
      (request) => request.input("paymentId", sql.Int, paymentId)
    );

    if (!existingPayment) {
      res.status(404).json({ message: "Payment record not found." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    await executeQuery(
      `
        UPDATE Payment
        SET Student_id = @studentId,
            Amount = @amount,
            Payment_Date = @paymentDate,
            [Month] = @month
        WHERE Payment_id = @paymentId
      `,
      (request) =>
        request
          .input("paymentId", sql.Int, paymentId)
          .input("studentId", sql.Int, studentId)
          .input("amount", sql.Int, amount)
          .input("paymentDate", sql.Date, paymentDate)
          .input("month", sql.NVarChar(20), month)
    );

    const payment = await getPaymentById(paymentId);
    res.json(payment);
  })
);

protectedRouter.delete(
  "/payments/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const paymentId = parsePositiveInt(req.params.id);

    if (!paymentId) {
      res.status(400).json({ message: "A valid payment ID is required." });
      return;
    }

    const existingPayment = await queryOne(
      "SELECT Payment_id AS payment_id FROM Payment WHERE Payment_id = @paymentId",
      (request) => request.input("paymentId", sql.Int, paymentId)
    );

    if (!existingPayment) {
      res.status(404).json({ message: "Payment record not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Payment WHERE Payment_id = @paymentId",
      (request) => request.input("paymentId", sql.Int, paymentId)
    );

    res.json({ message: "Payment deleted successfully." });
  })
);

protectedRouter.get(
  "/fees",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${feeSelectQuery} ORDER BY f.Fee_id`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/fees",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const type = normalizeString(req.body.type);
    const amount = parsePositiveInt(req.body.amount);

    if (!type) {
      res.status(400).json({ message: "Fee type is required." });
      return;
    }

    if (!amount) {
      res.status(400).json({ message: "Amount must be a positive number." });
      return;
    }

    const feeId = await getNextId("Fee_Structure", "Fee_id");

    await executeQuery(
      `
        INSERT INTO Fee_Structure (Fee_id, Type, Amount)
        VALUES (@feeId, @type, @amount)
      `,
      (request) =>
        request
          .input("feeId", sql.Int, feeId)
          .input("type", sql.NVarChar(50), type)
          .input("amount", sql.Int, amount)
    );

    const fee = await getFeeById(feeId);
    res.status(201).json(fee);
  })
);

protectedRouter.put(
  "/fees/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const feeId = parsePositiveInt(req.params.id);
    const type = normalizeString(req.body.type);
    const amount = parsePositiveInt(req.body.amount);

    if (!feeId) {
      res.status(400).json({ message: "A valid fee ID is required." });
      return;
    }

    if (!type) {
      res.status(400).json({ message: "Fee type is required." });
      return;
    }

    if (!amount) {
      res.status(400).json({ message: "Amount must be a positive number." });
      return;
    }

    const existingFee = await queryOne(
      "SELECT Fee_id AS fee_id FROM Fee_Structure WHERE Fee_id = @feeId",
      (request) => request.input("feeId", sql.Int, feeId)
    );

    if (!existingFee) {
      res.status(404).json({ message: "Fee record not found." });
      return;
    }

    await executeQuery(
      `
        UPDATE Fee_Structure
        SET Type = @type,
            Amount = @amount
        WHERE Fee_id = @feeId
      `,
      (request) =>
        request
          .input("feeId", sql.Int, feeId)
          .input("type", sql.NVarChar(50), type)
          .input("amount", sql.Int, amount)
    );

    const fee = await getFeeById(feeId);
    res.json(fee);
  })
);

protectedRouter.delete(
  "/fees/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const feeId = parsePositiveInt(req.params.id);

    if (!feeId) {
      res.status(400).json({ message: "A valid fee ID is required." });
      return;
    }

    const existingFee = await queryOne(
      "SELECT Fee_id AS fee_id FROM Fee_Structure WHERE Fee_id = @feeId",
      (request) => request.input("feeId", sql.Int, feeId)
    );

    if (!existingFee) {
      res.status(404).json({ message: "Fee record not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Fee_Structure WHERE Fee_id = @feeId",
      (request) => request.input("feeId", sql.Int, feeId)
    );

    res.json({ message: "Fee record deleted successfully." });
  })
);

protectedRouter.get(
  "/mess",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${messSelectQuery} ORDER BY ${DAY_ORDER_CASE}`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/mess",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const day = normalizeString(req.body.day);
    const breakfast = normalizeNullableString(req.body.breakfast);
    const lunch = normalizeNullableString(req.body.lunch);
    const dinner = normalizeNullableString(req.body.dinner);

    if (!isAllowedValue(day, DAY_ORDER)) {
      res.status(400).json({ message: "Please choose a valid day of the week." });
      return;
    }

    if (!breakfast && !lunch && !dinner) {
      res.status(400).json({ message: "Add at least one meal item before saving the menu." });
      return;
    }

    const existingDay = await getMessDayById(day);

    if (existingDay) {
      res.status(400).json({ message: "That day already exists in the mess menu. Edit it instead." });
      return;
    }

    await replaceMessMealsForDay(day, { breakfast, lunch, dinner });

    const messDay = await getMessDayById(day);
    res.status(201).json(messDay);
  })
);

protectedRouter.put(
  "/mess/:dayId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const currentDay = normalizeString(req.params.dayId);
    const nextDay = normalizeString(req.body.day || req.params.dayId);
    const breakfast = normalizeNullableString(req.body.breakfast);
    const lunch = normalizeNullableString(req.body.lunch);
    const dinner = normalizeNullableString(req.body.dinner);

    if (!isAllowedValue(currentDay, DAY_ORDER)) {
      res.status(400).json({ message: "A valid current day is required." });
      return;
    }

    if (!isAllowedValue(nextDay, DAY_ORDER)) {
      res.status(400).json({ message: "Please choose a valid day of the week." });
      return;
    }

    if (!breakfast && !lunch && !dinner) {
      res.status(400).json({ message: "Add at least one meal item before saving the menu." });
      return;
    }

    const existingDay = await getMessDayById(currentDay);

    if (!existingDay) {
      res.status(404).json({ message: "Mess menu entry not found." });
      return;
    }

    if (nextDay !== currentDay) {
      const conflictingDay = await getMessDayById(nextDay);

      if (conflictingDay) {
        res.status(400).json({ message: "That day already exists in the mess menu." });
        return;
      }

      await executeQuery(
        "DELETE FROM Mess_Menu WHERE [Day] = @day",
        (request) => request.input("day", sql.NVarChar(20), currentDay)
      );
    }

    await replaceMessMealsForDay(nextDay, { breakfast, lunch, dinner });

    const messDay = await getMessDayById(nextDay);
    res.json(messDay);
  })
);

protectedRouter.delete(
  "/mess/:dayId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const day = normalizeString(req.params.dayId);

    if (!isAllowedValue(day, DAY_ORDER)) {
      res.status(400).json({ message: "A valid day is required." });
      return;
    }

    const existingDay = await getMessDayById(day);

    if (!existingDay) {
      res.status(404).json({ message: "Mess menu entry not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Mess_Menu WHERE [Day] = @day",
      (request) => request.input("day", sql.NVarChar(20), day)
    );

    res.json({ message: "Mess menu entry deleted successfully." });
  })
);

protectedRouter.get(
  "/maintenance",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${maintenanceSelectQuery} ORDER BY m.Date_Reported DESC, m.Request_id DESC`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/maintenance",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const roomId = parsePositiveInt(req.body.room_id);
    const issueType = normalizeString(req.body.issue_type);
    const dateReported = parseDateValue(req.body.date_reported);
    const status = normalizeString(req.body.status);

    if (!roomId) {
      res.status(400).json({ message: "Please choose a valid room." });
      return;
    }

    if (!issueType) {
      res.status(400).json({ message: "Issue type is required." });
      return;
    }

    if (!dateReported) {
      res.status(400).json({ message: "Date reported is required." });
      return;
    }

    if (!isAllowedValue(status, MAINTENANCE_STATUSES)) {
      res.status(400).json({ message: "Please choose a valid maintenance status." });
      return;
    }

    const room = await queryOne(
      "SELECT Room_id AS room_id FROM Room WHERE Room_id = @roomId",
      (request) => request.input("roomId", sql.Int, roomId)
    );

    if (!room) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    const requestId = await getNextId("Maintenance", "Request_id");

    await executeQuery(
      `
        INSERT INTO Maintenance (Request_id, Room_id, Issue_type, Date_Reported, Status)
        VALUES (@requestId, @roomId, @issueType, @dateReported, @status)
      `,
      (request) =>
        request
          .input("requestId", sql.Int, requestId)
          .input("roomId", sql.Int, roomId)
          .input("issueType", sql.NVarChar(100), issueType)
          .input("dateReported", sql.Date, dateReported)
          .input("status", sql.NVarChar(20), status)
    );

    const maintenance = await getMaintenanceById(requestId);
    res.status(201).json(maintenance);
  })
);

protectedRouter.put(
  "/maintenance/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const requestId = parsePositiveInt(req.params.id);
    const roomId = parsePositiveInt(req.body.room_id);
    const issueType = normalizeString(req.body.issue_type);
    const dateReported = parseDateValue(req.body.date_reported);
    const status = normalizeString(req.body.status);

    if (!requestId) {
      res.status(400).json({ message: "A valid request ID is required." });
      return;
    }

    if (!roomId) {
      res.status(400).json({ message: "Please choose a valid room." });
      return;
    }

    if (!issueType) {
      res.status(400).json({ message: "Issue type is required." });
      return;
    }

    if (!dateReported) {
      res.status(400).json({ message: "Date reported is required." });
      return;
    }

    if (!isAllowedValue(status, MAINTENANCE_STATUSES)) {
      res.status(400).json({ message: "Please choose a valid maintenance status." });
      return;
    }

    const existingMaintenance = await queryOne(
      "SELECT Request_id AS request_id FROM Maintenance WHERE Request_id = @requestId",
      (request) => request.input("requestId", sql.Int, requestId)
    );

    if (!existingMaintenance) {
      res.status(404).json({ message: "Maintenance request not found." });
      return;
    }

    const room = await queryOne(
      "SELECT Room_id AS room_id FROM Room WHERE Room_id = @roomId",
      (request) => request.input("roomId", sql.Int, roomId)
    );

    if (!room) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    await executeQuery(
      `
        UPDATE Maintenance
        SET Room_id = @roomId,
            Issue_type = @issueType,
            Date_Reported = @dateReported,
            Status = @status
        WHERE Request_id = @requestId
      `,
      (request) =>
        request
          .input("requestId", sql.Int, requestId)
          .input("roomId", sql.Int, roomId)
          .input("issueType", sql.NVarChar(100), issueType)
          .input("dateReported", sql.Date, dateReported)
          .input("status", sql.NVarChar(20), status)
    );

    const maintenance = await getMaintenanceById(requestId);
    res.json(maintenance);
  })
);

protectedRouter.delete(
  "/maintenance/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const requestId = parsePositiveInt(req.params.id);

    if (!requestId) {
      res.status(400).json({ message: "A valid request ID is required." });
      return;
    }

    const existingMaintenance = await queryOne(
      "SELECT Request_id AS request_id FROM Maintenance WHERE Request_id = @requestId",
      (request) => request.input("requestId", sql.Int, requestId)
    );

    if (!existingMaintenance) {
      res.status(404).json({ message: "Maintenance request not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Maintenance WHERE Request_id = @requestId",
      (request) => request.input("requestId", sql.Int, requestId)
    );

    res.json({ message: "Maintenance request deleted successfully." });
  })
);

protectedRouter.get(
  "/leaves",
  asyncHandler(async (req, res) => {
    const rows = isStudentUser(req.user)
      ? await queryRows(
          `${leaveSelectQuery} WHERE l.student_id = @studentId ORDER BY l.from_date DESC, l.leave_id DESC`,
          (request) => request.input("studentId", sql.Int, req.user.studentId)
        )
      : await queryRows(`${leaveSelectQuery} ORDER BY l.from_date DESC, l.leave_id DESC`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/leaves",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.body.student_id);
    const fromDate = parseDateValue(req.body.from_date);
    const toDate = parseDateValue(req.body.to_date);
    const reason = normalizeString(req.body.reason);
    const status = normalizeString(req.body.status);

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!fromDate) {
      res.status(400).json({ message: "From date is required." });
      return;
    }

    if (!toDate) {
      res.status(400).json({ message: "To date is required." });
      return;
    }

    if (toDate.getTime() < fromDate.getTime()) {
      res.status(400).json({ message: "To date cannot be earlier than from date." });
      return;
    }

    if (!reason) {
      res.status(400).json({ message: "Reason is required." });
      return;
    }

    if (!isAllowedValue(status, LEAVE_STATUSES)) {
      res.status(400).json({ message: "Please choose a valid leave status." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    const leaveId = await getNextId("Leave_Request", "leave_id");

    await executeQuery(
      `
        INSERT INTO Leave_Request (leave_id, student_id, from_date, to_date, reason, Status)
        VALUES (@leaveId, @studentId, @fromDate, @toDate, @reason, @status)
      `,
      (request) =>
        request
          .input("leaveId", sql.Int, leaveId)
          .input("studentId", sql.Int, studentId)
          .input("fromDate", sql.Date, fromDate)
          .input("toDate", sql.Date, toDate)
          .input("reason", sql.NVarChar(255), reason)
          .input("status", sql.NVarChar(20), status)
    );

    const leaveRequest = await getLeaveById(leaveId);
    res.status(201).json(leaveRequest);
  })
);

protectedRouter.put(
  "/leaves/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const leaveId = parsePositiveInt(req.params.id);
    const studentId = parsePositiveInt(req.body.student_id);
    const fromDate = parseDateValue(req.body.from_date);
    const toDate = parseDateValue(req.body.to_date);
    const reason = normalizeString(req.body.reason);
    const status = normalizeString(req.body.status);

    if (!leaveId) {
      res.status(400).json({ message: "A valid leave ID is required." });
      return;
    }

    if (!studentId) {
      res.status(400).json({ message: "Please choose a valid student." });
      return;
    }

    if (!fromDate) {
      res.status(400).json({ message: "From date is required." });
      return;
    }

    if (!toDate) {
      res.status(400).json({ message: "To date is required." });
      return;
    }

    if (toDate.getTime() < fromDate.getTime()) {
      res.status(400).json({ message: "To date cannot be earlier than from date." });
      return;
    }

    if (!reason) {
      res.status(400).json({ message: "Reason is required." });
      return;
    }

    if (!isAllowedValue(status, LEAVE_STATUSES)) {
      res.status(400).json({ message: "Please choose a valid leave status." });
      return;
    }

    const existingLeave = await queryOne(
      "SELECT leave_id AS leave_id FROM Leave_Request WHERE leave_id = @leaveId",
      (request) => request.input("leaveId", sql.Int, leaveId)
    );

    if (!existingLeave) {
      res.status(404).json({ message: "Leave request not found." });
      return;
    }

    const student = await queryOne(
      "SELECT Student_id AS student_id FROM Student WHERE Student_id = @studentId",
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    await executeQuery(
      `
        UPDATE Leave_Request
        SET student_id = @studentId,
            from_date = @fromDate,
            to_date = @toDate,
            reason = @reason,
            Status = @status
        WHERE leave_id = @leaveId
      `,
      (request) =>
        request
          .input("leaveId", sql.Int, leaveId)
          .input("studentId", sql.Int, studentId)
          .input("fromDate", sql.Date, fromDate)
          .input("toDate", sql.Date, toDate)
          .input("reason", sql.NVarChar(255), reason)
          .input("status", sql.NVarChar(20), status)
    );

    const leaveRequest = await getLeaveById(leaveId);
    res.json(leaveRequest);
  })
);

protectedRouter.delete(
  "/leaves/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const leaveId = parsePositiveInt(req.params.id);

    if (!leaveId) {
      res.status(400).json({ message: "A valid leave ID is required." });
      return;
    }

    const existingLeave = await queryOne(
      "SELECT leave_id AS leave_id FROM Leave_Request WHERE leave_id = @leaveId",
      (request) => request.input("leaveId", sql.Int, leaveId)
    );

    if (!existingLeave) {
      res.status(404).json({ message: "Leave request not found." });
      return;
    }

    await executeQuery(
      "DELETE FROM Leave_Request WHERE leave_id = @leaveId",
      (request) => request.input("leaveId", sql.Int, leaveId)
    );

    res.json({ message: "Leave request deleted successfully." });
  })
);

app.get("/", (req, res) => {
  res.json({
    message: "HostelMS backend is running.",
    health: "/api/health",
  });
});

app.get(
  "/api/health",
  asyncHandler(async (req, res) => {
    try {
      await getPool();
      await ensureUserColumns();

      res.json({
        status: "ok",
        database: "connected",
      });
    } catch (error) {
      res.status(503).json({
        status: "degraded",
        database: "disconnected",
        message: error.message,
      });
    }
  })
);

app.post("/register", asyncHandler(registerUser));
app.post("/login", asyncHandler(loginUser));
app.post("/forgot-password", asyncHandler(forgotPassword));
app.post("/reset-password", asyncHandler(resetPassword));

app.post("/api/auth/register", asyncHandler(registerUser));
app.post("/api/auth/login", asyncHandler(loginUser));
app.post("/api/auth/admin/register", asyncHandler(withForcedRole("Admin", registerUser)));
app.post("/api/auth/admin/login", asyncHandler(withForcedRole("Admin", loginUser)));
app.post("/api/auth/student/register", asyncHandler(withForcedRole("Student", registerUser)));
app.post("/api/auth/student/login", asyncHandler(withForcedRole("Student", loginUser)));
app.post("/api/auth/forgot-password", asyncHandler(forgotPassword));
app.post("/api/auth/reset-password", asyncHandler(resetPassword));
app.get("/api/auth/me", authenticateToken, asyncHandler(authMe));
app.put("/api/auth/me", authenticateToken, asyncHandler(updateProfile));

app.use("/api", protectedRouter);

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error.message || "Something went wrong.",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  if (!hasDatabaseConfig()) {
    console.warn(missingDatabaseConfigMessage);
    return;
  }

  getPool()
    .then(() => ensureUserColumns())
    .catch((error) => {
      console.error("DB Connection Failed:", error.message);
    });
});

module.exports = app;
