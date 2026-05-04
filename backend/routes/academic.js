import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/academic/questions - List questions
router.get('/questions', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const result = await db.query(`
      SELECT
        q.id,
        q.title,
        q.description,
        q.reward_points,
        q.created_at,
        q.is_anonymous,
        q.accepted_answer_id,
        CASE WHEN q.is_anonymous = true THEN NULL ELSE u.username END as author_name,
        (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count,
        (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'question' AND target_id = q.id) as score
      FROM questions q
      LEFT JOIN users u ON q.author_id = u.id
      ORDER BY q.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/questions - Create question
router.post('/questions', authenticateToken, async (req, res) => {
  const { title, description, reward_points, is_anonymous } = req.body;
  const author_id = req.user.id;

  if (!title || !description)
    return res.status(400).json({ error: 'Title and description are required' });

  try {
    if (reward_points > 0) {
      const balanceResult = await db.query('SELECT balance FROM users WHERE id = $1', [author_id]);
      const row = balanceResult.rows[0];
      if (!row || row.balance < reward_points)
        return res.status(400).json({ error: 'Insufficient funds for reward' });

      await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [reward_points, author_id]);
    }

    const id = uuidv4();
    await db.query(`
      INSERT INTO questions (id, author_id, title, description, reward_points, is_anonymous)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, author_id, title, description, reward_points || 0, is_anonymous || false]);

    res.status(201).json({ id, message: 'Question created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/academic/questions/:id - Get question details
router.get('/questions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const questionResult = await db.query(`
      SELECT
        q.*,
        CASE WHEN q.is_anonymous = true THEN NULL ELSE u.username END as author_name,
        (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'question' AND target_id = q.id) as score,
        (SELECT value FROM votes WHERE target_type = 'question' AND target_id = q.id AND user_id = $1) as user_vote
      FROM questions q
      LEFT JOIN users u ON q.author_id = u.id
      WHERE q.id = $2
    `, [req.user.id, id]);

    const question = questionResult.rows[0];
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const answersResult = await db.query(`
      SELECT
        a.*,
        CASE WHEN a.is_anonymous = true THEN NULL ELSE u.username END as author_name,
        (SELECT COALESCE(SUM(value), 0) FROM votes WHERE target_type = 'answer' AND target_id = a.id) as score,
        (SELECT value FROM votes WHERE target_type = 'answer' AND target_id = a.id AND user_id = $1) as user_vote
      FROM answers a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.question_id = $2
      ORDER BY (a.id = (SELECT accepted_answer_id FROM questions WHERE id = $2)) DESC, score DESC, a.created_at DESC
    `, [req.user.id, id]);

    res.json({ ...question, answers: answersResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/questions/:id/answers - Submit answer
router.post('/questions/:id/answers', authenticateToken, async (req, res) => {
  const { content, is_anonymous } = req.body;
  const question_id = req.params.id;
  const author_id = req.user.id;

  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const id = uuidv4();
    await db.query(`
      INSERT INTO answers (id, question_id, author_id, content, is_anonymous)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, question_id, author_id, content, is_anonymous || false]);

    res.status(201).json({ id, message: 'Answer submitted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/questions/:id/accept - Accept answer
router.post('/questions/:id/accept', authenticateToken, async (req, res) => {
  const { answer_id } = req.body;
  const question_id = req.params.id;
  const user_id = req.user.id;

  try {
    const questionResult = await db.query('SELECT * FROM questions WHERE id = $1', [question_id]);
    const question = questionResult.rows[0];
    if (!question) return res.status(404).json({ error: 'Question not found' });
    if (question.author_id !== user_id) return res.status(403).json({ error: 'Not authorized' });
    if (question.accepted_answer_id) return res.status(400).json({ error: 'Answer already accepted' });

    const answerResult = await db.query('SELECT author_id FROM answers WHERE id = $1', [answer_id]);
    const answer = answerResult.rows[0];
    if (!answer) return res.status(404).json({ error: 'Answer not found' });

    await db.query('UPDATE questions SET accepted_answer_id = $1 WHERE id = $2', [answer_id, question_id]);

    if (question.reward_points > 0 && answer.author_id !== user_id) {
      await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [question.reward_points, answer.author_id]);

      await db.query(`
        INSERT INTO transactions (id, sender_id, receiver_id, sender_name, receiver_name, amount, type)
        VALUES ($1, $2, $3, 'System', 'User', $4, 'academic_reward')
      `, [uuidv4(), 'system', answer.author_id, question.reward_points]);
    }

    res.json({ message: 'Answer accepted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/academic/vote - Vote on question or answer
router.post('/vote', authenticateToken, async (req, res) => {
  const { target_type, target_id, value } = req.body;
  const user_id = req.user.id;

  if (!['question', 'answer'].includes(target_type) || ![-1, 1].includes(value))
    return res.status(400).json({ error: 'Invalid vote parameters' });

  try {
    await db.query(`
      INSERT INTO votes (id, user_id, target_type, target_id, value)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, target_id, target_type)
      DO UPDATE SET value = EXCLUDED.value
    `, [uuidv4(), user_id, target_type, target_id, value]);

    res.json({ message: 'Vote recorded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
