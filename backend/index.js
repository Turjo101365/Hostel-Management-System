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
const FIXED_SUPER_ADMIN_EMAIL = "feroz.alam4103@gmail.com";
const FIXED_SUPER_ADMIN_NAME = "Super Admin";
const FIXED_SUPER_ADMIN_PASSWORD_HASH =
  "$2b$10$c9e7.XiRARrD06b6EO4/UeQ3evi71IL2RscUXmzadNkR3ltYbNY0e";
const LEGACY_FIXED_SUPER_ADMIN_PASSWORD_HASH =
  "$2b$10$BMj2WlbGqsYJvOL7LqGlGe7FhR72qhjUQCcjXvVXfox0wbP.JX40i";
const CLIENT_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
].filter(Boolean);

const LOCAL_ORIGIN_REGEX =
  /^https?:\/\/((localhost|127\.0\.0\.1)|((10|192\.168)\.\d{1,3}\.\d{1,3})|(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}))(:\d+)?$/i;

app.use(
  cors({
    origin(origin, callback) {
      const isAllowedLocalOrigin = origin && LOCAL_ORIGIN_REGEX.test(origin);
      if (
        !origin ||
        CLIENT_ORIGINS.length === 0 ||
        CLIENT_ORIGINS.includes(origin) ||
        isAllowedLocalOrigin
      ) {
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
  ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
  options: {
    ...(!process.env.DB_PORT && process.env.DB_INSTANCE
      ? { instanceName: String(process.env.DB_INSTANCE).trim() }
      : {}),
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
let adminInvitationsEnsured = false;
let studentsTableEnsured = false;
let publicRoomShowcaseEnsured = false;
let publicRoomAvailabilityLastRefreshedAt = 0;
let publicRoomAvailabilityRefreshTimer = null;
const STUDENT_TABLE = "Students";
const PUBLIC_ROOM_AVAILABILITY_REFRESH_MS = Math.max(
  Number(process.env.PUBLIC_ROOM_AVAILABILITY_REFRESH_MS || 180000),
  30000
);

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

    IF COL_LENGTH('Users', 'Role') IS NULL
    BEGIN
      ALTER TABLE Users ADD Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'Admin';
    END;
  `);

  await pool.request().query(`
    IF COL_LENGTH('Users', 'Role') IS NOT NULL
    BEGIN
      UPDATE Users
      SET Role = 'Admin'
      WHERE Role IS NULL;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.check_constraints
      WHERE name = 'CK_Users_Role'
        AND parent_object_id = OBJECT_ID('dbo.Users')
    )
    BEGIN
      ALTER TABLE Users
      ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'SuperAdmin'));
    END;
  `);

  userColumnsEnsured = true;
};

const ensureAdminInvitationsTable = async () => {
  if (adminInvitationsEnsured) {
    return;
  }

  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('dbo.AdminInvitations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AdminInvitations (
        Id INT IDENTITY(1,1) NOT NULL,
        Email NVARCHAR(100) NOT NULL,
        Token NVARCHAR(128) NOT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_AdminInvitations_CreatedAt DEFAULT GETDATE(),
        IsUsed BIT NOT NULL CONSTRAINT DF_AdminInvitations_IsUsed DEFAULT 0,
        CONSTRAINT PK_AdminInvitations PRIMARY KEY (Id),
        CONSTRAINT UQ_AdminInvitations_Token UNIQUE (Token)
      );
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.AdminInvitations')
        AND name = 'IX_AdminInvitations_Email_IsUsed'
    )
    BEGIN
      CREATE INDEX IX_AdminInvitations_Email_IsUsed
      ON dbo.AdminInvitations (Email, IsUsed);
    END;
  `);

  adminInvitationsEnsured = true;
};

const ensureStudentsTable = async () => {
  if (studentsTableEnsured) {
    return;
  }

  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('dbo.Students', 'U') IS NULL AND OBJECT_ID('dbo.Student', 'U') IS NOT NULL
    BEGIN
      EXEC sp_rename 'dbo.Student', 'Students';
    END;

    IF OBJECT_ID('dbo.Students', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Students (
        Student_id INT NOT NULL,
        Name NVARCHAR(100) NOT NULL,
        Email NVARCHAR(100) NULL,
        PhoneNumber NVARCHAR(30) NULL,
        Room_id INT NULL,
        Guardian_Contact NVARCHAR(20) NULL,
        PasswordHash NVARCHAR(255) NULL,
        JwtToken NVARCHAR(500) NULL,
        PasswordResetCodeHash NVARCHAR(255) NULL,
        PasswordResetExpiresAt DATETIME NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_Students_CreatedAt DEFAULT GETDATE(),
        LastLogin DATETIME NULL,
        CONSTRAINT PK_Students PRIMARY KEY (Student_id),
        CONSTRAINT FK_Students_Room FOREIGN KEY (Room_id) REFERENCES dbo.Room(Room_id)
      );
    END;

    IF COL_LENGTH('dbo.Students', 'Email') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD Email NVARCHAR(100) NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'PhoneNumber') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD PhoneNumber NVARCHAR(30) NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'PasswordHash') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD PasswordHash NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'JwtToken') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD JwtToken NVARCHAR(500) NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'PasswordResetCodeHash') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD PasswordResetCodeHash NVARCHAR(255) NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'PasswordResetExpiresAt') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD PasswordResetExpiresAt DATETIME NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'CreatedAt') IS NULL
    BEGIN
      ALTER TABLE dbo.Students
      ADD CreatedAt DATETIME NOT NULL CONSTRAINT DF_Students_CreatedAt_Default DEFAULT GETDATE();
    END;

    IF COL_LENGTH('dbo.Students', 'LastLogin') IS NULL
    BEGIN
      ALTER TABLE dbo.Students ADD LastLogin DATETIME NULL;
    END;

    IF COL_LENGTH('dbo.Students', 'IsAutoGenerated') IS NULL
    BEGIN
      ALTER TABLE dbo.Students
      ADD IsAutoGenerated BIT NOT NULL
      CONSTRAINT DF_Students_IsAutoGenerated DEFAULT 0;
    END;

    IF EXISTS (
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.Students')
        AND name = 'Room_id'
        AND is_nullable = 0
    )
    BEGIN
      ALTER TABLE dbo.Students ALTER COLUMN Room_id INT NULL;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.Students')
        AND name = 'UQ_Students_Email'
    )
    BEGIN
      CREATE UNIQUE INDEX UQ_Students_Email
      ON dbo.Students (Email)
      WHERE Email IS NOT NULL;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.Students')
        AND name IN ('IX_Students_Room_id', 'IX_Student_Room_id')
    )
    BEGIN
      CREATE INDEX IX_Students_Room_id
      ON dbo.Students (Room_id);
    END;

    IF OBJECT_ID('dbo.Student_Roommate_Profile', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Student_Roommate_Profile (
        Roommate_Profile_id INT IDENTITY(1,1) NOT NULL,
        Student_id INT NOT NULL,
        Room_id INT NOT NULL,
        Roommate_Name NVARCHAR(120) NOT NULL,
        Created_At DATETIME NOT NULL CONSTRAINT DF_Student_Roommate_Profile_Created_At DEFAULT GETDATE(),
        CONSTRAINT PK_Student_Roommate_Profile PRIMARY KEY (Roommate_Profile_id),
        CONSTRAINT FK_Student_Roommate_Profile_Student FOREIGN KEY (Student_id)
          REFERENCES dbo.Students(Student_id) ON DELETE CASCADE,
        CONSTRAINT FK_Student_Roommate_Profile_Room FOREIGN KEY (Room_id)
          REFERENCES dbo.Room(Room_id)
      );

      CREATE INDEX IX_Student_Roommate_Profile_Student
      ON dbo.Student_Roommate_Profile (Student_id);
    END;
  `);

  studentsTableEnsured = true;
};

const ensurePublicRoomShowcaseTable = async () => {
  if (publicRoomShowcaseEnsured) {
    return;
  }

  await ensureStudentsTable();

  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID('dbo.Visitor', 'U') IS NOT NULL
    BEGIN
      DROP TABLE dbo.Visitor;
    END;

    IF OBJECT_ID('dbo.Room_Booking_Request', 'U') IS NOT NULL
    BEGIN
      DROP TABLE dbo.Room_Booking_Request;
    END;

    IF OBJECT_ID('dbo.Public_Room_Showcase', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Public_Room_Showcase (
        Showcase_Room_id INT NOT NULL,
        Category NVARCHAR(20) NOT NULL,
        Room_Name NVARCHAR(120) NOT NULL,
        Capacity_Label NVARCHAR(40) NOT NULL,
        Price_Min INT NOT NULL,
        Price_Max INT NOT NULL,
        Price_Unit NVARCHAR(50) NOT NULL CONSTRAINT DF_Public_Room_Showcase_Price_Unit DEFAULT '/ month',
        Description NVARCHAR(400) NOT NULL,
        Image_Url NVARCHAR(600) NOT NULL,
        Is_Available BIT NOT NULL CONSTRAINT DF_Public_Room_Showcase_Is_Available DEFAULT 1,
        Sort_Order INT NOT NULL CONSTRAINT DF_Public_Room_Showcase_Sort_Order DEFAULT 1,
        Created_At DATETIME NOT NULL CONSTRAINT DF_Public_Room_Showcase_Created_At DEFAULT GETDATE(),
        CONSTRAINT PK_Public_Room_Showcase PRIMARY KEY (Showcase_Room_id),
        CONSTRAINT CK_Public_Room_Showcase_Category CHECK (Category IN ('single', 'double', 'triple', 'shared')),
        CONSTRAINT CK_Public_Room_Showcase_Price CHECK (Price_Min > 0 AND Price_Max >= Price_Min)
      );

      CREATE INDEX IX_Public_Room_Showcase_Category_Sort
      ON dbo.Public_Room_Showcase (Category, Sort_Order);
    END;

    IF OBJECT_ID('dbo.Payment', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Payment (
        Payment_id INT NOT NULL,
        Student_id INT NOT NULL,
        Amount INT NOT NULL,
        Payment_Date DATE NOT NULL,
        [Month] NVARCHAR(20) NOT NULL,
        PaymentStatus NVARCHAR(20) NOT NULL
          CONSTRAINT DF_Payment_PaymentStatus DEFAULT 'Pending',
        VerifiedBy INT NULL,
        VerifiedAt DATETIME NULL,
        Verification_Status NVARCHAR(20) NOT NULL
          CONSTRAINT DF_Payment_Verification_Status DEFAULT 'Pending',
        Verified_By_Admin_Id INT NULL,
        Verified_At DATETIME NULL,
        Verification_Note NVARCHAR(250) NULL,
        CONSTRAINT PK_Payment PRIMARY KEY (Payment_id),
        CONSTRAINT CK_Payment_Amount CHECK (Amount > 0),
        CONSTRAINT CK_Payment_Verification_Status CHECK (Verification_Status IN ('Pending', 'Approved', 'Rejected')),
        CONSTRAINT FK_Payment_Student FOREIGN KEY (Student_id)
          REFERENCES dbo.Students(Student_id)
      );
    END;

    IF OBJECT_ID('dbo.Student_Room_Booking', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Student_Room_Booking (
        Booking_Transaction_id INT IDENTITY(1,1) NOT NULL,
        Student_id INT NOT NULL,
        Showcase_Room_id INT NOT NULL,
        Allocated_Room_id INT NULL,
        Payment_id INT NULL,
        Amount INT NOT NULL,
        Card_Brand NVARCHAR(30) NULL,
        Card_Last4 NVARCHAR(4) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Student_Room_Booking_Status DEFAULT 'Pending',
        Booked_At DATETIME NOT NULL CONSTRAINT DF_Student_Room_Booking_Booked_At DEFAULT GETDATE(),
        CONSTRAINT PK_Student_Room_Booking PRIMARY KEY (Booking_Transaction_id),
        CONSTRAINT FK_Student_Room_Booking_Student FOREIGN KEY (Student_id)
          REFERENCES dbo.Students(Student_id),
        CONSTRAINT FK_Student_Room_Booking_Showcase FOREIGN KEY (Showcase_Room_id)
          REFERENCES dbo.Public_Room_Showcase(Showcase_Room_id),
        CONSTRAINT FK_Student_Room_Booking_AllocatedRoom FOREIGN KEY (Allocated_Room_id)
          REFERENCES dbo.Room(Room_id),
        CONSTRAINT CK_Student_Room_Booking_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected'))
      );

      CREATE INDEX IX_Student_Room_Booking_Student
      ON dbo.Student_Room_Booking (Student_id, Booked_At DESC);
    END;

    IF COL_LENGTH('dbo.Student_Room_Booking', 'Allocated_Room_id') IS NOT NULL
    BEGIN
      ALTER TABLE dbo.Student_Room_Booking ALTER COLUMN Allocated_Room_id INT NULL;
    END;

    IF COL_LENGTH('dbo.Student_Room_Booking', 'Payment_id') IS NULL
    BEGIN
      ALTER TABLE dbo.Student_Room_Booking ADD Payment_id INT NULL;
    END;

    IF COL_LENGTH('dbo.Student_Room_Booking', 'Card_Brand') IS NULL
    BEGIN
      ALTER TABLE dbo.Student_Room_Booking ADD Card_Brand NVARCHAR(30) NULL;
    END;

    IF COL_LENGTH('dbo.Student_Room_Booking', 'Card_Last4') IS NULL
    BEGIN
      ALTER TABLE dbo.Student_Room_Booking ADD Card_Last4 NVARCHAR(4) NULL;
    END;

    IF COL_LENGTH('dbo.Student_Room_Booking', 'Status') IS NOT NULL
    BEGIN
      UPDATE dbo.Student_Room_Booking
      SET Status = 'Approved'
      WHERE Status = 'Completed';
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.check_constraints
      WHERE name = 'CK_Student_Room_Booking_Status'
        AND parent_object_id = OBJECT_ID('dbo.Student_Room_Booking')
    )
    BEGIN
      ALTER TABLE dbo.Student_Room_Booking
      ADD CONSTRAINT CK_Student_Room_Booking_Status
      CHECK (Status IN ('Pending', 'Approved', 'Rejected'));
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('dbo.Student_Room_Booking')
        AND name = 'IX_Student_Room_Booking_Student'
    )
    BEGIN
      CREATE INDEX IX_Student_Room_Booking_Student
      ON dbo.Student_Room_Booking (Student_id, Booked_At DESC);
    END;

    IF COL_LENGTH('dbo.Payment', 'Verification_Status') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD Verification_Status NVARCHAR(20) NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'Verified_By_Admin_Id') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD Verified_By_Admin_Id INT NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'Verified_At') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD Verified_At DATETIME NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'Verification_Note') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD Verification_Note NVARCHAR(250) NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'PaymentStatus') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD PaymentStatus NVARCHAR(20) NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'VerifiedBy') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD VerifiedBy INT NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'VerifiedAt') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD VerifiedAt DATETIME NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'Booking_Transaction_id') IS NULL
    BEGIN
      ALTER TABLE dbo.Payment ADD Booking_Transaction_id INT NULL;
    END;

    IF COL_LENGTH('dbo.Payment', 'Booking_Transaction_id') IS NOT NULL
    BEGIN
      EXEC sp_executesql N'
        UPDATE p
        SET Booking_Transaction_id = sb.Booking_Transaction_id
        FROM dbo.Payment p
        INNER JOIN dbo.Student_Room_Booking sb ON sb.Payment_id = p.Payment_id
        WHERE p.Booking_Transaction_id IS NULL;
      ';

      EXEC sp_executesql N'
        UPDATE sb
        SET Payment_id = p.Payment_id
        FROM dbo.Student_Room_Booking sb
        INNER JOIN dbo.Payment p ON p.Booking_Transaction_id = sb.Booking_Transaction_id
        WHERE sb.Payment_id IS NULL;
      ';
    END;

    ;WITH PendingPaymentApprovedBooking AS (
      SELECT
        sb.Booking_Transaction_id,
        sb.Student_id,
        sb.Allocated_Room_id
      FROM dbo.Student_Room_Booking sb
      LEFT JOIN dbo.Payment p ON p.Payment_id = sb.Payment_id
      WHERE sb.Status = 'Approved'
        AND sb.Allocated_Room_id IS NOT NULL
        AND COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Pending'
    )
    UPDATE sb
    SET Status = 'Pending',
        Allocated_Room_id = NULL
    FROM dbo.Student_Room_Booking sb
    INNER JOIN PendingPaymentApprovedBooking inconsistent
      ON inconsistent.Booking_Transaction_id = sb.Booking_Transaction_id;

    UPDATE s
    SET Room_id = NULL
    FROM dbo.Students s
    WHERE s.Room_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM dbo.Student_Room_Booking sb
        LEFT JOIN dbo.Payment p ON p.Payment_id = sb.Payment_id
        WHERE sb.Student_id = s.Student_id
          AND sb.Status = 'Pending'
          AND sb.Allocated_Room_id = s.Room_id
          AND COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Pending'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.Student_Room_Booking sb
        LEFT JOIN dbo.Payment p ON p.Payment_id = sb.Payment_id
        WHERE sb.Student_id = s.Student_id
          AND sb.Status = 'Approved'
          AND sb.Allocated_Room_id = s.Room_id
          AND COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Approved'
      );

    DECLARE @hasPaymentStatus BIT = CASE WHEN COL_LENGTH('dbo.Payment', 'PaymentStatus') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @hasVerificationStatus BIT = CASE WHEN COL_LENGTH('dbo.Payment', 'Verification_Status') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @hasVerifiedBy BIT = CASE WHEN COL_LENGTH('dbo.Payment', 'VerifiedBy') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @hasVerifiedByAdminId BIT = CASE WHEN COL_LENGTH('dbo.Payment', 'Verified_By_Admin_Id') IS NOT NULL THEN 1 ELSE 0 END;

    IF @hasPaymentStatus = 1
    BEGIN
      DECLARE @paymentStatusSql NVARCHAR(MAX) = N'UPDATE p SET PaymentStatus = CASE ';

      IF @hasPaymentStatus = 1
        SET @paymentStatusSql += N'WHEN p.PaymentStatus IN (''Pending'', ''Approved'', ''Rejected'') THEN p.PaymentStatus ';

      IF @hasPaymentStatus = 1
        SET @paymentStatusSql += N'WHEN p.PaymentStatus = ''Verified'' THEN ''Approved'' ';

      IF @hasVerificationStatus = 1
        SET @paymentStatusSql += N'WHEN p.Verification_Status IN (''Pending'', ''Approved'', ''Rejected'') THEN p.Verification_Status ';

      IF @hasVerificationStatus = 1
        SET @paymentStatusSql += N'WHEN p.Verification_Status = ''Verified'' THEN ''Approved'' ';

      SET @paymentStatusSql += N'WHEN EXISTS (
            SELECT 1
            FROM dbo.Student_Room_Booking sb
            WHERE sb.Payment_id = p.Payment_id
              AND sb.Status = ''Rejected''
          ) THEN ''Rejected'' ';
      SET @paymentStatusSql += N'WHEN EXISTS (
            SELECT 1
            FROM dbo.Student_Room_Booking sb
            WHERE sb.Payment_id = p.Payment_id
              AND sb.Status = ''Approved''
          ) THEN ''Approved'' ';
      SET @paymentStatusSql += N'ELSE ''Pending'' END FROM dbo.Payment p;';

      EXEC sp_executesql @paymentStatusSql;
      EXEC sp_executesql N'ALTER TABLE dbo.Payment ALTER COLUMN PaymentStatus NVARCHAR(20) NOT NULL;';
    END;

    IF @hasVerificationStatus = 1
    BEGIN
      DECLARE @verificationStatusSql NVARCHAR(MAX) = N'UPDATE p SET Verification_Status = CASE ';

      IF @hasPaymentStatus = 1
        SET @verificationStatusSql += N'WHEN p.PaymentStatus IN (''Pending'', ''Approved'', ''Rejected'') THEN p.PaymentStatus ';

      IF @hasPaymentStatus = 1
        SET @verificationStatusSql += N'WHEN p.PaymentStatus = ''Verified'' THEN ''Approved'' ';

      IF @hasVerificationStatus = 1
        SET @verificationStatusSql += N'WHEN p.Verification_Status IN (''Pending'', ''Approved'', ''Rejected'') THEN p.Verification_Status ';

      IF @hasVerificationStatus = 1
        SET @verificationStatusSql += N'WHEN p.Verification_Status = ''Verified'' THEN ''Approved'' ';

      SET @verificationStatusSql += N'WHEN EXISTS (
            SELECT 1
            FROM dbo.Student_Room_Booking sb
            WHERE sb.Payment_id = p.Payment_id
              AND sb.Status = ''Rejected''
          ) THEN ''Rejected'' ';
      SET @verificationStatusSql += N'WHEN EXISTS (
            SELECT 1
            FROM dbo.Student_Room_Booking sb
            WHERE sb.Payment_id = p.Payment_id
              AND sb.Status = ''Approved''
          ) THEN ''Approved'' ';
      SET @verificationStatusSql += N'ELSE ''Pending'' END FROM dbo.Payment p;';

      EXEC sp_executesql @verificationStatusSql;
      EXEC sp_executesql N'ALTER TABLE dbo.Payment ALTER COLUMN Verification_Status NVARCHAR(20) NOT NULL;';
    END;

    IF @hasPaymentStatus = 1
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Payment_PaymentStatus'
          AND parent_object_id = OBJECT_ID('dbo.Payment')
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Payment_PaymentStatus CHECK (PaymentStatus IN (''Pending'', ''Approved'', ''Rejected''));';
      END;

      IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Payment')
          AND name = 'DF_Payment_PaymentStatus'
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT DF_Payment_PaymentStatus DEFAULT ''Pending'' FOR PaymentStatus;';
      END;

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.Payment')
          AND name = 'IX_Payment_PaymentStatus'
      )
      BEGIN
        EXEC sp_executesql N'CREATE INDEX IX_Payment_PaymentStatus ON dbo.Payment (PaymentStatus, Payment_Date DESC, Payment_id DESC);';
      END;
    END;

    IF @hasVerificationStatus = 1
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE name = 'CK_Payment_Verification_Status'
          AND parent_object_id = OBJECT_ID('dbo.Payment')
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT CK_Payment_Verification_Status CHECK (Verification_Status IN (''Pending'', ''Approved'', ''Rejected''));';
      END;

      IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.Payment')
          AND name = 'DF_Payment_Verification_Status'
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT DF_Payment_Verification_Status DEFAULT ''Pending'' FOR Verification_Status;';
      END;

      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID('dbo.Payment')
          AND name = 'IX_Payment_Verification_Status'
      )
      BEGIN
        EXEC sp_executesql N'CREATE INDEX IX_Payment_Verification_Status ON dbo.Payment (Verification_Status, Payment_Date DESC, Payment_id DESC);';
      END;
    END;

    IF @hasVerifiedByAdminId = 1
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID('dbo.Payment')
          AND name = 'FK_Payment_Verified_By_Admin'
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT FK_Payment_Verified_By_Admin FOREIGN KEY (Verified_By_Admin_Id) REFERENCES dbo.Users(id);';
      END;
    END;

    IF @hasVerifiedBy = 1
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID('dbo.Payment')
          AND name = 'FK_Payment_VerifiedBy'
      )
      BEGIN
        EXEC sp_executesql N'ALTER TABLE dbo.Payment ADD CONSTRAINT FK_Payment_VerifiedBy FOREIGN KEY (VerifiedBy) REFERENCES dbo.Users(id);';
      END;
    END;
  `);

  const existingShowcaseRows = await queryOne(
    "SELECT COUNT(*) AS total FROM Public_Room_Showcase"
  );

  if (Number(existingShowcaseRows?.total || 0) === 0) {
    const seedRows = buildPublicRoomSeedRows();

    for (const room of seedRows) {
      await executeQuery(
        `
          INSERT INTO Public_Room_Showcase (
            Showcase_Room_id,
            Category,
            Room_Name,
            Capacity_Label,
            Price_Min,
            Price_Max,
            Price_Unit,
            Description,
            Image_Url,
            Is_Available,
            Sort_Order
          )
          VALUES (
            @id,
            @category,
            @roomName,
            @capacityLabel,
            @priceMin,
            @priceMax,
            @priceUnit,
            @description,
            @imageUrl,
            @isAvailable,
            @sortOrder
          )
        `,
        (request) =>
          request
            .input("id", sql.Int, room.id)
            .input("category", sql.NVarChar(20), room.category)
            .input("roomName", sql.NVarChar(120), room.title)
            .input("capacityLabel", sql.NVarChar(40), room.capacity)
            .input("priceMin", sql.Int, room.priceMin)
            .input("priceMax", sql.Int, room.priceMax)
            .input("priceUnit", sql.NVarChar(50), room.priceUnit)
            .input("description", sql.NVarChar(400), room.description)
            .input("imageUrl", sql.NVarChar(600), room.image)
            .input("isAvailable", sql.Bit, room.isAvailable ? 1 : 0)
            .input("sortOrder", sql.Int, room.sortOrder)
      );
    }
  }

  for (const patch of PUBLIC_ROOM_IMAGE_PATCHES) {
    await executeQuery(
      `
        UPDATE Public_Room_Showcase
        SET Image_Url = @imageUrl
        WHERE Room_Name = @roomName
      `,
      (request) =>
        request
          .input("roomName", sql.NVarChar(120), patch.title)
          .input("imageUrl", sql.NVarChar(600), patch.image)
    );
  }

  publicRoomShowcaseEnsured = true;
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

const ensureFixedSuperAdminAccount = async () => {
  await ensureUserColumns();

  const existingSuperAdmin = await queryOne(
    `
      SELECT
        id,
        passwordHash
      FROM Users
      WHERE email = @email
    `,
    (request) => request.input("email", sql.NVarChar(100), FIXED_SUPER_ADMIN_EMAIL)
  );

  if (!existingSuperAdmin) {
    await executeQuery(
      `
        INSERT INTO Users (email, fullName, Role, passwordHash)
        VALUES (@email, @fullName, 'SuperAdmin', @passwordHash)
      `,
      (request) =>
        request
          .input("email", sql.NVarChar(100), FIXED_SUPER_ADMIN_EMAIL)
          .input("fullName", sql.NVarChar(120), FIXED_SUPER_ADMIN_NAME)
          .input("passwordHash", sql.NVarChar(255), FIXED_SUPER_ADMIN_PASSWORD_HASH)
    );
    return;
  }

  const usesLegacyPasswordHash =
    normalizeString(existingSuperAdmin.passwordHash) === LEGACY_FIXED_SUPER_ADMIN_PASSWORD_HASH;

  await executeQuery(
    `
      UPDATE Users
      SET fullName = @fullName,
          Role = 'SuperAdmin'
          ${usesLegacyPasswordHash ? ", passwordHash = @passwordHash" : ""}
      WHERE email = @email
    `,
    (request) => {
      request
        .input("email", sql.NVarChar(100), FIXED_SUPER_ADMIN_EMAIL)
        .input("fullName", sql.NVarChar(120), FIXED_SUPER_ADMIN_NAME);

      if (usesLegacyPasswordHash) {
        request.input("passwordHash", sql.NVarChar(255), FIXED_SUPER_ADMIN_PASSWORD_HASH);
      }

      return request;
    }
  );
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

const randomInt = (min, max) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }

  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
};

const randomFromList = (values = []) =>
  values[Math.floor(Math.random() * Math.max(values.length, 1))] || "";

const buildRandomRoommateName = (index = 0) => {
  const first = randomFromList(ROOMMATE_NAME_PREFIXES);
  const last = randomFromList(ROOMMATE_NAME_SUFFIXES);
  return `${first} ${last} ${index + 1}`;
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
const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"];
const BOOKING_REQUEST_STATUSES = [...APPROVAL_STATUSES];
const PAYMENT_VERIFICATION_STATUSES = [...APPROVAL_STATUSES];
const normalizeApprovalStatus = (value) => {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "approved" || normalized === "verified" || normalized === "accepted") {
    return "Approved";
  }
  if (normalized === "rejected") {
    return "Rejected";
  }
  return "Pending";
};
const PUBLIC_ROOM_CATEGORIES = ["single", "double", "triple", "shared"];
const PUBLIC_ROOM_CATEGORY_LABELS = {
  single: "Single Room",
  double: "Double Room",
  triple: "Triple Room",
  shared: "Shared Room",
};
const ROOMMATE_NAME_PREFIXES = [
  "Ari",
  "Nira",
  "Sami",
  "Ray",
  "Lena",
  "Tariq",
  "Mila",
  "Zain",
  "Ira",
  "Nabil",
  "Rafi",
  "Noor",
];
const ROOMMATE_NAME_SUFFIXES = [
  "Rahman",
  "Khan",
  "Ahmed",
  "Chowdhury",
  "Islam",
  "Roy",
  "Hasan",
  "Karim",
  "Iqbal",
  "Akter",
  "Jamil",
  "Sarker",
];

const PUBLIC_ROOM_IMAGE_PATCHES = [
  {
    title: "Window View Single",
    image:
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Study Hub Triple",
    image:
      "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Campus Triple Zone",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Budget Shared Hall",
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
  },
];

const PUBLIC_ROOM_SHOWCASE_TEMPLATES = {
  single: [
    {
      title: "Solo Study Suite",
      capacity: "Capacity: 1 person",
      priceMin: 460,
      priceMax: 540,
      priceUnit: "/ month",
      description: "Quiet private room with a single bed, personal desk, and soft warm lighting.",
      image:
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Quiet Corner Single",
      capacity: "Capacity: 1 person",
      priceMin: 480,
      priceMax: 590,
      priceUnit: "/ month",
      description: "Minimalist private room designed for focused study and low-noise living.",
      image:
        "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Classic Solo Room",
      capacity: "Capacity: 1 person",
      priceMin: 430,
      priceMax: 500,
      priceUnit: "/ month",
      description: "Budget-friendly private stay with essential storage and comfortable bedding.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Premium Single Loft",
      capacity: "Capacity: 1 person",
      priceMin: 520,
      priceMax: 650,
      priceUnit: "/ month",
      description: "Spacious single room with upgraded interior finish and bright window corner.",
      image:
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Serene Study Pod",
      capacity: "Capacity: 1 person",
      priceMin: 450,
      priceMax: 530,
      priceUnit: "/ month",
      description: "Compact and calm room layout ideal for independent daily routines.",
      image:
        "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Window View Single",
      capacity: "Capacity: 1 person",
      priceMin: 500,
      priceMax: 620,
      priceUnit: "/ month",
      description: "Single occupancy room with city-view window, desk, and full-height wardrobe.",
      image:
        "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Focus Elite Single",
      capacity: "Capacity: 1 person",
      priceMin: 540,
      priceMax: 680,
      priceUnit: "/ month",
      description: "Premium one-person room for students who want privacy and an elevated setup.",
      image:
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  double: [
    {
      title: "Twin Comfort Room",
      capacity: "Capacity: 2 people",
      priceMin: 300,
      priceMax: 380,
      priceUnit: "/ person / month",
      description: "Two-bed shared room with separate desks and balanced movement space.",
      image:
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Partner Study Double",
      capacity: "Capacity: 2 people",
      priceMin: 330,
      priceMax: 420,
      priceUnit: "/ person / month",
      description: "Practical two-person setup for roommates with mixed study schedules.",
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Urban Twin Space",
      capacity: "Capacity: 2 people",
      priceMin: 340,
      priceMax: 430,
      priceUnit: "/ person / month",
      description: "Shared room with dual storage units and clean modern interior styling.",
      image:
        "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Courtyard Double",
      capacity: "Capacity: 2 people",
      priceMin: 315,
      priceMax: 395,
      priceUnit: "/ person / month",
      description: "Comfortable two-bed room with a shared wardrobe and long study desk.",
      image:
        "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Smart Twin Studio",
      capacity: "Capacity: 2 people",
      priceMin: 325,
      priceMax: 410,
      priceUnit: "/ person / month",
      description: "Efficiently arranged room with strong natural light and tidy storage.",
      image:
        "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Balanced Buddy Room",
      capacity: "Capacity: 2 people",
      priceMin: 305,
      priceMax: 390,
      priceUnit: "/ person / month",
      description: "A value-friendly double room with two beds and organized shared space.",
      image:
        "https://images.unsplash.com/photo-1486304873000-235643847519?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Premium Twin Suite",
      capacity: "Capacity: 2 people",
      priceMin: 360,
      priceMax: 460,
      priceUnit: "/ person / month",
      description: "Higher-end double room with polished finish and wider study area.",
      image:
        "https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  triple: [
    {
      title: "Trio Standard Room",
      capacity: "Capacity: 3 people",
      priceMin: 240,
      priceMax: 320,
      priceUnit: "/ person / month",
      description: "Three-bed room with grouped study setup and practical storage points.",
      image:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Group Plus Triple",
      capacity: "Capacity: 3 people",
      priceMin: 260,
      priceMax: 350,
      priceUnit: "/ person / month",
      description: "Social room category suited to students who enjoy active shared living.",
      image:
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Study Hub Triple",
      capacity: "Capacity: 3 people",
      priceMin: 255,
      priceMax: 340,
      priceUnit: "/ person / month",
      description: "Includes three desks, wall shelves, and comfortable shared floor area.",
      image:
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Budget Trio Stay",
      capacity: "Capacity: 3 people",
      priceMin: 220,
      priceMax: 300,
      priceUnit: "/ person / month",
      description: "Cost-friendly triple occupancy with essential furniture and cozy beds.",
      image:
        "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Campus Triple Zone",
      capacity: "Capacity: 3 people",
      priceMin: 250,
      priceMax: 335,
      priceUnit: "/ person / month",
      description: "Designed for collaborative routines with reliable shared utility space.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Bright Trio Corner",
      capacity: "Capacity: 3 people",
      priceMin: 265,
      priceMax: 355,
      priceUnit: "/ person / month",
      description: "Well-lit room with three beds and coordinated storage for daily comfort.",
      image:
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Premier Triple Room",
      capacity: "Capacity: 3 people",
      priceMin: 280,
      priceMax: 370,
      priceUnit: "/ person / month",
      description: "Enhanced triple room with upgraded furnishing and organized layout flow.",
      image:
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
    },
  ],
  shared: [
    {
      title: "Shared Hall Classic",
      capacity: "Capacity: 4+ people",
      priceMin: 170,
      priceMax: 250,
      priceUnit: "/ person / month",
      description: "Community-style room with multiple beds and practical shared storage racks.",
      image:
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Social Shared Wing",
      capacity: "Capacity: 4+ people",
      priceMin: 180,
      priceMax: 270,
      priceUnit: "/ person / month",
      description: "Great for residents who prefer social, affordable group accommodation.",
      image:
        "https://images.unsplash.com/photo-1521783593447-5702b9bfd267?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Economy Shared Zone",
      capacity: "Capacity: 4+ people",
      priceMin: 160,
      priceMax: 230,
      priceUnit: "/ person / month",
      description: "Large occupancy setup with essential comfort and shared utility areas.",
      image:
        "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Shared Plus Dorm",
      capacity: "Capacity: 4+ people",
      priceMin: 190,
      priceMax: 280,
      priceUnit: "/ person / month",
      description: "Improved dorm layout with better ventilation and flexible common storage.",
      image:
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Community Loft Shared",
      capacity: "Capacity: 4+ people",
      priceMin: 175,
      priceMax: 260,
      priceUnit: "/ person / month",
      description: "Loft-inspired shared room with multi-bed arrangement and central aisle.",
      image:
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Open Dorm Study Bay",
      capacity: "Capacity: 4+ people",
      priceMin: 185,
      priceMax: 275,
      priceUnit: "/ person / month",
      description: "Shared room with grouped desks, reading lights, and community atmosphere.",
      image:
        "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=1200&q=80",
    },
    {
      title: "Budget Shared Hall",
      capacity: "Capacity: 4+ people",
      priceMin: 155,
      priceMax: 220,
      priceUnit: "/ person / month",
      description: "Most affordable shared option with clean setup and daily essentials.",
      image:
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=80",
    },
  ],
};

const getRandomUnavailableIndexSet = (totalRooms) => {
  if (!Number.isInteger(totalRooms) || totalRooms <= 1) {
    return new Set();
  }

  const targetUnavailableCount = Math.floor(Math.random() * 3) + 1;
  const unavailableCount = Math.min(targetUnavailableCount, totalRooms - 1);
  const unavailableIndexes = new Set();

  while (unavailableIndexes.size < unavailableCount) {
    unavailableIndexes.add(Math.floor(Math.random() * totalRooms));
  }

  return unavailableIndexes;
};

const buildPublicRoomSeedRows = () => {
  const rows = [];
  let nextRoomId = 1;

  for (const category of PUBLIC_ROOM_CATEGORIES) {
    const templateRows = PUBLIC_ROOM_SHOWCASE_TEMPLATES[category] || [];
    const unavailableIndexes = getRandomUnavailableIndexSet(templateRows.length);

    templateRows.forEach((template, index) => {
      rows.push({
        id: nextRoomId,
        category,
        title: template.title,
        capacity: template.capacity,
        priceMin: template.priceMin,
        priceMax: template.priceMax,
        priceUnit: template.priceUnit,
        description: template.description,
        image: template.image,
        isAvailable: !unavailableIndexes.has(index),
        sortOrder: index + 1,
      });

      nextRoomId += 1;
    });
  }

  return rows;
};

const isAllowedValue = (value, allowedValues) => allowedValues.includes(value);

const studentSelectQuery = `
  SELECT
    s.Student_id AS id,
    s.Student_id AS student_id,
    s.Name AS name,
    s.Email AS email,
    s.PhoneNumber AS phone_number,
    s.Room_id AS room_id,
    r.Room_Number AS room_number,
    r.Type AS room_type,
    r.Capacity AS room_capacity,
    r.Current_Occupancy AS current_occupancy,
    hb.Block_Name AS block_name,
    s.Guardian_Contact AS guardian_contact,
    s.CreatedAt AS created_at,
    s.LastLogin AS last_login,
    (
      SELECT COUNT(*)
      FROM Payment p
      WHERE p.Student_id = s.Student_id
    ) AS payment_records,
    (
      SELECT ISNULL(SUM(p.Amount), 0)
      FROM Payment p
      WHERE p.Student_id = s.Student_id
    ) AS total_paid,
    CASE
      WHEN s.Room_id IS NULL THEN 'Pending Room Assignment'
      ELSE 'Active'
    END AS status
  FROM ${STUDENT_TABLE} s
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

const publicRoomShowcaseSelectQuery = `
  SELECT
    prs.Showcase_Room_id AS id,
    prs.Showcase_Room_id AS room_id,
    prs.Category AS category,
    prs.Room_Name AS title,
    prs.Capacity_Label AS capacity,
    prs.Price_Min AS price_min,
    prs.Price_Max AS price_max,
    prs.Price_Unit AS price_unit,
    CONCAT('$', prs.Price_Min, ' - $', prs.Price_Max, ' ', prs.Price_Unit) AS price_range,
    prs.Description AS description,
    prs.Image_Url AS image,
    prs.Is_Available AS is_available,
    CASE
      WHEN prs.Is_Available = 1 THEN 'Available'
      ELSE 'Unavailable'
    END AS availability_status,
    prs.Sort_Order AS sort_order
  FROM Public_Room_Showcase prs
`;

const studentRoomBookingSelectQuery = `
  SELECT
    sb.Booking_Transaction_id AS id,
    sb.Booking_Transaction_id AS booking_id,
    sb.Showcase_Room_id AS room_id,
    prs.Room_Name AS room_name,
    prs.Room_Name AS room_title,
    prs.Category AS room_category,
    CONCAT('$', prs.Price_Min, ' - $', prs.Price_Max, ' ', prs.Price_Unit) AS price_range,
    COALESCE(sb.Payment_id, p.Payment_id) AS payment_id,
    COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') AS payment_status,
    sb.Amount AS amount,
    sb.Card_Brand AS card_brand,
    sb.Card_Last4 AS card_last4,
    sb.Allocated_Room_id AS allocated_room_id,
    r.Room_Number AS allocated_room_number,
    hb.Block_Name AS allocated_block_name,
    sb.Booked_At AS requested_at,
    sb.Booked_At AS booked_at,
    sb.Status AS status,
    sb.Status AS booking_status,
    COALESCE(p.VerifiedAt, p.Verified_At) AS payment_verified_at,
    COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id) AS payment_verified_by_admin_id,
    CASE
      WHEN sb.Status = 'Approved'
           AND COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Approved'
        THEN 'Completed'
      WHEN sb.Status = 'Rejected'
           OR COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Rejected'
        THEN 'Rejected'
      WHEN sb.Status = 'Approved' THEN 'Awaiting Payment Verification'
      ELSE 'Pending'
    END AS workflow_status,
    s.Student_id AS student_id,
    s.Name AS student_name,
    s.Email AS student_email,
    s.PhoneNumber AS student_phone
  FROM Student_Room_Booking sb
  INNER JOIN Public_Room_Showcase prs ON prs.Showcase_Room_id = sb.Showcase_Room_id
  INNER JOIN ${STUDENT_TABLE} s ON s.Student_id = sb.Student_id
  LEFT JOIN Room r ON r.Room_id = sb.Allocated_Room_id
  LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
  OUTER APPLY (
    SELECT TOP 1
      p.Payment_id,
      p.PaymentStatus,
      p.Verification_Status,
      p.VerifiedBy,
      p.Verified_By_Admin_Id,
      p.VerifiedAt,
      p.Verified_At
    FROM Payment p
    WHERE p.Payment_id = sb.Payment_id
      OR p.Booking_Transaction_id = sb.Booking_Transaction_id
    ORDER BY
      CASE WHEN p.Payment_id = sb.Payment_id THEN 0 ELSE 1 END,
      p.Payment_Date DESC,
      p.Payment_id DESC
  ) p
`;

const blockSelectQuery = `
  SELECT
    hb.Block_id AS id,
    hb.Block_id AS block_id,
    hb.Block_Name AS block_name,
    hb.Total_Rooms AS total_rooms
  FROM Hostel_Block hb
`;

const paymentSelectQuery = `
  SELECT
    p.Payment_id AS id,
    p.Payment_id AS payment_id,
    COALESCE(sb.Booking_Transaction_id, p.Booking_Transaction_id) AS booking_id,
    p.Student_id AS student_id,
    s.Name AS student_name,
    s.Email AS student_email,
    p.Amount AS amount,
    p.Payment_Date AS payment_date,
    p.[Month] AS [month],
    LTRIM(RTRIM(COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending'))) AS payment_status,
    LTRIM(RTRIM(COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending'))) AS status,
    COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id) AS verified_by_id,
    ISNULL(u.fullName, u.email) AS verified_by_name,
    u.Role AS verified_by_role,
    CASE
      WHEN u.Role = 'SuperAdmin' THEN 'Verified by super admin'
      WHEN COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id) IS NOT NULL THEN 'Verified by admin'
      ELSE 'Pending verification'
    END AS verification_label,
    COALESCE(p.VerifiedAt, p.Verified_At) AS verified_at,
    p.Verification_Note AS verification_note,
    sb.Status AS booking_status,
    sb.Booked_At AS booking_requested_at,
    sb.Showcase_Room_id AS requested_room_id,
    prs.Room_Name AS room_title,
    prs.Category AS room_category,
    sb.Card_Brand AS card_brand,
    sb.Card_Last4 AS card_last4
  FROM Payment p
  LEFT JOIN ${STUDENT_TABLE} s ON s.Student_id = p.Student_id
  OUTER APPLY (
    SELECT TOP 1
      sb.Booking_Transaction_id,
      sb.Status,
      sb.Booked_At,
      sb.Showcase_Room_id,
      sb.Card_Brand,
      sb.Card_Last4
    FROM Student_Room_Booking sb
    WHERE sb.Payment_id = p.Payment_id
      OR (p.Booking_Transaction_id IS NOT NULL AND sb.Booking_Transaction_id = p.Booking_Transaction_id)
    ORDER BY
      CASE WHEN sb.Payment_id = p.Payment_id THEN 0 ELSE 1 END,
      sb.Booked_At DESC,
      sb.Booking_Transaction_id DESC
  ) sb
  LEFT JOIN Public_Room_Showcase prs ON prs.Showcase_Room_id = sb.Showcase_Room_id
  LEFT JOIN Users u ON u.id = COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id)
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

const bookingSelectQuery = `
  SELECT
    sb.Booking_Transaction_id AS id,
    sb.Booking_Transaction_id AS booking_transaction_id,
    sb.Student_id AS student_id,
    s.Name AS student_name,
    s.Email AS student_email,
    s.PhoneNumber AS student_phone,
    sb.Showcase_Room_id AS showcase_room_id,
    prs.Room_Name AS requested_room_name,
    prs.Category AS requested_room_category,
    sb.Allocated_Room_id AS allocated_room_id,
    r.Room_Number AS allocated_room_number,
    r.Type AS allocated_room_type,
    hb.Block_Name AS allocated_block_name,
    COALESCE(sb.Payment_id, p.Payment_id) AS payment_id,
    sb.Amount AS amount,
    sb.Card_Brand AS card_brand,
    sb.Card_Last4 AS card_last4,
    sb.Status AS status,
    LTRIM(RTRIM(COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending'))) AS payment_status,
    COALESCE(p.VerifiedAt, p.Verified_At) AS payment_verified_at,
    COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id) AS payment_verified_by_admin_id,
    ISNULL(u.fullName, u.email) AS payment_verified_by_name,
    p.Verification_Note AS payment_verification_note,
    CASE
      WHEN sb.Status = 'Approved'
           AND COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Approved'
        THEN 'Completed'
      WHEN sb.Status = 'Rejected'
           OR COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Rejected'
        THEN 'Rejected'
      WHEN sb.Status = 'Approved' THEN 'Awaiting Payment Verification'
      ELSE 'Pending'
    END AS workflow_status,
    sb.Booked_At AS booked_at,
    p.Payment_Date AS payment_date,
    p.[Month] AS payment_month
  FROM Student_Room_Booking sb
  LEFT JOIN ${STUDENT_TABLE} s ON s.Student_id = sb.Student_id
  LEFT JOIN Public_Room_Showcase prs ON prs.Showcase_Room_id = sb.Showcase_Room_id
  LEFT JOIN Room r ON r.Room_id = sb.Allocated_Room_id
  LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
  OUTER APPLY (
    SELECT TOP 1
      p.Payment_id,
      p.PaymentStatus,
      p.Verification_Status,
      p.VerifiedAt,
      p.Verified_At,
      p.VerifiedBy,
      p.Verified_By_Admin_Id,
      p.Verification_Note,
      p.Payment_Date,
      p.[Month]
    FROM Payment p
    WHERE p.Payment_id = sb.Payment_id
      OR p.Booking_Transaction_id = sb.Booking_Transaction_id
    ORDER BY
      CASE WHEN p.Payment_id = sb.Payment_id THEN 0 ELSE 1 END,
      p.Payment_Date DESC,
      p.Payment_id DESC
  ) p
  LEFT JOIN Users u ON u.id = COALESCE(p.VerifiedBy, p.Verified_By_Admin_Id)
`;

const getStudentById = (studentId) =>
  queryOne(`${studentSelectQuery} WHERE s.Student_id = @id`, (request) =>
    request.input("id", sql.Int, studentId)
  );

const getRoomById = (roomId) =>
  queryOne(`${roomSelectQuery} WHERE r.Room_id = @id`, (request) =>
    request.input("id", sql.Int, roomId)
  );

const getPublicRoomById = (roomId) =>
  queryOne(`${publicRoomShowcaseSelectQuery} WHERE prs.Showcase_Room_id = @id`, (request) =>
    request.input("id", sql.Int, roomId)
  );

const getBlockById = (blockId) =>
  queryOne(`${blockSelectQuery} WHERE hb.Block_id = @id`, (request) =>
    request.input("id", sql.Int, blockId)
  );

const getPaymentById = (paymentId) =>
  queryOne(`${paymentSelectQuery} WHERE p.Payment_id = @id`, (request) =>
    request.input("id", sql.Int, paymentId)
  );

const getBookingById = (bookingId) =>
  queryOne(`${bookingSelectQuery} WHERE sb.Booking_Transaction_id = @id`, (request) =>
    request.input("id", sql.Int, bookingId)
  );

const getBookingByPaymentId = (paymentId) =>
  queryOne(
    `
      ${bookingSelectQuery}
      WHERE sb.Payment_id = @paymentId
         OR sb.Booking_Transaction_id = (
              SELECT TOP 1 Booking_Transaction_id
              FROM Payment
              WHERE Payment_id = @paymentId
            )
      ORDER BY sb.Booked_At DESC, sb.Booking_Transaction_id DESC
    `,
    (request) => request.input("paymentId", sql.Int, paymentId)
  );

const getStudentBookingsByStudentId = (studentId) =>
  queryRows(
    `${bookingSelectQuery} WHERE sb.Student_id = @studentId ORDER BY sb.Booked_At DESC, sb.Booking_Transaction_id DESC`,
    (request) => request.input("studentId", sql.Int, studentId)
  );

const getMessDayById = (day) =>
  queryOne(`${messSelectQuery} HAVING [Day] = @day`, (request) =>
    request.input("day", sql.NVarChar(20), day)
  );

const getRoommateProfilesByStudentId = (studentId) =>
  queryRows(
    `
      SELECT
        Roommate_Profile_id AS id,
        Roommate_Name AS name,
        Room_id AS room_id,
        Created_At AS created_at
      FROM Student_Roommate_Profile
      WHERE Student_id = @studentId
      ORDER BY Roommate_Profile_id ASC
    `,
    (request) => request.input("studentId", sql.Int, studentId)
  );

const reseedRoommatesForStudent = async (studentId, roomId) => {
  if (!studentId) {
    return [];
  }

  await executeQuery(
    `
      DELETE FROM Student_Roommate_Profile
      WHERE Student_id = @studentId
    `,
    (request) => request.input("studentId", sql.Int, studentId)
  );

  if (!roomId) {
    return [];
  }

  const room = await queryOne(
    `
      SELECT
        Room_id AS room_id,
        Capacity AS capacity
      FROM Room
      WHERE Room_id = @roomId
    `,
    (request) => request.input("roomId", sql.Int, roomId)
  );

  const capacity = Number(room?.capacity || 0);

  if (capacity <= 1) {
    return [];
  }

  const roommateCount = randomInt(1, Math.max(capacity - 1, 1));

  for (let index = 0; index < roommateCount; index += 1) {
    await executeQuery(
      `
        INSERT INTO Student_Roommate_Profile (Student_id, Room_id, Roommate_Name)
        VALUES (@studentId, @roomId, @roommateName)
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("roomId", sql.Int, roomId)
          .input("roommateName", sql.NVarChar(120), buildRandomRoommateName(index))
    );
  }

  return getRoommateProfilesByStudentId(studentId);
};

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
          FROM ${STUDENT_TABLE} s
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
    `SELECT COUNT(*) AS total FROM ${STUDENT_TABLE} WHERE Room_id = @roomId`,
    (request) => request.input("roomId", sql.Int, roomId)
  );

  return Number(row?.total || 0);
};

const getPreferredAvailableRoomForCategory = async (category) => {
  const normalizedCategory = normalizeString(category).toLowerCase();
  const capacityRuleByCategory = {
    single: { operator: "=", value: 1 },
    double: { operator: "=", value: 2 },
    triple: { operator: "=", value: 3 },
    shared: { operator: ">=", value: 4 },
  };
  const keywordByCategory = {
    single: "%single%",
    double: "%double%",
    triple: "%triple%",
    shared: "%shared%",
  };
  const capacityRule = capacityRuleByCategory[normalizedCategory];
  const keywordPattern = keywordByCategory[normalizedCategory];

  if (capacityRule) {
    const roomByCapacity = await queryOne(
      `
        SELECT TOP 1
          r.Room_id AS room_id,
          r.Room_Number AS room_number,
          r.Type AS room_type,
          r.Capacity AS capacity,
          r.Current_Occupancy AS current_occupancy,
          hb.Block_Name AS block_name
        FROM Room r
        LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
        WHERE r.Current_Occupancy < r.Capacity
          AND r.Capacity ${capacityRule.operator} @capacity
        ORDER BY r.Current_Occupancy ASC, r.Capacity ASC, r.Room_Number ASC
      `,
      (request) => request.input("capacity", sql.Int, capacityRule.value)
    );

    if (roomByCapacity) {
      return roomByCapacity;
    }
  }

  if (keywordPattern) {
    const roomByType = await queryOne(
      `
        SELECT TOP 1
          r.Room_id AS room_id,
          r.Room_Number AS room_number,
          r.Type AS room_type,
          r.Capacity AS capacity,
          r.Current_Occupancy AS current_occupancy,
          hb.Block_Name AS block_name
        FROM Room r
        LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
        WHERE r.Current_Occupancy < r.Capacity
          AND LOWER(ISNULL(r.Type, '')) LIKE @typePattern
        ORDER BY r.Current_Occupancy ASC, r.Capacity ASC, r.Room_Number ASC
      `,
      (request) => request.input("typePattern", sql.NVarChar(40), keywordPattern)
    );

    if (roomByType) {
      return roomByType;
    }
  }

  return queryOne(
    `
      SELECT TOP 1
        r.Room_id AS room_id,
        r.Room_Number AS room_number,
        r.Type AS room_type,
        r.Capacity AS capacity,
        r.Current_Occupancy AS current_occupancy,
        hb.Block_Name AS block_name
      FROM Room r
      LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
      WHERE r.Current_Occupancy < r.Capacity
      ORDER BY r.Current_Occupancy ASC, r.Capacity ASC, r.Room_Number ASC
    `
  );
};

const ensureDefaultRoomInventory = async () => {
  const existingRoomCount = await queryOne("SELECT COUNT(*) AS total FROM Room");

  if (Number(existingRoomCount?.total || 0) > 0) {
    return;
  }

  const existingBlocks = await queryRows(
    "SELECT TOP 2 Block_id AS block_id FROM Hostel_Block ORDER BY Block_id"
  );
  const blockIds = existingBlocks
    .map((block) => parsePositiveInt(block?.block_id))
    .filter(Boolean);

  while (blockIds.length < 2) {
    const blockId = await getNextId("Hostel_Block", "Block_id");
    const blockName = blockIds.length === 0 ? "Auto Allocation Block A" : "Auto Allocation Block B";

    await executeQuery(
      `
        INSERT INTO Hostel_Block (Block_id, Block_Name, Total_Rooms)
        VALUES (@blockId, @blockName, 0)
      `,
      (request) =>
        request
          .input("blockId", sql.Int, blockId)
          .input("blockName", sql.NVarChar(100), blockName)
    );

    blockIds.push(blockId);
  }

  const roomTemplates = [
    ...Array.from({ length: 6 }, (_, index) => ({
      roomNumber: `S-${101 + index}`,
      capacity: 1,
      type: "Single",
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      roomNumber: `D-${201 + index}`,
      capacity: 2,
      type: "Double",
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      roomNumber: `T-${301 + index}`,
      capacity: 3,
      type: "Triple",
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      roomNumber: `SH-${401 + index}`,
      capacity: 6,
      type: "Shared",
    })),
  ];

  let nextRoomId = await getNextId("Room", "Room_id");

  for (let index = 0; index < roomTemplates.length; index += 1) {
    const template = roomTemplates[index];
    const targetBlockId = blockIds[index % blockIds.length];

    await executeQuery(
      `
        INSERT INTO Room (Room_id, Room_Number, Capacity, Current_Occupancy, Type, Hostel_Block)
        VALUES (@roomId, @roomNumber, @capacity, 0, @type, @hostelBlockId)
      `,
      (request) =>
        request
          .input("roomId", sql.Int, nextRoomId)
          .input("roomNumber", sql.NVarChar(20), template.roomNumber)
          .input("capacity", sql.Int, template.capacity)
          .input("type", sql.NVarChar(20), template.type)
          .input("hostelBlockId", sql.Int, targetBlockId)
    );

    nextRoomId += 1;
  }

  for (const blockId of blockIds) {
    const blockRoomTotal = await queryOne(
      "SELECT COUNT(*) AS total FROM Room WHERE Hostel_Block = @blockId",
      (request) => request.input("blockId", sql.Int, blockId)
    );

    await executeQuery(
      `
        UPDATE Hostel_Block
        SET Total_Rooms = @totalRooms
        WHERE Block_id = @blockId
      `,
      (request) =>
        request
          .input("blockId", sql.Int, blockId)
          .input("totalRooms", sql.Int, Number(blockRoomTotal?.total || 0))
    );
  }
};

const shuffleItems = (items = []) => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
};

const getAvailablePhysicalRoomCountForCategory = async (category) => {
  const normalizedCategory = normalizeString(category).toLowerCase();
  const categoryRuleByName = {
    single: { operator: "=", capacity: 1, typePattern: "%single%" },
    double: { operator: "=", capacity: 2, typePattern: "%double%" },
    triple: { operator: "=", capacity: 3, typePattern: "%triple%" },
    shared: { operator: ">=", capacity: 4, typePattern: "%shared%" },
  };
  const rule = categoryRuleByName[normalizedCategory];

  if (!rule) {
    return 0;
  }

  const row = await queryOne(
    `
      SELECT COUNT(*) AS total
      FROM Room r
      WHERE r.Current_Occupancy < r.Capacity
        AND (
          r.Capacity ${rule.operator} @capacity
          OR LOWER(ISNULL(r.Type, '')) LIKE @typePattern
        )
    `,
    (request) =>
      request
        .input("capacity", sql.Int, rule.capacity)
        .input("typePattern", sql.NVarChar(40), rule.typePattern)
  );

  return Number(row?.total || 0);
};

const refreshPublicRoomAvailability = async ({ force = false } = {}) => {
  await ensurePublicRoomShowcaseTable();

  const now = Date.now();

  if (
    !force &&
    publicRoomAvailabilityLastRefreshedAt &&
    now - publicRoomAvailabilityLastRefreshedAt < PUBLIC_ROOM_AVAILABILITY_REFRESH_MS
  ) {
    return;
  }

  const showcaseRows = await queryRows(
    `
      SELECT
        Showcase_Room_id AS room_id,
        Category AS category
      FROM Public_Room_Showcase
      ORDER BY Sort_Order, Showcase_Room_id
    `
  );

  if (showcaseRows.length === 0) {
    publicRoomAvailabilityLastRefreshedAt = now;
    return;
  }

  const rowsByCategory = showcaseRows.reduce((accumulator, row) => {
    const category = normalizeString(row.category).toLowerCase();

    if (!accumulator[category]) {
      accumulator[category] = [];
    }

    accumulator[category].push(row);
    return accumulator;
  }, {});

  for (const category of PUBLIC_ROOM_CATEGORIES) {
    const categoryRows = rowsByCategory[category] || [];

    if (categoryRows.length === 0) {
      continue;
    }

    const availablePhysicalRooms = await getAvailablePhysicalRoomCountForCategory(category);
    const maxVisibleAvailableCards = Math.min(categoryRows.length, availablePhysicalRooms);
    const targetAvailableCards =
      maxVisibleAvailableCards > 0
        ? Math.floor(Math.random() * maxVisibleAvailableCards) + 1
        : 0;
    const randomizedRoomIds = shuffleItems(categoryRows.map((row) => row.room_id));
    const visibleAvailableRoomIds = new Set(randomizedRoomIds.slice(0, targetAvailableCards));

    for (const row of categoryRows) {
      const isAvailable = visibleAvailableRoomIds.has(row.room_id) ? 1 : 0;

      await executeQuery(
        `
          UPDATE Public_Room_Showcase
          SET Is_Available = @isAvailable
          WHERE Showcase_Room_id = @roomId
        `,
        (request) =>
          request
            .input("roomId", sql.Int, row.room_id)
            .input("isAvailable", sql.Bit, isAvailable)
      );
    }
  }

  publicRoomAvailabilityLastRefreshedAt = now;
};

const startPublicRoomAvailabilityRefreshLoop = () => {
  if (publicRoomAvailabilityRefreshTimer) {
    return;
  }

  publicRoomAvailabilityRefreshTimer = setInterval(() => {
    refreshPublicRoomAvailability({ force: true }).catch((error) => {
      console.error("Public room availability refresh failed:", error.message);
    });
  }, PUBLIC_ROOM_AVAILABILITY_REFRESH_MS);

  if (typeof publicRoomAvailabilityRefreshTimer.unref === "function") {
    publicRoomAvailabilityRefreshTimer.unref();
  }
};

const syncRoomOccupancy = async (roomIds = []) => {
  const uniqueRoomIds = [...new Set(roomIds.filter(Boolean))];

  for (const roomId of uniqueRoomIds) {
    await executeQuery(
      `
        UPDATE Room
        SET Current_Occupancy = (
          SELECT COUNT(*)
          FROM ${STUDENT_TABLE}
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
const getStudentName = (student) => normalizeString(student.Name || student.name);
const getAdminRole = (user) => {
  const normalizedEmail = normalizeString(user.email).toLowerCase();
  if (normalizedEmail === FIXED_SUPER_ADMIN_EMAIL) {
    return "SuperAdmin";
  }

  const role = normalizeString(user.Role ?? user.role);
  return role === "SuperAdmin" ? "SuperAdmin" : "Admin";
};

const hashResetCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

const generateResetCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const getClientOrigin = () =>
  normalizeString(process.env.CLIENT_ORIGIN) || "http://localhost:5173";

const getNormalizedSmtpService = () =>
  normalizeString(process.env.SMTP_SERVICE);

const getNormalizedSmtpHost = () =>
  normalizeString(process.env.SMTP_HOST);

const getNormalizedSmtpUser = () =>
  normalizeString(process.env.SMTP_USER);

const getNormalizedSmtpPassword = () => {
  const password = String(process.env.SMTP_PASS || "").trim();

  if (!password) {
    return "";
  }

  const service = getNormalizedSmtpService().toLowerCase();
  const host = getNormalizedSmtpHost().toLowerCase();
  const isGoogleMailProvider =
    service === "gmail" ||
    host.includes("gmail.com") ||
    host.includes("googlemail.com");

  return isGoogleMailProvider ? password.replace(/\s+/g, "") : password;
};

const createMailTransport = () => {
  const service = getNormalizedSmtpService();
  const host = getNormalizedSmtpHost();
  const user = getNormalizedSmtpUser();
  const pass = getNormalizedSmtpPassword();

  if (service && user && pass) {
    return nodemailer.createTransport({
      service,
      auth: {
        user,
        pass,
      },
    });
  }

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
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

  try {
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
  } catch (error) {
    const failureReason = error?.message || "SMTP delivery failed";
    console.error(`Password reset email delivery failed for ${email}: ${failureReason}`);

    return {
      delivered: false,
      previewOnly: true,
      failureReason,
    };
  }

  return {
    delivered: true,
    previewOnly: false,
  };
};

const sendAdminInviteEmail = async ({ email, token }) => {
  const transport = createMailTransport();
  const registrationUrl = `${getClientOrigin()}/admin/register?token=${token}`;

  if (!transport) {
    return {
      delivered: false,
      previewOnly: true,
      registrationUrl,
    };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: "You're invited to join HostelMS as an admin",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
          <h2 style="margin-bottom: 12px; color: #1E3A5F;">Admin invitation</h2>
          <p style="color: #334155; line-height: 1.6;">
            A Super Admin invited you to create a HostelMS admin account.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${registrationUrl}"
              style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #1D4ED8; color: #FFFFFF; text-decoration: none; font-weight: 700;"
            >
              Complete Admin Registration
            </a>
          </p>
          <p style="color: #475569; line-height: 1.6; word-break: break-all;">
            If the button does not work, use this link:<br />${registrationUrl}
          </p>
        </div>
      `,
    });
  } catch (error) {
    const failureReason = error?.message || "SMTP delivery failed";
    console.error(`Admin invite email delivery failed for ${email}: ${failureReason}`);

    return {
      delivered: false,
      previewOnly: true,
      registrationUrl,
      failureReason,
    };
  }

  return {
    delivered: true,
    previewOnly: false,
    registrationUrl,
  };
};

const buildAuthPayload = (user) => {
  const normalizedUser = {
    id: user.id,
    email: user.email,
    name: getUserName(user),
    phoneNumber: user.phoneNumber || null,
    role: getAdminRole(user),
  };

  const token = jwt.sign(
    { id: normalizedUser.id, email: normalizedUser.email, role: normalizedUser.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  return { token, user: normalizedUser };
};

const buildStudentAuthPayload = (student) => {
  const normalizedStudent = {
    id: student.Student_id ?? student.student_id ?? student.id,
    email: student.Email ?? student.email ?? null,
    name: getStudentName(student),
    phoneNumber: student.PhoneNumber ?? student.phoneNumber ?? null,
    guardianContact:
      student.Guardian_Contact ??
      student.guardian_contact ??
      student.guardianContact ??
      null,
    roomId: student.Room_id ?? student.room_id ?? null,
    role: "Student",
  };

  const token = jwt.sign(
    {
      id: normalizedStudent.id,
      email: normalizedStudent.email,
      role: normalizedStudent.role,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  return { token, user: normalizedStudent };
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

const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRole = req.user?.role;
    const userEmail = normalizeString(req.user?.email).toLowerCase();
    const hasAccess =
      allowedRoles.includes(userRole) ||
      (userRole === "SuperAdmin" && allowedRoles.includes("Admin")) ||
      (userEmail === FIXED_SUPER_ADMIN_EMAIL && allowedRoles.includes("SuperAdmin"));

    if (!hasAccess) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhoneNumber = (phoneNumber) => /^\+?[\d\s()-]{7,20}$/.test(phoneNumber);

const registerUser = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const inviteToken = String(req.body.token || "").trim();

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters long." });
    return;
  }

  await ensureUserColumns();
  await ensureAdminInvitationsTable();

  const pool = await getPool();
  const existingUser = await queryOne(
    "SELECT id FROM Users WHERE email = @email",
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (existingUser) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  if (!inviteToken) {
    res.status(400).json({ message: "A valid admin invitation token is required." });
    return;
  }

  const invitation = await queryOne(
    `
      SELECT TOP 1 Id, Email, Token, IsUsed
      FROM AdminInvitations
      WHERE Token = @token
        AND Email = @email
    `,
    (request) =>
      request
        .input("token", sql.NVarChar(128), inviteToken)
        .input("email", sql.NVarChar(100), email)
  );

  if (!invitation || invitation.IsUsed) {
    res.status(400).json({ message: "This admin invitation is invalid or has already been used." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = getDisplayName(email); 
  const insertResult = await pool
    .request()
    .input("email", sql.NVarChar, email)
    .input("passwordHash", sql.NVarChar, passwordHash)
    .input("fullName", sql.NVarChar(120), fullName)
    .input("role", sql.NVarChar(20), "Admin")
    .query(`
      INSERT INTO Users (email, passwordHash, fullName, Role)
      OUTPUT INSERTED.id, INSERTED.email, INSERTED.fullName, INSERTED.phoneNumber, INSERTED.Role AS role
      VALUES (@email, @passwordHash, @fullName, @role);
    `);

  const createdUser = insertResult.recordset[0];
  const { token: authToken, user } = buildAuthPayload(createdUser);

  await pool
    .request()
    .input("id", sql.Int, createdUser.id)
    .input("token", sql.NVarChar(500), authToken)
    .query(`
      UPDATE Users
      SET jwtToken = @token, lastLogin = GETDATE()
      WHERE id = @id;
    `);

  await pool
    .request()
    .input("id", sql.Int, invitation.Id)
    .query(`
      UPDATE AdminInvitations
      SET IsUsed = 1
      WHERE Id = @id;
    `);

  res.status(201).json({
    message: "Registration successful.",
    token: authToken,
    user,
  });
};

const loginUser = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!validateEmail(email) || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  await ensureUserColumns();
  await ensureFixedSuperAdminAccount();

  const pool = await getPool();
  const userRecord = await queryOne(
    `
      SELECT
        id,
        email,
        fullName,
        phoneNumber,
        Role AS role,
        passwordHash
      FROM Users
      WHERE email = @email
    `,
    (request) => request.input("email", sql.NVarChar, email)
  );

  if (!userRecord) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, userRecord.passwordHash);

  if (!passwordMatches) {
    res.status(401).json({ message: "Invalid password." });
    return;
  }

  const resolvedRole = getAdminRole(userRecord);
  const user = {
    id: userRecord.id,
    email: userRecord.email,
    name: getUserName(userRecord),
    phoneNumber: userRecord.phoneNumber || null,
    role: resolvedRole,
  };
  const token = jwt.sign(
    { id: user.id, email: user.email, role: resolvedRole },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

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
    deliveryError: emailResult.delivered ? undefined : emailResult.failureReason,
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
      SELECT id, email, fullName, phoneNumber, lastLogin, Role AS role
      FROM Users
      WHERE id = @id
    `,
    (request) => request.input("id", sql.Int, req.user.id)
  );

  if (!currentUser) {
    res.status(404).json({ message: "User not found." });
    return;
  }

  res.json({
    id: currentUser.id,
    email: currentUser.email,
    name: getUserName(currentUser),
    phoneNumber: currentUser.phoneNumber || null,
    role: getAdminRole(currentUser),
    lastLogin: currentUser.lastLogin,
  });
};

const updateProfile = async (req, res) => {
  await ensureUserColumns();

  const fullName = normalizeString(req.body.name);
  const phoneNumber = normalizeNullableString(req.body.phoneNumber);

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

  const updatedUser = await queryOne(
    `
      SELECT id, email, fullName, phoneNumber, lastLogin, Role AS role
      FROM Users
      WHERE id = @id
    `,
    (request) => request.input("id", sql.Int, req.user.id)
  );

  res.json({
    id: updatedUser.id,
    email: updatedUser.email,
    name: getUserName(updatedUser),
    phoneNumber: updatedUser.phoneNumber || null,
    role: getAdminRole(updatedUser),
    lastLogin: updatedUser.lastLogin,
    message: "Profile updated successfully.",
  });
};

const inviteAdmin = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  await ensureUserColumns();
  await ensureAdminInvitationsTable();

  const existingUser = await queryOne(
    "SELECT id FROM Users WHERE email = @email",
    (request) => request.input("email", sql.NVarChar(100), email)
  );

  if (existingUser) {
    res.status(409).json({ message: "An admin account with this email already exists." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const pool = await getPool();

  await pool
    .request()
    .input("email", sql.NVarChar(100), email)
    .input("token", sql.NVarChar(128), token)
    .query(`
      INSERT INTO AdminInvitations (Email, Token)
      VALUES (@email, @token);
    `);

  const emailResult = await sendAdminInviteEmail({ email, token });

  res.status(201).json({
    message: emailResult.delivered
      ? "Admin invitation sent successfully."
      : "Invitation created, but email delivery failed. Use the registration link below.",
    email,
    invitationSent: emailResult.delivered,
    registrationUrl: emailResult.previewOnly ? emailResult.registrationUrl : undefined,
    deliveryError: emailResult.delivered ? undefined : emailResult.failureReason,
  });
};

const getStudentAuthProfileById = (studentId) =>
  queryOne(
    `
      SELECT
        s.Student_id AS id,
        s.Student_id AS student_id,
        s.Name AS name,
        s.Email AS email,
        s.PhoneNumber AS phone_number,
        s.Guardian_Contact AS guardian_contact,
        s.Room_id AS room_id,
        s.LastLogin AS last_login,
        r.Room_Number AS room_number,
        r.Type AS room_type,
        r.Capacity AS room_capacity,
        r.Current_Occupancy AS current_occupancy,
        hb.Block_Name AS block_name
      FROM ${STUDENT_TABLE} s
      LEFT JOIN Room r ON r.Room_id = s.Room_id
      LEFT JOIN Hostel_Block hb ON hb.Block_id = r.Hostel_Block
      WHERE s.Student_id = @studentId
    `,
    (request) => request.input("studentId", sql.Int, studentId)
  );

const registerStudent = async (req, res) => {
  const name = normalizeString(req.body.name);
  const email = String(req.body.email || "").trim().toLowerCase();
  const phoneNumber = normalizeNullableString(req.body.phoneNumber);
  const guardianContact = normalizeNullableString(
    req.body.guardianContact ?? req.body.guardian_contact
  );
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || req.body.password_confirmation || "");
  const rawRoomId = req.body.room_id ?? req.body.roomId;
  const roomId =
    rawRoomId === null || rawRoomId === undefined || rawRoomId === ""
      ? null
      : parsePositiveInt(rawRoomId);

  if (!name) {
    res.status(400).json({ message: "Student name is required." });
    return;
  }

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ message: "Please enter a valid phone number." });
    return;
  }

  if (rawRoomId !== null && rawRoomId !== undefined && rawRoomId !== "" && !roomId) {
    res.status(400).json({ message: "Please choose a valid room." });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters long." });
    return;
  }

  if (confirmPassword && password !== confirmPassword) {
    res.status(400).json({ message: "Passwords do not match." });
    return;
  }

  await ensureStudentsTable();

  const pool = await getPool();
  const existingStudent = await queryOne(
    `SELECT Student_id AS student_id FROM ${STUDENT_TABLE} WHERE Email = @email`,
    (request) => request.input("email", sql.NVarChar(100), email)
  );

  if (existingStudent) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  if (roomId) {
    const roomAvailability = await getRoomAvailability(roomId);

    if (!roomAvailability) {
      res.status(400).json({ message: "The selected room does not exist." });
      return;
    }

    if (Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)) {
      res.status(400).json({ message: "The selected room is already full." });
      return;
    }
  }

  const studentId = await getNextId(STUDENT_TABLE, "Student_id");
  const passwordHash = await bcrypt.hash(password, 10);

  const insertResult = await pool
    .request()
    .input("studentId", sql.Int, studentId)
    .input("name", sql.NVarChar(100), name)
    .input("email", sql.NVarChar(100), email)
    .input("phoneNumber", sql.NVarChar(30), phoneNumber)
    .input("roomId", sql.Int, roomId)
    .input("guardianContact", sql.NVarChar(20), guardianContact)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query(`
      INSERT INTO ${STUDENT_TABLE} (
        Student_id,
        Name,
        Email,
        PhoneNumber,
        Room_id,
        Guardian_Contact,
        PasswordHash
      )
      OUTPUT
        INSERTED.Student_id,
        INSERTED.Name,
        INSERTED.Email,
        INSERTED.PhoneNumber,
        INSERTED.Room_id,
        INSERTED.Guardian_Contact
      VALUES (
        @studentId,
        @name,
        @email,
        @phoneNumber,
        @roomId,
        @guardianContact,
        @passwordHash
      );
    `);

  const createdStudent = insertResult.recordset[0];
  const { token, user } = buildStudentAuthPayload(createdStudent);

  await pool
    .request()
    .input("studentId", sql.Int, studentId)
    .input("token", sql.NVarChar(500), token)
    .query(`
      UPDATE ${STUDENT_TABLE}
      SET JwtToken = @token,
          LastLogin = GETDATE()
      WHERE Student_id = @studentId;
    `);

  if (roomId) {
    await reseedRoommatesForStudent(studentId, roomId);
    await syncRoomOccupancy([roomId]);
  }

  res.status(201).json({
    message: "Student registration successful.",
    token,
    user,
  });
};

const loginStudent = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!validateEmail(email) || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  await ensureStudentsTable();

  const pool = await getPool();
  const studentRecord = await queryOne(
    `SELECT * FROM ${STUDENT_TABLE} WHERE Email = @email`,
    (request) => request.input("email", sql.NVarChar(100), email)
  );

  if (!studentRecord || !studentRecord.PasswordHash) {
    res.status(404).json({ message: "Student account not found." });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, studentRecord.PasswordHash);

  if (!passwordMatches) {
    res.status(401).json({ message: "Invalid password." });
    return;
  }

  const { token, user } = buildStudentAuthPayload(studentRecord);

  await pool
    .request()
    .input("studentId", sql.Int, studentRecord.Student_id)
    .input("token", sql.NVarChar(500), token)
    .query(`
      UPDATE ${STUDENT_TABLE}
      SET JwtToken = @token,
          LastLogin = GETDATE()
      WHERE Student_id = @studentId;
    `);

  res.json({
    message: "Student login successful.",
    token,
    user,
  });
};

const forgotStudentPassword = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!validateEmail(email)) {
    res.status(400).json({ message: "Please enter a valid email address." });
    return;
  }

  await ensureStudentsTable();

  const pool = await getPool();
  const studentRecord = await queryOne(
    `SELECT Student_id AS student_id, Email AS email FROM ${STUDENT_TABLE} WHERE Email = @email`,
    (request) => request.input("email", sql.NVarChar(100), email)
  );

  if (!studentRecord) {
    res.status(404).json({ message: "No student account was found for this email address." });
    return;
  }

  const resetCode = generateResetCode();
  const resetCodeHash = hashResetCode(resetCode);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await pool
    .request()
    .input("studentId", sql.Int, studentRecord.student_id)
    .input("passwordResetCodeHash", sql.NVarChar(255), resetCodeHash)
    .input("passwordResetExpiresAt", sql.DateTime, expiresAt)
    .query(`
      UPDATE ${STUDENT_TABLE}
      SET PasswordResetCodeHash = @passwordResetCodeHash,
          PasswordResetExpiresAt = @passwordResetExpiresAt
      WHERE Student_id = @studentId;
    `);

  const emailResult = await sendResetEmail({
    email,
    code: resetCode,
    expiresAt,
  });

  res.json({
    message: emailResult.delivered
      ? "A reset code has been sent to the student's email."
      : "Reset code generated. Configure SMTP to deliver emails automatically.",
    email,
    emailSent: emailResult.delivered,
    previewResetCode: emailResult.previewOnly ? resetCode : undefined,
    deliveryError: emailResult.delivered ? undefined : emailResult.failureReason,
    expiresAt: expiresAt.toISOString(),
  });
};

const resetStudentPassword = async (req, res) => {
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

  await ensureStudentsTable();

  const pool = await getPool();
  const studentRecord = await queryOne(
    `
      SELECT Student_id AS student_id, PasswordResetCodeHash, PasswordResetExpiresAt
      FROM ${STUDENT_TABLE}
      WHERE Email = @email
    `,
    (request) => request.input("email", sql.NVarChar(100), email)
  );

  if (!studentRecord || !studentRecord.PasswordResetCodeHash) {
    res.status(400).json({ message: "No active password reset request was found for this email." });
    return;
  }

  const isExpired =
    !studentRecord.PasswordResetExpiresAt ||
    new Date(studentRecord.PasswordResetExpiresAt).getTime() < Date.now();

  if (isExpired) {
    res.status(400).json({ message: "This reset code has expired. Please request a new one." });
    return;
  }

  if (hashResetCode(code) !== studentRecord.PasswordResetCodeHash) {
    res.status(400).json({ message: "The reset code is invalid." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await pool
    .request()
    .input("studentId", sql.Int, studentRecord.student_id)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query(`
      UPDATE ${STUDENT_TABLE}
      SET PasswordHash = @passwordHash,
          JwtToken = NULL,
          PasswordResetCodeHash = NULL,
          PasswordResetExpiresAt = NULL
      WHERE Student_id = @studentId;
    `);

  res.json({ message: "Student password reset successful. You can sign in now." });
};

const studentAuthMe = async (req, res) => {
  await ensureStudentsTable();

  const currentStudent = await getStudentAuthProfileById(req.user.id);

  if (!currentStudent) {
    res.status(404).json({ message: "Student account not found." });
    return;
  }

  res.json({
    id: currentStudent.student_id,
    email: currentStudent.email,
    name: currentStudent.name,
    phoneNumber: currentStudent.phone_number || null,
    guardianContact: currentStudent.guardian_contact || null,
    roomId: currentStudent.room_id || null,
    role: "Student",
    lastLogin: currentStudent.last_login,
  });
};

const updateStudentProfile = async (req, res) => {
  await ensureStudentsTable();

  const name = normalizeString(req.body.name);
  const phoneNumber = normalizeNullableString(req.body.phoneNumber);
  const guardianContact = normalizeNullableString(
    req.body.guardianContact ?? req.body.guardian_contact
  );

  if (!name) {
    res.status(400).json({ message: "Name is required." });
    return;
  }

  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    res.status(400).json({ message: "Please enter a valid phone number." });
    return;
  }

  if (guardianContact && !validatePhoneNumber(guardianContact)) {
    res.status(400).json({ message: "Please enter a valid guardian phone number." });
    return;
  }

  await executeQuery(
    `
      UPDATE ${STUDENT_TABLE}
      SET Name = @name,
          PhoneNumber = @phoneNumber,
          Guardian_Contact = @guardianContact
      WHERE Student_id = @studentId
    `,
    (request) =>
      request
        .input("studentId", sql.Int, req.user.id)
        .input("name", sql.NVarChar(100), name)
        .input("phoneNumber", sql.NVarChar(30), phoneNumber)
        .input("guardianContact", sql.NVarChar(20), guardianContact)
  );

  const updatedStudent = await getStudentAuthProfileById(req.user.id);

  if (!updatedStudent) {
    res.status(404).json({ message: "Student account not found." });
    return;
  }

  res.json({
    id: updatedStudent.student_id,
    email: updatedStudent.email,
    name: updatedStudent.name,
    phoneNumber: updatedStudent.phone_number || null,
    guardianContact: updatedStudent.guardian_contact || null,
    roomId: updatedStudent.room_id || null,
    role: "Student",
    lastLogin: updatedStudent.last_login,
    message: "Profile updated successfully.",
  });
};

const getStudentDashboard = async (req, res) => {
  await ensureStudentsTable();
  await ensurePublicRoomShowcaseTable();

  const studentId = parsePositiveInt(req.user?.id);

  if (!studentId) {
    res.status(401).json({ message: "Student authentication is required." });
    return;
  }

  const profile = await getStudentAuthProfileById(studentId);

  if (!profile) {
    res.status(404).json({ message: "Student account not found." });
    return;
  }

  const [paymentSummary, recentPayments, currentRoommateProfiles, studentBookings, studentBookingRequests] =
    await Promise.all([
      queryOne(
        `
          SELECT
            COUNT(*) AS payment_records,
            ISNULL(SUM(Amount), 0) AS total_paid
          FROM Payment
          WHERE Student_id = @studentId
        `,
        (request) => request.input("studentId", sql.Int, studentId)
      ),
      queryRows(
        `${paymentSelectQuery} WHERE p.Student_id = @studentId ORDER BY p.Payment_Date DESC, p.Payment_id DESC`,
        (request) => request.input("studentId", sql.Int, studentId)
      ),
      getRoommateProfilesByStudentId(studentId),
      getStudentBookingsByStudentId(studentId),
      queryRows(
        `
          ${studentRoomBookingSelectQuery}
          WHERE sb.Student_id = @studentId
          ORDER BY sb.Booked_At DESC, sb.Booking_Transaction_id DESC
        `,
        (request) => request.input("studentId", sql.Int, studentId)
      ),
    ]);

  const roommateProfiles =
    profile.room_id && Number(profile.room_capacity || 0) > 1 && currentRoommateProfiles.length === 0
      ? await reseedRoommatesForStudent(studentId, profile.room_id)
      : currentRoommateProfiles;

  const roommateCount = profile.room_id ? Number(roommateProfiles.length || 0) : 0;
  const simulatedOccupancy = profile.room_id
    ? Math.min(Number(profile.room_capacity || 0), 1 + roommateCount)
    : 0;
  const pendingBookingCount = studentBookingRequests.filter(
    (booking) => booking.status === "Pending"
  ).length;
  const pendingPaymentCount = studentBookingRequests.filter(
    (booking) => booking.payment_status === "Pending"
  ).length;
  const completedApprovalRequests = studentBookingRequests.filter(
    (booking) =>
      booking.status === "Approved" && booking.payment_status === "Approved"
  );
  const workflowNotifications = completedApprovalRequests.slice(0, 3).map((booking) => ({
    booking_id: booking.booking_id,
    title: booking.room_title,
    message: "Your room booking and payment have both been approved.",
    approved_at: booking.payment_verified_at || booking.requested_at,
  }));

  res.json({
    profile: {
      ...profile,
      current_occupancy: simulatedOccupancy,
    },
    summary: {
      paymentRecords: Number(paymentSummary?.payment_records || 0),
      totalPaid: Number(paymentSummary?.total_paid || 0),
      totalLeaves: 0,
      pendingLeaves: 0,
      approvedLeaves: 0,
      bookingRequests: studentBookingRequests.length,
      pendingBookings: pendingBookingCount,
      pendingPaymentVerifications: pendingPaymentCount,
      completedApprovals: completedApprovalRequests.length,
      roommates: roommateCount,
    },
    recentPayments: recentPayments.slice(0, 5),
    recentLeaveRequests: [],
    recentRoomBookings: studentBookingRequests.slice(0, 5),
    workflowNotifications,
    roommateProfiles,
    bookings: studentBookings,
  });
};

const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);
protectedRouter.use(authorizeRoles("Admin"));
protectedRouter.use(
  asyncHandler(async (req, res, next) => {
    await ensureStudentsTable();
    await ensurePublicRoomShowcaseTable();
    next();
  })
);

protectedRouter.get(
  "/dashboard/summary",
  asyncHandler(async (req, res) => {
    const summary = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM ${STUDENT_TABLE}) AS totalStudents,
        (SELECT COUNT(*) FROM Room) AS totalRooms,
        (SELECT COUNT(*) FROM Room WHERE Current_Occupancy >= Capacity) AS occupiedRooms,
        (SELECT COUNT(*) FROM Room WHERE Current_Occupancy < Capacity) AS availableRooms,
        CAST(0 AS INT) AS pendingMaintenance,
        (SELECT COUNT(*) FROM Student_Room_Booking WHERE Status = 'Pending') AS pendingBookingRequests,
        (
          SELECT COUNT(*)
          FROM Payment
          WHERE COALESCE(NULLIF(PaymentStatus, ''), Verification_Status, 'Pending') = 'Pending'
        ) AS pendingPaymentRequests,
        (SELECT ISNULL(SUM(Amount), 0) FROM Payment) AS totalCollection
    `);

    res.json({
      ...summary,
      lastUpdatedAt: new Date().toISOString(),
    });
  })
);

protectedRouter.get(
  "/booking-requests",
  asyncHandler(async (req, res) => {
    const requestedStatus = normalizeString(req.query.status);
    const normalizedStatus = requestedStatus
      ? BOOKING_REQUEST_STATUSES.find(
          (status) => status.toLowerCase() === requestedStatus.toLowerCase()
        )
      : null;

    if (requestedStatus && !normalizedStatus) {
      res.status(400).json({
        message: `Invalid status. Allowed values: ${BOOKING_REQUEST_STATUSES.join(", ")}.`,
      });
      return;
    }

    const whereClause = normalizedStatus ? "WHERE sb.Status = @status" : "";
    const rows = await queryRows(
      `
        ${studentRoomBookingSelectQuery}
        ${whereClause}
        ORDER BY sb.Booked_At DESC, sb.Booking_Transaction_id DESC
      `,
      normalizedStatus
        ? (request) => request.input("status", sql.NVarChar(20), normalizedStatus)
        : undefined
    );

    res.json(rows);
  })
);

protectedRouter.put(
  "/booking-requests/:id",
  asyncHandler(async (req, res) => {
    await ensureDefaultRoomInventory();
    await refreshPublicRoomAvailability();

    const bookingId = parsePositiveInt(req.params.id);
    const requestedStatus = normalizeString(req.body.status || "Approved");
    const normalizedStatus =
      requestedStatus.toLowerCase() === "accepted"
        ? "Approved"
        : BOOKING_REQUEST_STATUSES.find(
            (status) => status.toLowerCase() === requestedStatus.toLowerCase()
          );

    if (!bookingId) {
      res.status(400).json({ message: "A valid booking request ID is required." });
      return;
    }

    if (!normalizedStatus) {
      res.status(400).json({
        message: `Invalid status. Allowed values: ${BOOKING_REQUEST_STATUSES.join(", ")}.`,
      });
      return;
    }

    const existingBooking = await getBookingById(bookingId);

    if (!existingBooking) {
      res.status(404).json({ message: "Booking request not found." });
      return;
    }

    if (existingBooking.status === normalizedStatus) {
      res.json(existingBooking);
      return;
    }

    if (existingBooking.status !== "Pending") {
      res.status(409).json({ message: "Only pending booking requests can be updated." });
      return;
    }

    const student = await queryOne(
      `
        SELECT
          Student_id AS student_id,
          Room_id AS room_id
        FROM ${STUDENT_TABLE}
        WHERE Student_id = @studentId
      `,
      (request) => request.input("studentId", sql.Int, existingBooking.student_id)
    );

    if (!student) {
      res.status(404).json({ message: "Student account not found." });
      return;
    }

    if (normalizedStatus === "Approved") {
      if (!existingBooking.payment_id) {
        res.status(400).json({ message: "A payment record is required before approval." });
        return;
      }

      const normalizedPaymentStatus = normalizeApprovalStatus(existingBooking.payment_status);
      if (normalizedPaymentStatus !== "Approved") {
        res.status(409).json({
          message:
            "Payment is still pending. Approve the payment request first, then approve the booking.",
        });
        return;
      }
    }

    let allocatedRoom = null;

    if (normalizedStatus === "Approved") {
      allocatedRoom =
        existingBooking.allocated_room_id
          ? await getRoomById(existingBooking.allocated_room_id)
          : await getPreferredAvailableRoomForCategory(existingBooking.requested_room_category);

      if (!allocatedRoom) {
        await refreshPublicRoomAvailability({ force: true });
        res.status(409).json({
          message:
            "No physical rooms are currently available for this booking. Availability has been refreshed.",
        });
        return;
      }

      const roomAvailability = await getRoomAvailability(allocatedRoom.room_id);

      if (
        !roomAvailability ||
        Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)
      ) {
        await refreshPublicRoomAvailability({ force: true });
        res.status(409).json({
          message: "The selected room was just taken. Please refresh and try approving again.",
        });
        return;
      }
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      if (normalizedStatus === "Approved") {
        await transaction
          .request()
          .input("studentId", sql.Int, existingBooking.student_id)
          .input("roomId", sql.Int, allocatedRoom.room_id)
          .query(`
            UPDATE ${STUDENT_TABLE}
            SET Room_id = @roomId
            WHERE Student_id = @studentId
          `);
      }

      await transaction
        .request()
        .input("bookingId", sql.Int, bookingId)
        .input("status", sql.NVarChar(20), normalizedStatus)
        .input("roomId", sql.Int, allocatedRoom?.room_id || null)
        .query(`
          UPDATE Student_Room_Booking
          SET Status = @status,
              Allocated_Room_id = CASE
                WHEN @status = 'Approved' THEN @roomId
                ELSE Allocated_Room_id
              END
          WHERE Booking_Transaction_id = @bookingId
        `);

      await transaction.commit();
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // Ignore rollback errors and surface the original failure.
      }
      throw error;
    }

    if (normalizedStatus === "Approved") {
      await reseedRoommatesForStudent(existingBooking.student_id, allocatedRoom.room_id);
      await syncRoomOccupancy([student.room_id, allocatedRoom.room_id]);
      await refreshPublicRoomAvailability({ force: true });
    }

    const updatedBooking = await getBookingById(bookingId);
    res.json(updatedBooking);
  })
);

protectedRouter.post(
  "/admin/invite",
  authorizeRoles("SuperAdmin"),
  asyncHandler(inviteAdmin)
);

protectedRouter.get(
  "/admins",
  authorizeRoles("SuperAdmin"),
  asyncHandler(async (req, res) => {
    await ensureUserColumns();

    const rows = await queryRows(
      `
        SELECT
          id,
          email,
          ISNULL(fullName, '') AS fullName,
          ISNULL(phoneNumber, '') AS phoneNumber,
          Role AS role,
          createdAt,
          lastLogin
        FROM Users
        WHERE Role = 'Admin'
        ORDER BY createdAt DESC, id DESC
      `
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.fullName || getDisplayName(row.email),
        phoneNumber: row.phoneNumber || null,
        role: row.role,
        createdAt: row.createdAt,
        lastLogin: row.lastLogin,
      }))
    );
  })
);

protectedRouter.delete(
  "/admins/:id",
  authorizeRoles("SuperAdmin"),
  asyncHandler(async (req, res) => {
    await ensureUserColumns();

    const adminId = parsePositiveInt(req.params.id);

    if (!adminId) {
      res.status(400).json({ message: "A valid admin ID is required." });
      return;
    }

    const existingAdmin = await queryOne(
      `
        SELECT id, email, Role AS role
        FROM Users
        WHERE id = @id
      `,
      (request) => request.input("id", sql.Int, adminId)
    );

    if (!existingAdmin) {
      res.status(404).json({ message: "Admin account not found." });
      return;
    }

    if (getAdminRole(existingAdmin) !== "Admin") {
      res.status(403).json({ message: "Only standard admin accounts can be removed here." });
      return;
    }

    await executeQuery(
      "DELETE FROM Users WHERE id = @id",
      (request) => request.input("id", sql.Int, adminId)
    );

    res.json({ message: "Admin account removed successfully." });
  })
);

protectedRouter.get(
  "/students",
  asyncHandler(async (req, res) => {
    const rows = await queryRows(`${studentSelectQuery} ORDER BY s.Student_id`);

    res.json(rows);
  })
);

protectedRouter.post(
  "/students",
  asyncHandler(async (req, res) => {
    const name = normalizeString(req.body.name);
    const email = normalizeNullableString(req.body.email)?.toLowerCase() || null;
    const phoneNumber = normalizeNullableString(req.body.phone_number ?? req.body.phoneNumber);
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

    if (email && !validateEmail(email)) {
      res.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      res.status(400).json({ message: "Please enter a valid phone number." });
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

    if (email) {
      const existingEmail = await queryOne(
        `SELECT Student_id AS student_id FROM ${STUDENT_TABLE} WHERE LOWER(Email) = @email`,
        (request) => request.input("email", sql.NVarChar(100), email)
      );

      if (existingEmail) {
        res.status(409).json({ message: "Another student already uses this email address." });
        return;
      }
    }

    const studentId = await getNextId(STUDENT_TABLE, "Student_id");

    await executeQuery(
      `
        INSERT INTO ${STUDENT_TABLE} (Student_id, Name, Email, PhoneNumber, Room_id, Guardian_Contact)
        VALUES (@studentId, @name, @email, @phoneNumber, @roomId, @guardianContact)
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("name", sql.NVarChar(100), name)
          .input("email", sql.NVarChar(100), email)
          .input("phoneNumber", sql.NVarChar(30), phoneNumber)
          .input("roomId", sql.Int, roomId)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
    );

    await reseedRoommatesForStudent(studentId, roomId);
    await syncRoomOccupancy([roomId]);

    const student = await getStudentById(studentId);
    res.status(201).json(student);
  })
);

protectedRouter.put(
  "/students/:id",
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.params.id);
    const name = normalizeString(req.body.name);
    const email = normalizeNullableString(req.body.email)?.toLowerCase() || null;
    const phoneNumber = normalizeNullableString(req.body.phone_number ?? req.body.phoneNumber);
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

    if (email && !validateEmail(email)) {
      res.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      res.status(400).json({ message: "Please enter a valid phone number." });
      return;
    }

    const existingStudent = await queryOne(
      `SELECT Student_id AS student_id, Room_id AS room_id FROM ${STUDENT_TABLE} WHERE Student_id = @studentId`,
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

    if (email) {
      const emailOwner = await queryOne(
        `
          SELECT Student_id AS student_id
          FROM ${STUDENT_TABLE}
          WHERE LOWER(Email) = @email
            AND Student_id <> @studentId
        `,
        (request) =>
          request
            .input("email", sql.NVarChar(100), email)
            .input("studentId", sql.Int, studentId)
      );

      if (emailOwner) {
        res.status(409).json({ message: "Another student already uses this email address." });
        return;
      }
    }

    await executeQuery(
      `
        UPDATE ${STUDENT_TABLE}
        SET Name = @name,
            Email = @email,
            PhoneNumber = @phoneNumber,
            Room_id = @roomId,
            Guardian_Contact = @guardianContact
        WHERE Student_id = @studentId
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
          .input("name", sql.NVarChar(100), name)
          .input("email", sql.NVarChar(100), email)
          .input("phoneNumber", sql.NVarChar(30), phoneNumber)
          .input("roomId", sql.Int, roomId)
          .input("guardianContact", sql.NVarChar(20), guardianContact)
    );

    await reseedRoommatesForStudent(studentId, roomId);
    await syncRoomOccupancy([existingStudent.room_id, roomId]);

    const student = await getStudentById(studentId);
    res.json(student);
  })
);

protectedRouter.delete(
  "/students/:id",
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.params.id);

    if (!studentId) {
      res.status(400).json({ message: "A valid student ID is required." });
      return;
    }

    const existingStudent = await queryOne(
      `SELECT Student_id AS student_id, Room_id AS room_id FROM ${STUDENT_TABLE} WHERE Student_id = @studentId`,
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!existingStudent) {
      res.status(404).json({ message: "Student not found." });
      return;
    }

    await executeQuery(
      `
        DELETE FROM Student_Roommate_Profile WHERE Student_id = @studentId;
        DELETE FROM Student_Room_Booking WHERE Student_id = @studentId;
        DELETE FROM Payment WHERE Student_id = @studentId;
        DELETE FROM ${STUDENT_TABLE} WHERE Student_id = @studentId;
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
      "DELETE FROM Room WHERE Room_id = @roomId",
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
  "/payments",
  asyncHandler(async (req, res) => {
    const requestedStatus = normalizeString(req.query.status);
    const normalizedStatus = requestedStatus
      ? PAYMENT_VERIFICATION_STATUSES.find(
          (status) => status.toLowerCase() === requestedStatus.toLowerCase()
        )
      : null;

    if (requestedStatus && !normalizedStatus) {
      res.status(400).json({
        message: `Invalid status. Allowed values: ${PAYMENT_VERIFICATION_STATUSES.join(", ")}.`,
      });
      return;
    }

    const whereClause = normalizedStatus
      ? "WHERE COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = @status"
      : "";
    const rows = await queryRows(
      `${paymentSelectQuery} ${whereClause} ORDER BY p.Payment_Date DESC, p.Payment_id DESC`,
      normalizedStatus
        ? (request) => request.input("status", sql.NVarChar(20), normalizedStatus)
        : undefined
    );

    res.json(rows);
  })
);

protectedRouter.post(
  "/payments",
  asyncHandler(async (req, res) => {
    const studentId = parsePositiveInt(req.body.student_id);
    const amount = parsePositiveInt(req.body.amount);
    const paymentDate = parseDateValue(req.body.payment_date);
    const month = normalizeString(req.body.month);
    const adminId = parsePositiveInt(req.user?.id);
    const requestedStatus = normalizeString(
      req.body.status ?? req.body.payment_status ?? req.body.verification_status ?? "Approved"
    );
    const normalizedStatus =
      requestedStatus.toLowerCase() === "verified"
        ? "Approved"
        : PAYMENT_VERIFICATION_STATUSES.find(
            (status) => status.toLowerCase() === requestedStatus.toLowerCase()
          );
    const verificationNote = normalizeNullableString(req.body.verification_note);
    const reviewedAt = normalizedStatus === "Pending" ? null : new Date();
    const reviewedBy = normalizedStatus === "Pending" ? null : adminId;

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

    if (!normalizedStatus) {
      res.status(400).json({
        message: `Invalid status. Allowed values: ${PAYMENT_VERIFICATION_STATUSES.join(", ")}.`,
      });
      return;
    }

    const student = await queryOne(
      `SELECT Student_id AS student_id FROM ${STUDENT_TABLE} WHERE Student_id = @studentId`,
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(400).json({ message: "The selected student does not exist." });
      return;
    }

    const paymentId = await getNextId("Payment", "Payment_id");

    await executeQuery(
      `
        INSERT INTO Payment (
          Payment_id,
          Student_id,
          Amount,
          Payment_Date,
          [Month],
          PaymentStatus,
          Verification_Status,
          VerifiedBy,
          VerifiedAt,
          Verified_By_Admin_Id,
          Verified_At,
          Verification_Note
        )
        VALUES (
          @paymentId,
          @studentId,
          @amount,
          @paymentDate,
          @month,
          @status,
          @status,
          @reviewedBy,
          @reviewedAt,
          @reviewedBy,
          @reviewedAt,
          @verificationNote
        )
      `,
      (request) =>
        request
          .input("paymentId", sql.Int, paymentId)
          .input("studentId", sql.Int, studentId)
          .input("amount", sql.Int, amount)
          .input("paymentDate", sql.Date, paymentDate)
          .input("month", sql.NVarChar(20), month)
          .input("status", sql.NVarChar(20), normalizedStatus)
          .input("reviewedBy", sql.Int, reviewedBy)
          .input("reviewedAt", sql.DateTime, reviewedAt)
          .input("verificationNote", sql.NVarChar(250), verificationNote)
    );

    const payment = await getPaymentById(paymentId);
    res.status(201).json(payment);
  })
);

protectedRouter.put(
  "/payments/:id",
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
      `SELECT Student_id AS student_id FROM ${STUDENT_TABLE} WHERE Student_id = @studentId`,
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

// Verify payment (mark as received/verified)
protectedRouter.put(
  "/payments/:id/verify",
  asyncHandler(async (req, res) => {
    await ensureDefaultRoomInventory();
    await refreshPublicRoomAvailability();

    const paymentId = parsePositiveInt(req.params.id);
    const adminId = parsePositiveInt(req.user?.id);

    if (!paymentId) {
      res.status(400).json({ message: "A valid payment ID is required." });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: "Admin authentication is required." });
      return;
    }

    const existingPayment = await queryOne(
      `
        SELECT 
          Payment_id AS payment_id,
          COALESCE(NULLIF(PaymentStatus, ''), Verification_Status, 'Pending') AS payment_status,
          Student_id AS student_id,
          Booking_Transaction_id AS booking_transaction_id
        FROM Payment 
        WHERE Payment_id = @paymentId
      `,
      (request) => request.input("paymentId", sql.Int, paymentId)
    );

    if (!existingPayment) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    const currentPaymentStatus = normalizeApprovalStatus(existingPayment.payment_status);
    const isAlreadyApproved = currentPaymentStatus === "Approved";
    const now = new Date();

    if (!isAlreadyApproved) {
      await executeQuery(
        `
          UPDATE Payment
          SET PaymentStatus = 'Approved',
              Verification_Status = 'Approved',
              VerifiedBy = @adminId,
              VerifiedAt = @verifiedAt,
              Verified_By_Admin_Id = @adminId,
              Verified_At = @verifiedAt
          WHERE Payment_id = @paymentId
        `,
        (request) =>
          request
            .input("paymentId", sql.Int, paymentId)
            .input("adminId", sql.Int, adminId)
            .input("verifiedAt", sql.DateTime, now)
      );
    }

    let booking = await getBookingByPaymentId(paymentId);

    if (booking && booking.status === "Pending") {
      const student = await queryOne(
        `
          SELECT
            Student_id AS student_id,
            Room_id AS room_id
          FROM ${STUDENT_TABLE}
          WHERE Student_id = @studentId
        `,
        (request) => request.input("studentId", sql.Int, booking.student_id)
      );

      if (!student) {
        res.status(404).json({ message: "Student account not found for this payment request." });
        return;
      }

      const allocatedRoom =
        booking.allocated_room_id
          ? await getRoomById(booking.allocated_room_id)
          : await getPreferredAvailableRoomForCategory(booking.requested_room_category);

      if (!allocatedRoom) {
        await refreshPublicRoomAvailability({ force: true });
        res.status(409).json({
          message:
            "Payment approved, but no physical room is currently available. Please refresh and try again.",
        });
        return;
      }

      const roomAvailability = await getRoomAvailability(allocatedRoom.room_id);
      if (
        !roomAvailability ||
        Number(roomAvailability.current_occupancy || 0) >= Number(roomAvailability.capacity || 0)
      ) {
        await refreshPublicRoomAvailability({ force: true });
        res.status(409).json({
          message:
            "Payment approved, but the room was just occupied. Refresh availability and accept again.",
        });
        return;
      }

      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      await transaction.begin();

      try {
        await transaction
          .request()
          .input("studentId", sql.Int, booking.student_id)
          .input("roomId", sql.Int, allocatedRoom.room_id)
          .query(`
            UPDATE ${STUDENT_TABLE}
            SET Room_id = @roomId
            WHERE Student_id = @studentId
          `);

        await transaction
          .request()
          .input("bookingId", sql.Int, booking.booking_transaction_id)
          .input("roomId", sql.Int, allocatedRoom.room_id)
          .query(`
            UPDATE Student_Room_Booking
            SET Status = 'Approved',
                Allocated_Room_id = @roomId
            WHERE Booking_Transaction_id = @bookingId
          `);

        await transaction.commit();
      } catch (transactionError) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          // Ignore rollback errors and surface the original failure.
        }
        throw transactionError;
      }

      await reseedRoommatesForStudent(booking.student_id, allocatedRoom.room_id);
      await syncRoomOccupancy([student.room_id, allocatedRoom.room_id]);
      await refreshPublicRoomAvailability({ force: true });

      booking = await getBookingById(booking.booking_transaction_id);
    }

    const payment = await getPaymentById(paymentId);
    const workflowCompleted =
      booking?.status === "Approved" && booking?.payment_status === "Approved";

    res.json({
      message: workflowCompleted
        ? "Payment approved and room booking completed successfully."
        : "Payment approved successfully.",
      workflowCompleted,
      payment,
      booking,
    });
  })
);

// Reject payment
protectedRouter.put(
  "/payments/:id/reject",
  asyncHandler(async (req, res) => {
    const paymentId = parsePositiveInt(req.params.id);
    const adminId = parsePositiveInt(req.user?.id);
    const reason = normalizeNullableString(req.body.reason);

    if (!paymentId) {
      res.status(400).json({ message: "A valid payment ID is required." });
      return;
    }

    if (!adminId) {
      res.status(401).json({ message: "Admin authentication is required." });
      return;
    }

    const existingPayment = await queryOne(
      `
        SELECT 
          Payment_id AS payment_id,
          COALESCE(NULLIF(PaymentStatus, ''), Verification_Status, 'Pending') AS payment_status
        FROM Payment 
        WHERE Payment_id = @paymentId
      `,
      (request) => request.input("paymentId", sql.Int, paymentId)
    );

    if (!existingPayment) {
      res.status(404).json({ message: "Payment not found." });
      return;
    }

    await executeQuery(
      `
        UPDATE Payment
        SET PaymentStatus = 'Rejected',
            Verification_Status = 'Rejected',
            VerifiedBy = @adminId,
            VerifiedAt = GETDATE(),
            Verified_By_Admin_Id = @adminId,
            Verified_At = GETDATE(),
            Verification_Note = @reason
        WHERE Payment_id = @paymentId
      `,
      (request) =>
        request
          .input("paymentId", sql.Int, paymentId)
          .input("adminId", sql.Int, adminId || null)
          .input("reason", sql.NVarChar(250), reason)
    );

    const payment = await getPaymentById(paymentId);
    res.json({ message: "Payment rejected successfully.", payment });
  })
);

protectedRouter.get(
  "/bookings",
  asyncHandler(async (req, res) => {
    await ensurePublicRoomShowcaseTable();
    const rows = await queryRows(`${bookingSelectQuery} ORDER BY sb.Booked_At DESC, sb.Booking_Transaction_id DESC`);
    res.json(rows);
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
      await ensureAdminInvitationsTable();
      await ensureStudentsTable();
      await ensurePublicRoomShowcaseTable();

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
app.post("/api/auth/forgot-password", asyncHandler(forgotPassword));
app.post("/api/auth/reset-password", asyncHandler(resetPassword));
app.get("/api/auth/me", authenticateToken, authorizeRoles("Admin"), asyncHandler(authMe));
app.put("/api/auth/me", authenticateToken, authorizeRoles("Admin"), asyncHandler(updateProfile));
app.post(
  "/api/invite-admin",
  authenticateToken,
  authorizeRoles("SuperAdmin"),
  asyncHandler(inviteAdmin)
);
app.post("/api/student-auth/register", asyncHandler(registerStudent));
app.post("/api/student-auth/login", asyncHandler(loginStudent));
app.post("/api/student-auth/forgot-password", asyncHandler(forgotStudentPassword));
app.post("/api/student-auth/reset-password", asyncHandler(resetStudentPassword));
app.get(
  "/api/student-auth/me",
  authenticateToken,
  authorizeRoles("Student"),
  asyncHandler(studentAuthMe)
);
app.put(
  "/api/student-auth/me",
  authenticateToken,
  authorizeRoles("Student"),
  asyncHandler(updateStudentProfile)
);
app.get(
  "/api/student/dashboard",
  authenticateToken,
  authorizeRoles("Student"),
  asyncHandler(getStudentDashboard)
);

app.post(
  "/api/student/bookings/checkout",
  authenticateToken,
  authorizeRoles("Student"),
  asyncHandler(async (req, res) => {
    await ensureStudentsTable();
    await ensurePublicRoomShowcaseTable();
    await ensureDefaultRoomInventory();
    await refreshPublicRoomAvailability();

    const studentId = parsePositiveInt(req.user?.id);
    const showcaseRoomId = parsePositiveInt(
      req.body.showcase_room_id ??
        req.body.showcaseRoomId ??
        req.body.room_id ??
        req.body.roomId
    );
    const requestedAmount = parsePositiveInt(req.body.amount);
    const cardLast4 = normalizeString(req.body.card_last4 ?? req.body.cardLast4)
      .replace(/\D/g, "")
      .slice(-4);
    const cardBrand = normalizeNullableString(req.body.card_brand ?? req.body.cardBrand);

    if (!studentId) {
      res.status(401).json({ message: "Student authentication is required." });
      return;
    }

    if (!showcaseRoomId) {
      res.status(400).json({ message: "A valid room selection is required." });
      return;
    }

    const student = await queryOne(
      `
        SELECT
          Student_id AS student_id,
          Room_id AS room_id,
          Name AS name,
          Email AS email
        FROM ${STUDENT_TABLE}
        WHERE Student_id = @studentId
      `,
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (!student) {
      res.status(404).json({ message: "Student account not found." });
      return;
    }

    const showcaseRoom = await getPublicRoomById(showcaseRoomId);

    if (!showcaseRoom) {
      res.status(404).json({ message: "Selected room option was not found." });
      return;
    }

    if (!showcaseRoom.is_available) {
      res.status(400).json({
        message:
          "This room option is currently unavailable. Please choose another available room card.",
      });
      return;
    }

    const pendingBooking = await queryOne(
      `
        SELECT TOP 1 sb.Booking_Transaction_id AS booking_id
        FROM Student_Room_Booking sb
        LEFT JOIN Payment p ON p.Payment_id = sb.Payment_id
        WHERE sb.Student_id = @studentId
          AND (
            sb.Status = 'Pending'
            OR COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Pending'
          )
      `,
      (request) => request.input("studentId", sql.Int, studentId)
    );

    if (pendingBooking) {
      res.status(409).json({
        message:
          "You already have a pending room booking request. Please wait for admin approval before submitting another one.",
      });
      return;
    }

    const fallbackAmount = Number(showcaseRoom.price_min || showcaseRoom.price_max || 0);
    const amount = requestedAmount || (Number.isFinite(fallbackAmount) ? fallbackAmount : 0);

    if (!amount || amount <= 0) {
      res.status(400).json({ message: "A valid payment amount is required." });
      return;
    }

    const paymentDate = new Date();
    const paymentMonth =
      normalizeString(req.body.month) ||
      paymentDate.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });
    const paymentId = await getNextId("Payment", "Payment_id");
    let bookingId = null;

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction
        .request()
        .input("paymentId", sql.Int, paymentId)
        .input("studentId", sql.Int, studentId)
        .input("amount", sql.Int, amount)
        .input("paymentDate", sql.Date, paymentDate)
        .input("month", sql.NVarChar(20), paymentMonth)
        .query(`
          INSERT INTO Payment (
            Payment_id,
            Student_id,
            Amount,
            Payment_Date,
            [Month],
            PaymentStatus,
            Verification_Status
          )
          VALUES (
            @paymentId,
            @studentId,
            @amount,
            @paymentDate,
            @month,
            'Pending',
            'Pending'
          )
        `);

      const insertBookingResult = await transaction
        .request()
        .input("studentId", sql.Int, studentId)
        .input("showcaseRoomId", sql.Int, showcaseRoom.id)
        .input("paymentId", sql.Int, paymentId)
        .input("amount", sql.Int, amount)
        .input("cardBrand", sql.NVarChar(30), cardBrand)
        .input("cardLast4", sql.NVarChar(4), cardLast4 || null)
        .input("status", sql.NVarChar(20), "Pending")
        .query(`
          INSERT INTO Student_Room_Booking (
            Student_id,
            Showcase_Room_id,
            Payment_id,
            Amount,
            Card_Brand,
            Card_Last4,
            Status
          )
          OUTPUT INSERTED.Booking_Transaction_id AS booking_id
          VALUES (
            @studentId,
            @showcaseRoomId,
            @paymentId,
            @amount,
            @cardBrand,
            @cardLast4,
            @status
          )
        `);

      bookingId = parsePositiveInt(insertBookingResult.recordset?.[0]?.booking_id);

      if (bookingId) {
        await transaction
          .request()
          .input("paymentId", sql.Int, paymentId)
          .input("bookingId", sql.Int, bookingId)
          .query(`
            UPDATE Payment
            SET Booking_Transaction_id = @bookingId
            WHERE Payment_id = @paymentId
          `);
      }

      await transaction.commit();
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // Ignore rollback errors and surface the original failure.
      }
      throw error;
    }

    const payment = await getPaymentById(paymentId);
    const profile = await getStudentAuthProfileById(studentId);
    const booking = bookingId ? await getBookingById(bookingId) : null;

    res.status(201).json({
      message:
        "Payment request submitted. Booking and payment both need admin approval before completion.",
      bookingStatus: "Pending",
      paymentStatus: "Pending",
      paymentMethod: cardLast4 ? `Card ending in ${cardLast4}` : "Card payment",
      booking,
      room: {
        requested: {
          id: showcaseRoom.id,
          title: showcaseRoom.title,
          category: showcaseRoom.category,
          capacity: showcaseRoom.capacity,
          priceRange: showcaseRoom.price_range,
        },
      },
      payment: {
        ...payment,
        card_last4: cardLast4 || null,
        card_brand: cardBrand || null,
      },
      profile,
      roommateProfiles: [],
    });
  })
);

app.get(
  "/api/public/rooms",
  asyncHandler(async (req, res) => {
    await ensurePublicRoomShowcaseTable();
    await ensureDefaultRoomInventory();
    await refreshPublicRoomAvailability();

    const requestedCategory = normalizeString(req.query.category).toLowerCase();
    const hasCategoryFilter = Boolean(requestedCategory);

    if (hasCategoryFilter && !PUBLIC_ROOM_CATEGORIES.includes(requestedCategory)) {
      res.status(400).json({
        message: `Invalid category. Allowed values: ${PUBLIC_ROOM_CATEGORIES.join(", ")}.`,
      });
      return;
    }

    const whereClause = hasCategoryFilter ? "WHERE prs.Category = @category" : "";
    const rows = await queryRows(
      `${publicRoomShowcaseSelectQuery} ${whereClause} ORDER BY prs.Sort_Order, prs.Showcase_Room_id`,
      hasCategoryFilter
        ? (request) => request.input("category", sql.NVarChar(20), requestedCategory)
        : undefined
    );

    res.json({
      categories: PUBLIC_ROOM_CATEGORIES.map((category) => ({
        value: category,
        label: PUBLIC_ROOM_CATEGORY_LABELS[category] || category,
      })),
      rooms: rows,
    });
  })
);

app.get(
  "/api/public/rooms/:id",
  asyncHandler(async (req, res) => {
    await ensurePublicRoomShowcaseTable();
    await ensureDefaultRoomInventory();
    await refreshPublicRoomAvailability();

    const roomId = parsePositiveInt(req.params.id);

    if (!roomId) {
      res.status(400).json({ message: "A valid room ID is required." });
      return;
    }

    const room = await getPublicRoomById(roomId);

    if (!room) {
      res.status(404).json({ message: "Room details not found." });
      return;
    }

    res.json(room);
  })
);

app.post(
  "/api/public/rooms/:id/book",
  authenticateToken,
  authorizeRoles("Student"),
  asyncHandler(async (req, res) => {
    await ensureStudentsTable();
    await ensurePublicRoomShowcaseTable();

    const roomId = parsePositiveInt(req.params.id);

    if (!roomId) {
      res.status(400).json({ message: "A valid room ID is required." });
      return;
    }

    const room = await getPublicRoomById(roomId);

    if (!room) {
      res.status(404).json({ message: "Room details not found." });
      return;
    }

    if (!room.is_available) {
      res.status(400).json({ message: "This room is currently unavailable." });
      return;
    }

    const studentId = parsePositiveInt(req.user?.id);

    if (!studentId) {
      res.status(401).json({ message: "You need to sign in before booking a room." });
      return;
    }

    const student = await getStudentAuthProfileById(studentId);

    if (!student) {
      res.status(404).json({ message: "Student account not found." });
      return;
    }

    const pendingBooking = await queryOne(
      `
        SELECT TOP 1 sb.Booking_Transaction_id AS booking_id
        FROM Student_Room_Booking sb
        LEFT JOIN Payment p ON p.Payment_id = sb.Payment_id
        WHERE sb.Student_id = @studentId
          AND (
            sb.Status = 'Pending'
            OR COALESCE(NULLIF(p.PaymentStatus, ''), p.Verification_Status, 'Pending') = 'Pending'
          )
      `,
      (request) =>
        request
          .input("studentId", sql.Int, studentId)
    );

    if (pendingBooking) {
      res.status(409).json({
        message:
          "You already have a pending booking request. Please wait for admin approval before selecting another room.",
      });
      return;
    }

    res.json({
      message: "Room selected successfully. Continue to payment to submit your booking request.",
      room: {
        id: room.id,
        title: room.title,
        category: room.category,
      },
      student: {
        id: student.student_id,
        name: student.name,
      },
      nextPath: `/student/payment?roomId=${room.id}`,
    });
  })
);

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
    .then(() => ensureFixedSuperAdminAccount())
    .then(() => ensureStudentsTable())
    .then(() => ensurePublicRoomShowcaseTable())
    .then(() => ensureDefaultRoomInventory())
    .then(() => refreshPublicRoomAvailability({ force: true }))
    .then(() => startPublicRoomAvailabilityRefreshLoop())
    .catch((error) => {
      console.error("DB Connection Failed:", error);
      console.error(error.stack);
    });
});

module.exports = app;
