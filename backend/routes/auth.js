import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database.js';

const router = express.Router();
const SECRET_KEY = 'blake-secret-key-change-in-prod';

const generateId = () => `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

// Register
router.post('/register', async (req, res) => {
  const { username, password, pin } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;
    const id = generateId();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO users (id, username, password_hash, pin_hash, role, balance, reputation, created_at, last_login, is_banned) 
       VALUES (?, ?, ?, ?, 'user', 5.0, 1, ?, ?, 0)`,
      [id, username, hashedPassword, hashedPin, now, now],
      function(err) {
        if (err) {
          if (err.message && err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: "Username taken" });
          }
          console.error("Registration DB error:", err);
          return res.status(500).json({ error: "Database error" });
        }

        const token = jwt.sign({ id, username, role: 'user' }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { id, username, role: 'user', balance: 5.0, reputation: 1, is_banned: 0 } });
      }
    );
  } catch (e) {
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
router.post('/login', (req, res) => {
  const { username, password, pin } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) {
      console.error("Login DB Error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Check Ban Status
    if (user.is_banned === 1) {
      return res.status(403).json({ error: "Account suspended. Contact administration." });
    }

    let valid = false;
    try {
      if (pin) {
        if (!user.pin_hash) return res.status(400).json({ error: "No PIN set for this user" });
        valid = await bcrypt.compare(pin, user.pin_hash);
      } else {
        valid = await bcrypt.compare(password, user.password_hash);
      }
    } catch (e) {
      console.error("Bcrypt compare error:", e);
      return res.status(500).json({ error: "Auth processing error" });
    }

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Update last login
    db.run("UPDATE users SET last_login = ? WHERE id = ?", [new Date().toISOString(), user.id]);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    
    // Sanitize user
    const { password_hash, pin_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });
});

export default router;