/* =========================================================
   CPEN 412 Mini Project — TASK 1 (PostgreSQL)
   Campus Facility Booking System (DB + Extra Marks)
   Tables: facilities, users, bookings
   Extras: constraints, timestamps, slot range, overlap prevention
   ========================================================= */

-- 1) Enable extension needed for GiST exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2) Reset (drop tables in correct dependency order)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS facilities;

-- 3) Create FACILITIES table
CREATE TABLE facilities (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(120) NOT NULL,
  capacity   INT NOT NULL CHECK (capacity > 0),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4) Create USERS table
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  role       VARCHAR(30)  NOT NULL CHECK (role IN ('student','staff','admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5) Create BOOKINGS table
-- slot = generated time range (date+start_time to date+end_time)
CREATE TABLE bookings (
  id         SERIAL PRIMARY KEY,
  facility_id INT REFERENCES facilities(id),
  user_id     INT REFERENCES users(id),
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      VARCHAR(30) NOT NULL
              CHECK (status IN ('pending','confirmed','cancelled')),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  slot        TSRANGE GENERATED ALWAYS AS (
                tsrange(date + start_time, date + end_time, '[)')
              ) STORED
);

-- 6) Extra marks: Prevent overlapping bookings per facility (except cancelled)
ALTER TABLE bookings
ADD CONSTRAINT no_overlap
EXCLUDE USING gist (
  facility_id WITH =,
  slot WITH &&
)
WHERE (status <> 'cancelled');



/* =========================================================
   SAMPLE DATA (at least 1 row per table)
   ========================================================= */

-- Facilities
INSERT INTO facilities (name, location, capacity)
VALUES
  ('Engineering Lab', 'School of Engineering Block', 40),
  ('Pent Room C24',   'Pentagon Hostel',            6);

-- Users
INSERT INTO users (name, email, role)
VALUES
  ('Peggy Esinam Somuah', 'peggy@gmail.com',  'student'),
  ('Samuel Idana',        'samuel@gmail.com', 'student');

-- Bookings
INSERT INTO bookings (facility_id, user_id, date, start_time, end_time, status)
VALUES
  (1, 1, '2026-02-17', '09:00', '10:00', 'confirmed'),
  (2, 2, '2026-02-18', '14:00', '16:00', 'confirmed');



/* =========================================================
   VERIFY TABLE CONTENTS
   ========================================================= */

SELECT * FROM facilities;
SELECT * FROM users;
SELECT * FROM bookings;



/* =========================================================
   READABLE VIEW (JOIN) — shows names/emails/facility names
   ========================================================= */

SELECT
  b.id        AS booking_id,
  f.name      AS facility_name,
  f.location,
  u.name      AS user_name,
  u.email,
  b.date,
  b.start_time,
  b.end_time,
  b.status,
  b.created_at
FROM bookings b
JOIN facilities f ON f.id = b.facility_id
JOIN users u      ON u.id = b.user_id
ORDER BY b.id;
