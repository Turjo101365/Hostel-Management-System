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
-- Run this seed script safely even if the database already contains old tables.
IF OBJECT_ID('dbo.Leave_Request', 'U') IS NOT NULL DROP TABLE dbo.Leave_Request;
IF OBJECT_ID('dbo.Maintenance', 'U') IS NOT NULL DROP TABLE dbo.Maintenance;
IF OBJECT_ID('dbo.Payment', 'U') IS NOT NULL DROP TABLE dbo.Payment;
IF OBJECT_ID('dbo.Visitor', 'U') IS NOT NULL DROP TABLE dbo.Visitor;
IF OBJECT_ID('dbo.Student', 'U') IS NOT NULL DROP TABLE dbo.Student;
IF OBJECT_ID('dbo.Room', 'U') IS NOT NULL DROP TABLE dbo.Room;
IF OBJECT_ID('dbo.Hostel_Block', 'U') IS NOT NULL DROP TABLE dbo.Hostel_Block;
IF OBJECT_ID('dbo.Fee_Structure', 'U') IS NOT NULL DROP TABLE dbo.Fee_Structure;
IF OBJECT_ID('dbo.Mess_Menu', 'U') IS NOT NULL DROP TABLE dbo.Mess_Menu;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- ------------------ USERS ------------------
CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(100) UNIQUE NOT NULL,
    fullName NVARCHAR(120) NULL,
    phoneNumber NVARCHAR(30) NULL,
    role NVARCHAR(20) NOT NULL DEFAULT 'Admin',
    studentId INT NULL,
    passwordHash NVARCHAR(255) NOT NULL,
    jwtToken NVARCHAR(500) NULL,
    passwordResetCodeHash NVARCHAR(255) NULL,
    passwordResetExpiresAt DATETIME NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    lastLogin DATETIME NULL
);
GO

-- ------------------ HOSTEL BLOCK ------------------
CREATE TABLE Hostel_Block (
    Block_id INT PRIMARY KEY,
    Block_Name VARCHAR(50),
    Total_Rooms INT
);
GO

-- ------------------ ROOM ------------------
CREATE TABLE Room (
    Room_id INT PRIMARY KEY,
    Room_Number VARCHAR(20),
    Capacity INT,
    Current_Occupancy INT,
    Type VARCHAR(20),
    Hostel_Block INT,
    FOREIGN KEY (Hostel_Block) REFERENCES Hostel_Block(Block_id)
);
GO

-- ------------------ STUDENT ------------------
CREATE TABLE Student (
    Student_id INT PRIMARY KEY,
    Name VARCHAR(100),
    Room_id INT,
    Guardian_Contact VARCHAR(20),
    FOREIGN KEY (Room_id) REFERENCES Room(Room_id)
);
GO

-- ------------------ VISITOR ------------------
CREATE TABLE Visitor (
    Visitor_id INT PRIMARY KEY,
    Student_id INT,
    Date_time_Entry DATETIME,
    Date_time_Exit DATETIME,
    Purpose VARCHAR(255),
    FOREIGN KEY (Student_id) REFERENCES Student(Student_id)
);
GO
-- ------------------ PAYMENT ------------------
CREATE TABLE Payment (
    Payment_id INT PRIMARY KEY,
    Student_id INT,
    Amount INT,
    Payment_Date DATE,
    [Month] VARCHAR(20),
    FOREIGN KEY (Student_id) REFERENCES Student(Student_id)
);
GO

-- ------------------ FEE STRUCTURE ------------------
CREATE TABLE Fee_Structure (
    Fee_id INT PRIMARY KEY,
    Type VARCHAR(50),
    Amount INT
);
GO

-- ------------------ MESS MENU ------------------
CREATE TABLE Mess_Menu (
    Menu_Id INT PRIMARY KEY,
    Day VARCHAR(20),
    Meal_type VARCHAR(20),
    Items VARCHAR(255)
);
GO
-- ------------------ MAINTENANCE ------------------
CREATE TABLE Maintenance (
    Request_id INT PRIMARY KEY,
    Room_id INT,
    Issue_type VARCHAR(100),
    Date_Reported DATE,
    Status VARCHAR(20),
    FOREIGN KEY (Room_id) REFERENCES Room(Room_id)
);
GO

-- ------------------ LEAVE REQUEST ------------------
CREATE TABLE Leave_Request (
    leave_id INT PRIMARY KEY,
    student_id INT,
    from_date DATE,
    to_date DATE,
    reason VARCHAR(255),
    Status VARCHAR(20),
    FOREIGN KEY (student_id) REFERENCES Student(Student_id)
);
GO
