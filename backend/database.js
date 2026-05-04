import pkg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        pin_hash VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        balance DECIMAL(10, 2) DEFAULT 0.0,
        reputation INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        vip_until TIMESTAMP WITH TIME ZONE,
        cosmetics JSONB DEFAULT '{}',
        is_banned BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        sender_id VARCHAR(255),
        receiver_id VARCHAR(255),
        sender_name VARCHAR(255),
        receiver_name VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        type VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listings (
        id VARCHAR(255) PRIMARY KEY,
        author_id VARCHAR(255) REFERENCES users(id),
        author_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        boost_until TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        listing_id VARCHAR(255) REFERENCES listings(id),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, listing_id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(255) PRIMARY KEY,
        author_id VARCHAR(255) REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_solved BOOLEAN DEFAULT false,
        views INTEGER DEFAULT 0,
        reward_points DECIMAL(10, 2) DEFAULT 0,
        is_anonymous BOOLEAN DEFAULT false,
        accepted_answer_id VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS answers (
        id VARCHAR(255) PRIMARY KEY,
        question_id VARCHAR(255) REFERENCES questions(id),
        author_id VARCHAR(255) REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_accepted BOOLEAN DEFAULT false,
        is_anonymous BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS votes (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id),
        target_id VARCHAR(255),
        target_type VARCHAR(20),
        type VARCHAR(10) CHECK (type IN ('up', 'down')),
        value INTEGER,
        UNIQUE(user_id, target_id, target_type)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        reporter_id VARCHAR(255) REFERENCES users(id),
        content_id VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database initialized successfully.");

    const adminCheck = await pool.query("SELECT * FROM users WHERE username = $1", ['blake']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Kikolikoioane1', 10);
      const hashedPin = await bcrypt.hash('0000', 10);
      await pool.query(
        `INSERT INTO users (id, username, password_hash, pin_hash, role, balance, reputation)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['usr_admin_001', 'blake', hashedPassword, hashedPin, 'admin', 1000.0, 100]
      );
      console.log("Admin account 'blake' created.");
    }

  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
};

export default pool;
