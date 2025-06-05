CREATE TABLE IF NOT EXISTS test_catalog (
  test_id VARCHAR(100) PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  type_of_test VARCHAR(100) NOT NULL,
  components JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_test (
  medical_test_id VARCHAR(100) PRIMARY KEY,
  test_id VARCHAR(100) NOT NULL,
  medicalcentre_id VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_test
    FOREIGN KEY (test_id)
    REFERENCES test_catalog(test_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_centre
    FOREIGN KEY (medicalcentre_id)
    REFERENCES medical_centre(medicalcentre_id)
    ON DELETE CASCADE
);
