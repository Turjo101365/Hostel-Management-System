-- ======================================
-- HostelDB.sql
-- ======================================

-- ------------------ CREATE DATABASE ------------------
IF DB_ID('HostelDB') IS NULL
BEGIN
    CREATE DATABASE HostelDB;
END
GO

USE HostelDB;
GO

-- ------------------ RESET EXISTING TABLES ------------------
-- Drop child tables first, then parent tables.
IF OBJECT_ID('dbo.Student_Roommate_Profile', 'U') IS NOT NULL DROP TABLE dbo.Student_Roommate_Profile;
IF OBJECT_ID('dbo.Student_Room_Booking', 'U') IS NOT NULL DROP TABLE dbo.Student_Room_Booking;
IF OBJECT_ID('dbo.Payment', 'U') IS NOT NULL DROP TABLE dbo.Payment;
IF OBJECT_ID('dbo.Students', 'U') IS NOT NULL DROP TABLE dbo.Students;
IF OBJECT_ID('dbo.Student', 'U') IS NOT NULL DROP TABLE dbo.Student;
IF OBJECT_ID('dbo.Public_Room_Showcase', 'U') IS NOT NULL DROP TABLE dbo.Public_Room_Showcase;
IF OBJECT_ID('dbo.Room', 'U') IS NOT NULL DROP TABLE dbo.Room;
IF OBJECT_ID('dbo.Hostel_Block', 'U') IS NOT NULL DROP TABLE dbo.Hostel_Block;
IF OBJECT_ID('dbo.Mess_Menu', 'U') IS NOT NULL DROP TABLE dbo.Mess_Menu;
IF OBJECT_ID('dbo.AdminInvitations', 'U') IS NOT NULL DROP TABLE dbo.AdminInvitations;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- ------------------ USERS ------------------
CREATE TABLE dbo.Users (
    id INT IDENTITY(1,1) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    fullName NVARCHAR(120) NULL,
    phoneNumber NVARCHAR(30) NULL,
    Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT 'Admin',
    passwordHash NVARCHAR(255) NOT NULL,
    jwtToken NVARCHAR(500) NULL,
    passwordResetCodeHash NVARCHAR(255) NULL,
    passwordResetExpiresAt DATETIME NULL,
    createdAt DATETIME NOT NULL CONSTRAINT DF_Users_createdAt DEFAULT GETDATE(),
    lastLogin DATETIME NULL,
    CONSTRAINT PK_Users PRIMARY KEY (id),
    CONSTRAINT UQ_Users_email UNIQUE (email),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'SuperAdmin'))
);
GO

-- ------------------ ADMIN INVITATIONS ------------------
CREATE TABLE dbo.AdminInvitations (
    Id INT IDENTITY(1,1) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Token NVARCHAR(128) NOT NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_AdminInvitations_CreatedAt DEFAULT GETDATE(),
    IsUsed BIT NOT NULL CONSTRAINT DF_AdminInvitations_IsUsed DEFAULT 0,
    CONSTRAINT PK_AdminInvitations PRIMARY KEY (Id),
    CONSTRAINT UQ_AdminInvitations_Token UNIQUE (Token)
);
GO

CREATE INDEX IX_AdminInvitations_Email_IsUsed ON dbo.AdminInvitations (Email, IsUsed);
GO

-- ------------------ FIXED SUPER ADMIN ------------------
INSERT INTO dbo.Users (email, fullName, Role, passwordHash)
VALUES (
    'feroz.alam4103@gmail.com',
    'Super Admin',
    'SuperAdmin',
    '$2b$10$c9e7.XiRARrD06b6EO4/UeQ3evi71IL2RscUXmzadNkR3ltYbNY0e'
);
GO

-- ------------------ PUBLIC ROOM SHOWCASE ------------------
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
GO

-- ------------------ HOSTEL BLOCK ------------------
CREATE TABLE dbo.Hostel_Block (
    Block_id INT NOT NULL,
    Block_Name NVARCHAR(50) NOT NULL,
    Total_Rooms INT NOT NULL CONSTRAINT DF_Hostel_Block_Total_Rooms DEFAULT 0,
    CONSTRAINT PK_Hostel_Block PRIMARY KEY (Block_id),
    CONSTRAINT CK_Hostel_Block_Total_Rooms CHECK (Total_Rooms >= 0)
);
GO

-- ------------------ ROOM ------------------
CREATE TABLE dbo.Room (
    Room_id INT NOT NULL,
    Room_Number NVARCHAR(20) NOT NULL,
    Capacity INT NOT NULL,
    Current_Occupancy INT NOT NULL CONSTRAINT DF_Room_Current_Occupancy DEFAULT 0,
    Type NVARCHAR(20) NOT NULL,
    Hostel_Block INT NOT NULL,
    CONSTRAINT PK_Room PRIMARY KEY (Room_id),
    CONSTRAINT UQ_Room_Room_Number UNIQUE (Room_Number),
    CONSTRAINT CK_Room_Capacity CHECK (Capacity > 0),
    CONSTRAINT CK_Room_Current_Occupancy CHECK (Current_Occupancy >= 0 AND Current_Occupancy <= Capacity),
    CONSTRAINT FK_Room_Hostel_Block FOREIGN KEY (Hostel_Block) REFERENCES dbo.Hostel_Block(Block_id)
);
GO

-- ------------------ STUDENTS ------------------
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
GO

CREATE UNIQUE INDEX UQ_Students_Email ON dbo.Students (Email) WHERE Email IS NOT NULL;
GO

-- ------------------ PAYMENT ------------------
CREATE TABLE dbo.Payment (
    Payment_id INT NOT NULL,
    Student_id INT NOT NULL,
    Amount INT NOT NULL,
    Payment_Date DATE NOT NULL,
    [Month] NVARCHAR(20) NOT NULL,
    CONSTRAINT PK_Payment PRIMARY KEY (Payment_id),
    CONSTRAINT CK_Payment_Amount CHECK (Amount > 0),
    CONSTRAINT FK_Payment_Student FOREIGN KEY (Student_id) REFERENCES dbo.Students(Student_id)
);
GO

-- ------------------ STUDENT ROOM BOOKING ------------------
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
    CONSTRAINT CK_Student_Room_Booking_Status CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT FK_Student_Room_Booking_Student FOREIGN KEY (Student_id) REFERENCES dbo.Students(Student_id),
    CONSTRAINT FK_Student_Room_Booking_Showcase FOREIGN KEY (Showcase_Room_id) REFERENCES dbo.Public_Room_Showcase(Showcase_Room_id),
    CONSTRAINT FK_Student_Room_Booking_AllocatedRoom FOREIGN KEY (Allocated_Room_id) REFERENCES dbo.Room(Room_id)
);
GO

-- ------------------ MESS MENU ------------------
CREATE TABLE dbo.Mess_Menu (
    Menu_Id INT NOT NULL,
    [Day] NVARCHAR(20) NOT NULL,
    Meal_type NVARCHAR(20) NOT NULL,
    Items NVARCHAR(255) NOT NULL,
    CONSTRAINT PK_Mess_Menu PRIMARY KEY (Menu_Id),
    CONSTRAINT UQ_Mess_Menu_Day_Meal UNIQUE ([Day], Meal_type),
    CONSTRAINT CK_Mess_Menu_Day CHECK ([Day] IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    CONSTRAINT CK_Mess_Menu_Meal_type CHECK (Meal_type IN ('Breakfast', 'Lunch', 'Dinner'))
);
GO

-- ------------------ SUPPORTING INDEXES ------------------
CREATE INDEX IX_Room_Hostel_Block ON dbo.Room (Hostel_Block);
CREATE INDEX IX_Students_Room_id ON dbo.Students (Room_id);
CREATE INDEX IX_Payment_Student_id ON dbo.Payment (Student_id);
CREATE INDEX IX_Public_Room_Showcase_Category_Sort ON dbo.Public_Room_Showcase (Category, Sort_Order);
CREATE INDEX IX_Student_Room_Booking_Student ON dbo.Student_Room_Booking (Student_id, Booked_At DESC);
GO
