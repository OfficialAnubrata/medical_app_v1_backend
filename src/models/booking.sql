CREATE TABLE IF NOT EXISTS test_bookings (
    booking_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    patient_id VARCHAR(100) NOT NULL,
    address_id VARCHAR(100),                          -- for home collection
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_date TIMESTAMP,                         -- desired appointment
    status VARCHAR(50) DEFAULT 'Pending',             -- Pending, Confirmed, Cancelled, Completed
    payment_status VARCHAR(50) DEFAULT 'Unpaid',      -- Unpaid, Paid, Failed
    payment_mode VARCHAR(50),                         -- Cash, Card, UPI
    transaction_id VARCHAR(100),                      -- Reference ID from gateway
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_address FOREIGN KEY (address_id) REFERENCES addresses(address_id) ON DELETE SET NULL,

    CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
    CHECK (payment_status IN ('Unpaid', 'Paid', 'Failed'))
);

CREATE TABLE IF NOT EXISTS test_booking_items (
    item_id VARCHAR(100) PRIMARY KEY,
    booking_id VARCHAR(100) NOT NULL,
    medical_test_id VARCHAR(100) NOT NULL,
    test_price NUMERIC(10, 2) NOT NULL,
    report_link TEXT,
    status VARCHAR(50) DEFAULT 'Pending',             -- Optional: track per-test status

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking FOREIGN KEY (booking_id) REFERENCES test_bookings(booking_id) ON DELETE CASCADE,
    CONSTRAINT fk_medical_test FOREIGN KEY (medical_test_id) REFERENCES medical_test(medical_test_id) ON DELETE CASCADE,

    CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled'))
);
