CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('donor', 'ngo', 'volunteer') NOT NULL,
  avatar VARCHAR(1024),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donations (
  id VARCHAR(36) PRIMARY KEY,
  donor_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quantity VARCHAR(255) NOT NULL,
  expiration_date DATE NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  status ENUM('available', 'reserved', 'collected', 'delivered', 'expired', 'cancel_pending', 'cancelled') NOT NULL DEFAULT 'available',
  claimed_by VARCHAR(36),
  transported_by VARCHAR(36),
  cancel_requested_by VARCHAR(36),
  image_url VARCHAR(1024),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (transported_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (cancel_requested_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_claimed_by ON donations(claimed_by);
CREATE INDEX IF NOT EXISTS idx_donations_transported_by ON donations(transported_by);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  donation_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
);
