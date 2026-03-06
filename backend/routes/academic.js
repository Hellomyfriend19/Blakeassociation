import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/academic/questions - List questions
router.get('/questions', authenticateToken, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const query = `
    SELECT 
      q.id, 
      q.title, 
      q.description, 
      q.reward_points, 
      q.created_at, 
      q.is_anonymous,
      q.accepted_answer_id,
      CASE WHEN q.is_anonymous = 1 THEN NULL ELSE u.username END as author_name,
      (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count,
      (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'question' AND target_id = q.id) as score
    FROM questions q
    LEFT JOIN users u ON q.author_id = u.id
    ORDER BY q.created_at DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/academic/questions - Create question
router.post('/questions', authenticateToken, (req, res) => {
  const { title, description, reward_points, is_anonymous } = req.body;
  const author_id = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  // Check balance if reward is set
  if (reward_points > 0) {
    db.get('SELECT balance FROM users WHERE id = ?', [author_id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row || row.balance < reward_points) {
        return res.status(400).json({ error: 'Insufficient funds for reward' });
      }
      
      // Deduct points immediately to prevent double spending
      db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [reward_points, author_id], (err) => {
        if (err) return res.status(500).json({ error: 'Failed to deduct balance' });
        createQuestion();
      });
    });
  } else {
    createQuestion();
  }

  function createQuestion() {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO questions (id, author_id, title, description, reward_points, is_anonymous, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, author_id, title, description, reward_points || 0, is_anonymous ? 1 : 0, created_at, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id, message: 'Question created' });
    });
    stmt.finalize();
  }
});

// GET /api/academic/questions/:id - Get question details
router.get('/questions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const questionQuery = `
    SELECT 
      q.*, 
      CASE WHEN q.is_anonymous = 1 THEN NULL ELSE u.username END as author_name,
      (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'question' AND target_id = q.id) as score,
      (SELECT value FROM votes WHERE target_type = 'question' AND target_id = q.id AND user_id = ?) as user_vote
    FROM questions q
    LEFT JOIN users u ON q.author_id = u.id
    WHERE q.id = ?
  `;

  const answersQuery = `
    SELECT 
      a.*, 
      CASE WHEN a.is_anonymous = 1 THEN NULL ELSE u.username END as author_name,
      (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'answer' AND target_id = a.id) as score,
      (SELECT value FROM votes WHERE target_type = 'answer' AND target_id = a.id AND user_id = ?) as user_vote
    FROM answers a
    LEFT JOIN users u ON a.author_id = u.id
    WHERE a.question_id = ?
    ORDER BY (a.id = (SELECT accepted_answer_id FROM questions WHERE id = ?)) DESC, score DESC, a.created_at DESC
  `;

  db.get(questionQuery, [req.user.id, id], (err, question) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    db.all(answersQuery, [req.user.id, id, id], (err, answers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...question, answers });
    });
  });
});

// POST /api/academic/questions/:id/answers - Submit answer
router.post('/questions/:id/answers', authenticateToken, (req, res) => {
  const { content, is_anonymous } = req.body;
  const { id: question_id } = req.params;
  const author_id = req.user.id;

  if (!content) return res.status(400).json({ error: 'Content is required' });

  const id = uuidv4();
  const created_at = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO answers (id, question_id, author_id, content, is_anonymous, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, question_id, author_id, content, is_anonymous ? 1 : 0, created_at, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id, message: 'Answer submitted' });
  });
  stmt.finalize();
});

// POST /api/academic/questions/:id/accept - Accept answer
router.post('/questions/:id/accept', authenticateToken, (req, res) => {
  const { answer_id } = req.body;
  const { id: question_id } = req.params;
  const user_id = req.user.id;

  // Verify ownership and that no answer is already accepted
  db.get('SELECT * FROM questions WHERE id = ?', [question_id], (err, question) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.author_id !== user_id) return res.status(403).json({ error: 'Not authorized' });
    if (question.accepted_answer_id) return res.status(400).json({ error: 'Answer already accepted' });

    // Get answer details to transfer reward
    db.get('SELECT author_id FROM answers WHERE id = ?', [answer_id], (err, answer) => {
      if (err || !answer) return res.status(404).json({ error: 'Answer not found' });

      // Start transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Mark accepted
        db.run('UPDATE questions SET accepted_answer_id = ? WHERE id = ?', [answer_id, question_id]);

        // Transfer reward if applicable
        if (question.reward_points > 0 && answer.author_id !== user_id) {
          db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [question.reward_points, answer.author_id]);
          
          // Log transaction
          const transId = uuidv4();
          const timestamp = new Date().toISOString();
          db.run(`
            INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type, timestamp)
            VALUES (?, ?, ?, 'System', 'User', ?, 'academic_reward', ?)
          `, [transId, 'system', answer.author_id, question.reward_points, timestamp]);
        }

        db.run('COMMIT', (err) => {
          if (err) {
            console.error("Transaction commit error:", err);
            return res.status(500).json({ error: 'Transaction failed' });
          }
          res.json({ message: 'Answer accepted' });
        });
      });
    });
  });
});

// POST /api/academic/vote - Vote on question or answer
router.post('/vote', authenticateToken, (req, res) => {
  const { target_type, target_id, value } = req.body; // value: 1 or -1
  const user_id = req.user.id;

  if (!['question', 'answer'].includes(target_type) || ![-1, 1].includes(value)) {
    return res.status(400).json({ error: 'Invalid vote parameters' });
  }

  const id = uuidv4();
  
  // Upsert vote (SQLite syntax for upsert)
  const query = `
    INSERT INTO votes (id, user_id, target_type, target_id, value)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, target_type, target_id) 
    DO UPDATE SET value = excluded.value
  `;

  db.run(query, [id, user_id, target_type, target_id, value], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Vote recorded' });
  });
});

export default router;
