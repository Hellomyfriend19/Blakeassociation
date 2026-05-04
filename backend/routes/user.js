import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get Current User Data
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, username, role, balance, reputation, created_at, last_login, vip_until, cosmetics, is_banned FROM users WHERE id = $1",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    // cosmetics is already JSONB in Postgres, no need to parse
    if (typeof user.cosmetics === 'string') {
      try { user.cosmetics = JSON.parse(user.cosmetics); } catch { user.cosmetics = {}; }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "DB Error" });
  }
});

// Update Password
router.put('/me/security/password', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "New password must be at least 6 characters" });

  try {
    const result = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) return res.status(500).json({ error: "DB Error" });

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Incorrect current password" });

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// Update PIN
router.put('/me/security/pin', authenticateToken, async (req, res) => {
  const { password, newPin } = req.body;
  const userId = req.user.id;

  if (!newPin || newPin.length !== 4 || isNaN(newPin))
    return res.status(400).json({ error: "PIN must be 4 digits" });

  try {
    const result = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) return res.status(500).json({ error: "DB Error" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const newHash = await bcrypt.hash(newPin, 10);
    await db.query("UPDATE users SET pin_hash = $1 WHERE id = $2", [newHash, userId]);
    res.json({ message: "PIN updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update PIN" });
  }
});

// Transfer Points
router.post('/transfer', authenticateToken, async (req, res) => {
  const { recipientUsername, amount } = req.body;
  const senderId = req.user.id;
  const val = parseFloat(amount);

  if (isNaN(val) || val <= 0) return res.status(400).json({ error: "Invalid amount" });

  try {
    const senderResult = await db.query("SELECT * FROM users WHERE id = $1", [senderId]);
    const sender = senderResult.rows[0];
    if (!sender) return res.status(404).json({ error: "Sender not found" });
    if (sender.balance < val) return res.status(400).json({ error: "Insufficient funds" });
    if (sender.username === recipientUsername) return res.status(400).json({ error: "Cannot transfer to self" });

    const recipientResult = await db.query("SELECT * FROM users WHERE username = $1", [recipientUsername]);
    const recipient = recipientResult.rows[0];
    if (!recipient) return res.status(404).json({ error: "Recipient not found" });

    // Anti-farming check
    const lastTxResult = await db.query(
      "SELECT * FROM transactions WHERE sender_id = $1 AND receiver_id = $2 ORDER BY timestamp DESC LIMIT 1",
      [senderId, recipient.id]
    );
    const lastTx = lastTxResult.rows[0];
    if (lastTx) {
      const diffMinutes = (Date.now() - new Date(lastTx.timestamp).getTime()) / 60000;
      if (diffMinutes < 2) return res.status(400).json({ error: "Anti-farming cooldown: Wait 2 minutes." });
    }

    // Perform Transfer
    const txId = `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRep = val >= 5 ? sender.reputation + 1 : sender.reputation;

    await db.query("UPDATE users SET balance = balance - $1, reputation = $2 WHERE id = $3", [val, newRep, senderId]);
    await db.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [val, recipient.id]);
    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'transfer')`,
      [txId, senderId, recipient.id, sender.username, recipient.username, val]
    );

    res.json({ message: "Transfer successful", transactionId: txId });
  } catch (err) {
    res.status(500).json({ error: "Transfer failed" });
  }
});

// Get Transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM transactions WHERE sender_id = $1 OR receiver_id = $1 ORDER BY timestamp DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "DB Error" });
  }
});

// Admin: Get All Users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "DB Error" });
  }
});

// Admin: Ban/Unban User
router.post('/admin/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) return res.status(400).json({ error: "Cannot ban yourself" });

  try {
    const result = await db.query("SELECT is_banned FROM users WHERE id = $1", [targetId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const newStatus = !user.is_banned;
    const action = newStatus ? 'banned' : 'unbanned';

    await db.query("UPDATE users SET is_banned = $1 WHERE id = $2", [newStatus, targetId]);
    res.json({ message: `User ${action}`, is_banned: newStatus });
  } catch (err) {
    res.status(500).json({ error: "DB Error" });
  }
});

// Admin: Adjust Balance
router.post('/admin/adjust', authenticateToken, requireAdmin, async (req, res) => {
  const { targetUserId, amount } = req.body;
  const val = parseFloat(amount);

  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [targetUserId]);
    const target = result.rows[0];
    if (!target) return res.status(404).json({ error: "User not found" });

    await db.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [val, targetUserId]);

    const txId = `tx_${Date.now()}_adm`;
    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'admin_adjustment')`,
      [txId, req.user.id, targetUserId, 'SYSTEM', target.username, val]
    );

    res.json({ message: "Balance adjusted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to adjust balance" });
  }
});

export default router;
