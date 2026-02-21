-- Drop tables in correct order
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;

-- Enable extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================================================
-- FACILITIES TABLE (matches Facility.java exactly)
-- =========================================================
CREATE TABLE facilities (
  id           BIGSERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  location     VARCHAR(120) NOT NULL,
  capacity     INTEGER NOT NULL CHECK (capacity > 0),
  is_available BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- NO description column (removed from entity)
);

-- =========================================================
-- USERS TABLE (matches User.java exactly)
-- =========================================================
CREATE TABLE users (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,  -- ADDED to match entity
  role       VARCHAR(30) NOT NULL CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- NO updated_at in entity, so we omit it
);

-- =========================================================
-- BOOKINGS TABLE (matches Booking.java exactly)
-- =========================================================
CREATE TABLE bookings (
  id          BIGSERIAL PRIMARY KEY,
  facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  status      VARCHAR(30) NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING')),
  purpose     VARCHAR(500),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  -- NO updated_at, NO slot in entity
);

-- =========================================================
-- ADDITIONAL CONSTRAINTS
-- =========================================================
ALTER TABLE bookings 
ADD CONSTRAINT valid_time_range CHECK (end_time > start_time);

ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  facility_id WITH =,
  tsrange(date + start_time, date + end_time, '[)') WITH &&
)
WHERE (status != 'CANCELLED');

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX idx_bookings_facility_id ON bookings(facility_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_users_email ON users(email);

-- =========================================================
-- SAMPLE DATA (with passwords)
-- =========================================================
INSERT INTO facilities (name, location, capacity, is_available)
VALUES 
  ('Engineering Lab', 'School of Engineering Block', 40, TRUE),
  ('Pent Room C24', 'Pentagon Hostel', 6, TRUE);

INSERT INTO users (name, email, password, role)
VALUES 
  ('Peggy Esinam Somuah', 'peggy@gmail.com', 'password123', 'STUDENT'),
  ('Samuel Idana', 'samuel@gmail.com', 'password123', 'STUDENT');

INSERT INTO bookings (facility_id, user_id, date, start_time, end_time, status, purpose)
VALUES 
  (1, 1, '2026-02-17', '09:00', '10:00', 'CONFIRMED', 'Lab session'),
  (2, 2, '2026-02-18', '14:00', '16:00', 'CONFIRMED', 'Study group meeting');