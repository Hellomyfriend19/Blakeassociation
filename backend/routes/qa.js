import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all questions
router.get('/questions', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        q.id, q.title, q.description, q.created_at, q.is_solved, q.views,
        (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count
      FROM questions q
      ORDER BY q.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single question with answers
router.get('/questions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('UPDATE questions SET views = views + 1 WHERE id = $1', [id]);

    const questionResult = await db.query('SELECT * FROM questions WHERE id = $1', [id]);
    const question = questionResult.rows[0];
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const answersResult = await db.query(`
      SELECT 
        a.id, a.content, a.created_at, a.is_accepted,
        (SELECT COUNT(*) FROM votes WHERE target_id = a.id AND type = 'up') - 
        (SELECT COUNT(*) FROM votes WHERE target_id = a.id AND type = 'down') as score
      FROM answers a
      WHERE a.question_id = $1
      ORDER BY is_accepted DESC, score DESC, created_at ASC
    `, [id]);

    delete question.author_id;
    res.json({ question, answers: answersResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a question
router.post('/questions', authenticateToken, async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description)
    return res.status(400).json({ error: 'Title and description are required' });

  const id = uuidv4();

  try {
    await db.query(
      'INSERT INTO questions (id, author_id, title, description) VALUES ($1, $2, $3, $4)',
      [id, req.user.id, title, description]
    );
    res.json({ id, title, description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if user is author of question
router.get('/questions/:id/check-author', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT author_id FROM questions WHERE id = $1', [req.params.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Question not found' });
    res.json({ is_author: row.author_id === req.user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post an answer
router.post('/questions/:id/answers', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const id = uuidv4();

  try {
    await db.query(
      'INSERT INTO answers (id, question_id, author_id, content) VALUES ($1, $2, $3, $4)',
      [id, req.params.id, req.user.id, content]
    );
    res.json({ id, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vote on an answer
router.post('/answers/:id/vote', authenticateToken, async (req, res) => {
  const { type } = req.body;
  const answer_id = req.params.id;
  const user_id = req.user.id;

  if (!['up', 'down'].includes(type))
    return res.status(400).json({ error: 'Invalid vote type' });

  try {
    const answerResult = await db.query('SELECT author_id FROM answers WHERE id = $1', [answer_id]);
    const answer = answerResult.rows[0];
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    if (answer.author_id === user_id) return res.status(403).json({ error: 'Cannot vote on your own answer' });

    await db.query(`
      INSERT INTO votes (id, user_id, target_id, type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, target_id) DO UPDATE SET type = EXCLUDED.type
    `, [uuidv4(), user_id, answer_id, type]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept an answer
router.post('/answers/:id/accept', authenticateToken, async (req, res) => {
  const answer_id = req.params.id;
  const user_id = req.user.id;

  try {
    const result = await db.query(`
      SELECT a.id as answer_id, a.author_id as answer_author_id, a.question_id,
             q.author_id as question_author_id, q.is_solved
      FROM answers a
      JOIN questions q ON a.question_id = q.id
      WHERE a.id = $1
    `, [answer_id]);

    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: 'Answer not found' });
    if (row.question_author_id !== user_id) return res.status(403).json({ error: 'Only the question author can accept an answer' });
    if (row.answer_author_id === user_id) return res.status(403).json({ error: 'Cannot accept your own answer' });
    if (row.is_solved) return res.status(400).json({ error: 'Question is already solved' });

    await db.query('UPDATE answers SET is_accepted = true WHERE id = $1', [answer_id]);
    await db.query('UPDATE questions SET is_solved = true WHERE id = $1', [row.question_id]);
    await db.query('UPDATE users SET reputation = reputation + 10, balance = balance + 50 WHERE id = $1', [row.answer_author_id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
