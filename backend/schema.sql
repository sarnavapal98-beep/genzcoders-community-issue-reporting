-- =========================================================
-- COMMUNITY ISSUE REPORTING SYSTEM
-- DATABASE SCHEMA
-- =========================================================

PRAGMA foreign_keys = ON;


-- =========================================================
-- DEPARTMENTS
-- =========================================================

CREATE TABLE IF NOT EXISTS departments (
    DepartmentID INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    contact TEXT
);


-- =========================================================
-- CITIZENS
-- =========================================================

CREATE TABLE IF NOT EXISTS citizens (
    CitizenID INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    contact_info TEXT,

    email TEXT NOT NULL UNIQUE,

    password_hash TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'citizen'
        CHECK (role IN ('citizen', 'staff', 'admin')),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- LOCATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS locations (
    LocationID INTEGER PRIMARY KEY AUTOINCREMENT,

    latitude REAL,

    longitude REAL,

    map_link TEXT,

    address TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- STAFF
-- =========================================================

CREATE TABLE IF NOT EXISTS staff (
    StaffID INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    email TEXT UNIQUE,

    DepartmentID INTEGER NOT NULL,

    FOREIGN KEY (DepartmentID)
        REFERENCES departments(DepartmentID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- =========================================================
-- CATEGORIES
-- =========================================================

CREATE TABLE IF NOT EXISTS categories (
    CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    DepartmentID INTEGER NOT NULL,

    FOREIGN KEY (DepartmentID)
        REFERENCES departments(DepartmentID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- =========================================================
-- REPORTS
-- =========================================================

CREATE TABLE IF NOT EXISTS reports (
    ReportID INTEGER PRIMARY KEY AUTOINCREMENT,

    photo_url TEXT,

    description TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'Reported'
        CHECK (
            status IN (
                'Reported',
                'Acknowledged',
                'In Progress',
                'Resolved'
            )
        ),

    date_submitted TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CitizenID INTEGER NOT NULL,

    CategoryID INTEGER NOT NULL,

    LocationID INTEGER,

    StaffID INTEGER,

    FOREIGN KEY (CitizenID)
        REFERENCES citizens(CitizenID)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (CategoryID)
        REFERENCES categories(CategoryID)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (LocationID)
        REFERENCES locations(LocationID)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (StaffID)
        REFERENCES staff(StaffID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_reports_citizen
ON reports(CitizenID);


CREATE INDEX IF NOT EXISTS idx_reports_category
ON reports(CategoryID);


CREATE INDEX IF NOT EXISTS idx_reports_location
ON reports(LocationID);


CREATE INDEX IF NOT EXISTS idx_reports_staff
ON reports(StaffID);


CREATE INDEX IF NOT EXISTS idx_reports_status
ON reports(status);


CREATE INDEX IF NOT EXISTS idx_reports_date
ON reports(date_submitted);


-- =========================================================
-- END OF SCHEMA
-- =========================================================