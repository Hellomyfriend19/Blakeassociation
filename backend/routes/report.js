import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/report
router.post('/', authenticateToken, async (req, res) => {
  const { contentId, reason } = req.body;
  const reporterId = req.user.id;

  if (!contentId || !reason)
    return res.status(400).json({ error: 'Content ID and reason are required' });

  try {
    await db.query(
      `INSERT INTO reports (id, reporter_id, content_id, reason) VALUES ($1, $2, $3, $4)`,
      [uuidv4(), reporterId, contentId, reason]
    );
    res.json({ message: 'Report submitted successfully' });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;
