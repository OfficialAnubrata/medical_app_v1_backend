CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(15) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT,  -- no NOT NULL here
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    profile_pic TEXT,
    location_latitude DOUBLE PRECISION,
    location_longitude DOUBLE PRECISION,
    is_google_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (
      (is_google_user = TRUE AND password IS NULL) OR
      (is_google_user = FALSE AND password IS NOT NULL)
    )
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

CREATE TABLE IF NOT EXISTS addresses (
  address_id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  label VARCHAR(100), -- e.g. Home, Office, Lab, etc.
  address_line VARCHAR(255) NOT NULL,
  area VARCHAR(100),
  city VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  landmark VARCHAR(255),
  contact_number VARCHAR(15),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id VARCHAR(100) PRIMARY KEY,
  patient_id VARCHAR(100) NOT NULL,
  prescription_file TEXT NOT NULL, -- Path or URL to uploaded file (image or PDF)
  prescription_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_prescription_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE CASCADE
);
