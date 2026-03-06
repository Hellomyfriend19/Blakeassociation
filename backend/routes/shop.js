import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { COSTS, calculateFee } from '../economy.js';

const router = express.Router();

// Get Shop Prices (Dynamic)
router.get('/prices', authenticateToken, async (req, res) => {
  const vip = await calculateFee(COSTS.VIP_FEE);
  const cosmetic = await calculateFee(COSTS.COSMETIC_BASE);
  res.json({ vip, cosmetic });
});

// Buy VIP
router.post('/vip', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const cost = await calculateFee(COSTS.VIP_FEE);

  db.serialize(() => {
    db.get("SELECT balance, vip_until FROM users WHERE id = ?", [userId], (err, user) => {
      if (err || !user) return res.status(404).json({ error: "User not found" });

      if (user.balance < cost) {
        return res.status(400).json({ error: `Insufficient funds. Cost: ${cost}` });
      }

      // Calculate new expiry
      const now = new Date();
      const currentExpiry = user.vip_until ? new Date(user.vip_until) : now;
      const start = currentExpiry > now ? currentExpiry : now;
      
      const newExpiry = new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 days

      // Execute Transaction
      const txId = `tx_${Date.now()}_shop_vip`;
      
      db.run("UPDATE users SET balance = balance - ?, vip_until = ? WHERE id = ?", 
        [cost, newExpiry.toISOString(), userId]);
      
      db.run(`INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, 'burn_shop_vip', ?)`,
              [txId, userId, 'SYSTEM', req.user.username, 'Shop', cost, now.toISOString()]);

      res.json({ message: "VIP Status Activated", vipUntil: newExpiry.toISOString(), cost });
    });
  });
});

// Buy Cosmetic
router.post('/cosmetic', authenticateToken, async (req, res) => {
  const { type, value } = req.body; // e.g., type: 'nameColor', value: 'gold'
  const userId = req.user.id;
  
  // Simple validation
  const validTypes = ['nameColor', 'title', 'frame'];
  if (!validTypes.includes(type) || !value) {
    return res.status(400).json({ error: "Invalid cosmetic" });
  }

  const cost = await calculateFee(COSTS.COSMETIC_BASE);

  db.serialize(() => {
    db.get("SELECT balance, cosmetics FROM users WHERE id = ?", [userId], (err, user) => {
      if (err || !user) return res.status(404).json({ error: "User not found" });

      if (user.balance < cost) {
        return res.status(400).json({ error: `Insufficient funds. Cost: ${cost}` });
      }

      // Update cosmetics JSON
      let cosmetics = {};
      try {
        cosmetics = JSON.parse(user.cosmetics || '{}');
      } catch (e) {}

      cosmetics[type] = value;
      const jsonStr = JSON.stringify(cosmetics);

      // Execute
      const txId = `tx_${Date.now()}_shop_cosmetic`;
      const now = new Date().toISOString();

      db.run("UPDATE users SET balance = balance - ?, cosmetics = ? WHERE id = ?", 
        [cost, jsonStr, userId]);
      
      db.run(`INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, 'burn_shop_cosmetic', ?)`,
              [txId, userId, 'SYSTEM', req.user.username, 'Shop', cost, now]);

      res.json({ message: "Cosmetic equipped", cosmetics, cost });
    });
  });
});

export default router;