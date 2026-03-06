import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get Current User Data
router.get('/me', authenticateToken, (req, res) => {
  db.get("SELECT id, username, role, balance, reputation, created_at, last_login, vip_until, cosmetics, is_banned FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });
    
    // Parse cosmetics for frontend
    try {
      user.cosmetics = JSON.parse(user.cosmetics || '{}');
    } catch (e) {
      user.cosmetics = {};
    }
    
    res.json(user);
  });
});

// Update Password
router.put('/me/security/password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  db.get("SELECT password_hash FROM users WHERE id = ?", [userId], async (err, user) => {
    if (err || !user) return res.status(500).json({ error: "DB Error" });

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Incorrect current password" });

    const newHash = await bcrypt.hash(newPassword, 10);
    db.run("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update password" });
      res.json({ message: "Password updated successfully" });
    });
  });
});

// Update PIN (Requires Password for security)
router.put('/me/security/pin', authenticateToken, (req, res) => {
  const { password, newPin } = req.body;
  const userId = req.user.id;

  if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
    return res.status(400).json({ error: "PIN must be 4 digits" });
  }

  db.get("SELECT password_hash FROM users WHERE id = ?", [userId], async (err, user) => {
    if (err || !user) return res.status(500).json({ error: "DB Error" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const newHash = await bcrypt.hash(newPin, 10);
    db.run("UPDATE users SET pin_hash = ? WHERE id = ?", [newHash, userId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update PIN" });
      res.json({ message: "PIN updated successfully" });
    });
  });
});

// Transfer Points
router.post('/transfer', authenticateToken, (req, res) => {
  const { recipientUsername, amount } = req.body;
  const senderId = req.user.id;
  const val = parseFloat(amount);

  if (isNaN(val) || val <= 0) return res.status(400).json({ error: "Invalid amount" });

  db.serialize(() => {
    db.get("SELECT * FROM users WHERE id = ?", [senderId], (err, sender) => {
      if (err || !sender) return res.status(404).json({ error: "Sender not found" });
      if (sender.balance < val) return res.status(400).json({ error: "Insufficient funds" });
      if (sender.username === recipientUsername) return res.status(400).json({ error: "Cannot transfer to self" });

      db.get("SELECT * FROM users WHERE username = ?", [recipientUsername], (err, recipient) => {
        if (err || !recipient) return res.status(404).json({ error: "Recipient not found" });

        // Anti-farming check: Last transaction to this user < 2 mins?
        db.get(
          "SELECT * FROM transactions WHERE sender_id = ? AND receiver_id = ? ORDER BY timestamp DESC LIMIT 1",
          [senderId, recipient.id],
          (err, lastTx) => {
            if (lastTx) {
              const diffMinutes = (Date.now() - new Date(lastTx.timestamp).getTime()) / 60000;
              if (diffMinutes < 2) {
                return res.status(400).json({ error: "Anti-farming cooldown: Wait 2 minutes." });
              }
            }

            // Perform Transfer
            const now = new Date().toISOString();
            const txId = `tx_${Date.now()}_${Math.floor(Math.random()*1000)}`;
            
            // Reputation logic
            const newRep = val >= 5 ? sender.reputation + 1 : sender.reputation;

            db.run("UPDATE users SET balance = balance - ?, reputation = ? WHERE id = ?", [val, newRep, senderId]);
            db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [val, recipient.id]);
            
            db.run(
              `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, 'transfer', ?)`,
              [txId, senderId, recipient.id, sender.username, recipient.username, val, now]
            );

            res.json({ message: "Transfer successful", transactionId: txId });
          }
        );
      });
    });
  });
});

// Get Transactions
router.get('/transactions', authenticateToken, (req, res) => {
  db.all(
    "SELECT * FROM transactions WHERE sender_id = ? OR receiver_id = ? ORDER BY timestamp DESC",
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "DB Error" });
      res.json(rows);
    }
  );
});

// Admin: Get All Users
router.get('/admin/users', authenticateToken, requireAdmin, (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    res.json(rows);
  });
});

// Admin: Ban/Unban User
router.post('/admin/users/:id/ban', authenticateToken, requireAdmin, (req, res) => {
  const targetId = req.params.id;
  
  if (targetId === req.user.id) {
    return res.status(400).json({ error: "Cannot ban yourself" });
  }

  db.get("SELECT is_banned FROM users WHERE id = ?", [targetId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });
    
    // Toggle ban status
    const newStatus = user.is_banned === 1 ? 0 : 1;
    const action = newStatus === 1 ? 'banned' : 'unbanned';

    db.run("UPDATE users SET is_banned = ? WHERE id = ?", [newStatus, targetId], (err) => {
      if (err) return res.status(500).json({ error: "DB Error" });
      res.json({ message: `User ${action}`, is_banned: newStatus });
    });
  });
});

// Admin: Adjust Balance
router.post('/admin/adjust', authenticateToken, requireAdmin, (req, res) => {
  const { targetUserId, amount } = req.body;
  const val = parseFloat(amount);
  
  db.get("SELECT * FROM users WHERE id = ?", [targetUserId], (err, target) => {
    if (!target) return res.status(404).json({ error: "User not found" });
    
    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [val, targetUserId]);
    
    const txId = `tx_${Date.now()}_adm`;
    const now = new Date().toISOString();
    
    db.run(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, 'admin_adjustment', ?)`,
      [txId, req.user.id, targetUserId, 'SYSTEM', target.username, val, now]
    );

    res.json({ message: "Balance adjusted" });
  });
});

export default router;