CREATE TABLE IF NOT EXISTS medical_centre (
    medicalcentre_id VARCHAR(100) PRIMARY KEY,
    medicalcentre_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    logo TEXT,
    mobile_no VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NULL,
    mclongitude DOUBLE PRECISION,
    mclatitude DOUBLE PRECISION,
    address_line TEXT,
    area VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
