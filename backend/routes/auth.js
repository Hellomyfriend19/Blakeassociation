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

  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;
    const id = generateId();

    await db.query(
      `INSERT INTO users (id, username, password_hash, pin_hash, role, balance, reputation, is_banned)
       VALUES ($1, $2, $3, $4, 'user', 5.0, 1, false)`,
      [id, username, hashedPassword, hashedPin]
    );

    const token = jwt.sign({ id, username, role: 'user' }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, user: { id, username, role: 'user', balance: 5.0, reputation: 1, is_banned: false } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "Username taken" });
    }
    console.error("Registration DB error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password, pin } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (user.is_banned) return res.status(403).json({ error: "Account suspended. Contact administration." });

    let valid = false;
    if (pin) {
      if (!user.pin_hash) return res.status(400).json({ error: "No PIN set for this user" });
      valid = await bcrypt.compare(pin, user.pin_hash);
    } else {
      valid = await bcrypt.compare(password, user.password_hash);
    }

    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

    const { password_hash, pin_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
