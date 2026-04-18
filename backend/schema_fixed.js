// Esquema de base de datos corregido para mysql2/promise

async function initSchema(pool) {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('donor', 'ngo', 'volunteer') NOT NULL,
      avatar VARCHAR(1024),
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createDonationsTable = `
    CREATE TABLE IF NOT EXISTS donations (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      quantity VARCHAR(255),
      expiration_date DATE NOT NULL,
      location VARCHAR(255) NOT NULL,
      coordinates POINT,
      image_url VARCHAR(1024),
      status ENUM('available', 'reserved', 'collected', 'delivered', 'expired', 'cancel_pending', 'cancelled') DEFAULT 'available',
      donor_id VARCHAR(36) NOT NULL,
      claimed_by VARCHAR(36),
      transported_by VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (transported_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(36) PRIMARY KEY,
      sender_id VARCHAR(36) NOT NULL,
      receiver_id VARCHAR(36) NOT NULL,
      donation_id VARCHAR(36),
      content TEXT NOT NULL,
      type ENUM('text', 'system', 'notification') DEFAULT 'text',
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
    )
  `;

  const createCertificatesTable = `
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      donation_id VARCHAR(36),
      type ENUM('donation', 'transport', 'volunteer') NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      issued_date DATE NOT NULL,
      pdf_url VARCHAR(1024),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE SET NULL
    )
  `;

  const createNotificationsTable = `
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      type ENUM('new_donation', 'donation_claimed', 'donation_collected', 'donation_delivered', 'message_received', 'certificate_issued') NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      related_id VARCHAR(36),
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;

  try {
    console.log('Creando tablas de la base de datos...');
    
    await pool.execute(createUsersTable);
    console.log('Tabla users creada');
    
    await pool.execute(createDonationsTable);
    console.log('Tabla donations creada');
    
    await pool.execute(createMessagesTable);
    console.log('Tabla messages creada');
    
    await pool.execute(createCertificatesTable);
    console.log('Tabla certificates creada');
    
    await pool.execute(createNotificationsTable);
    console.log('Tabla notifications creada');
    
    console.log("Esquema de base de datos inicializado correctamente");
  } catch (error) {
    console.error("Error inicializando esquema:", error);
    throw error;
  }
}

module.exports = { initSchema };
