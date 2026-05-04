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

  try {
    const result = await db.query("SELECT balance, vip_until FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.balance < cost) return res.status(400).json({ error: `Insufficient funds. Cost: ${cost}` });

    const now = new Date();
    const currentExpiry = user.vip_until ? new Date(user.vip_until) : now;
    const start = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(start.getTime() + (30 * 24 * 60 * 60 * 1000));

    const txId = `tx_${Date.now()}_shop_vip`;

    await db.query("UPDATE users SET balance = balance - $1, vip_until = $2 WHERE id = $3",
      [cost, newExpiry, userId]);

    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'burn_shop_vip')`,
      [txId, userId, 'SYSTEM', req.user.username, 'Shop', cost]
    );

    res.json({ message: "VIP Status Activated", vipUntil: newExpiry.toISOString(), cost });
  } catch (err) {
    res.status(500).json({ error: "Failed to purchase VIP" });
  }
});

// Buy Cosmetic
router.post('/cosmetic', authenticateToken, async (req, res) => {
  const { type, value } = req.body;
  const userId = req.user.id;

  const validTypes = ['nameColor', 'title', 'frame'];
  if (!validTypes.includes(type) || !value)
    return res.status(400).json({ error: "Invalid cosmetic" });

  const cost = await calculateFee(COSTS.COSMETIC_BASE);

  try {
    const result = await db.query("SELECT balance, cosmetics FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.balance < cost) return res.status(400).json({ error: `Insufficient funds. Cost: ${cost}` });

    // cosmetics is already a JS object from JSONB, no need to parse
    const cosmetics = user.cosmetics || {};
    cosmetics[type] = value;

    const txId = `tx_${Date.now()}_shop_cosmetic`;

    await db.query("UPDATE users SET balance = balance - $1, cosmetics = $2 WHERE id = $3",
      [cost, cosmetics, userId]);

    await db.query(
      `INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'burn_shop_cosmetic')`,
      [txId, userId, 'SYSTEM', req.user.username, 'Shop', cost]
    );

    res.json({ message: "Cosmetic equipped", cosmetics, cost });
  } catch (err) {
    res.status(500).json({ error: "Failed to purchase cosmetic" });
  }
});

export default router;
