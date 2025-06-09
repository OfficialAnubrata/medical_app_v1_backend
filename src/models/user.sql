CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    profile_pic TEXT,
    location_latitude DOUBLE PRECISION,
    location_longitude DOUBLE PRECISION,
    is_google_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id   VARCHAR(100) PRIMARY KEY,
  user_id      VARCHAR(100) NOT NULL,
  full_name    VARCHAR(100) NOT NULL,
  gender       VARCHAR(10),
  dob          DATE,                -- date of birth
  relation     VARCHAR(50),         -- e.g. Self, Father, Mother, etc.
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);
