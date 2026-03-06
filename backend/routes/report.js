import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/report
router.post('/', authenticateToken, (req, res) => {
  const { contentId, reason } = req.body;
  const reporterId = req.user.id;

  if (!contentId || !reason) {
    return res.status(400).json({ error: 'Content ID and reason are required' });
  }

  const id = uuidv4();
  const timestamp = new Date().toISOString();

  db.run(
    `INSERT INTO reports (id, reporter_id, content_id, reason, timestamp) VALUES (?, ?, ?, ?, ?)`,
    [id, reporterId, contentId, reason, timestamp],
    function(err) {
      if (err) {
        console.error("Report error:", err);
        return res.status(500).json({ error: 'Failed to submit report' });
      }
      res.json({ message: 'Report submitted successfully' });
    }
  );
});

export default router;
