import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all questions
router.get('/questions', (req, res) => {
  const sql = `
    SELECT 
      q.id, q.title, q.description, q.created_at, q.is_solved, q.views,
      (SELECT COUNT(*) FROM answers WHERE question_id = q.id) as answer_count
    FROM questions q
    ORDER BY q.created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get single question with answers
router.get('/questions/:id', (req, res) => {
  const { id } = req.params;
  
  // Increment views
  db.run('UPDATE questions SET views = views + 1 WHERE id = ?', [id]);

  const questionSql = `SELECT * FROM questions WHERE id = ?`;
  
  db.get(questionSql, [id], (err, question) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    // Get answers with vote counts
    const answersSql = `
      SELECT 
        a.id, a.content, a.created_at, a.is_accepted,
        (SELECT COUNT(*) FROM votes WHERE target_id = a.id AND type = 'up') - 
        (SELECT COUNT(*) FROM votes WHERE target_id = a.id AND type = 'down') as score
      FROM answers a
      WHERE a.question_id = ?
      ORDER BY is_accepted DESC, score DESC, created_at ASC
    `;

    db.all(answersSql, [id], (err, answers) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Check if current user is author (if authenticated)
      // We can't easily do this here without auth middleware on GET, 
      // but we can return a flag if we parse the token manually or just let the frontend handle it by comparing IDs (but we are hiding IDs).
      // Actually, for anonymity, we should NOT return author_id to the frontend for general users.
      // But the frontend needs to know if the current user is the author to show "Accept" button.
      // Solution: Return `is_author: true` if the requester is the author.
      
      // For now, let's just return the data. The frontend will need to hit a separate endpoint or we make this authenticated optional?
      // Let's keep it simple: The frontend will know the current user's ID. 
      // But we are NOT sending back author_id in the response above (SELECT * includes it though).
      // Let's mask author_id.
      
      delete question.author_id; // Hide author ID from public response
      
      res.json({ question, answers });
    });
  });
});

// Create a question
router.post('/questions', authenticateToken, (req, res) => {
  const { title, description } = req.body;
  const id = uuidv4();
  const created_at = new Date().toISOString();

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const stmt = db.prepare('INSERT INTO questions (id, author_id, title, description, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, req.user.id, title, description, created_at, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, title, description, created_at });
  });
  stmt.finalize();
});

// Check if user is author of question (helper route)
router.get('/questions/:id/check-author', authenticateToken, (req, res) => {
  db.get('SELECT author_id FROM questions WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Question not found' });
    res.json({ is_author: row.author_id === req.user.id });
  });
});

// Post an answer
router.post('/questions/:id/answers', authenticateToken, (req, res) => {
  const { content } = req.body;
  const question_id = req.params.id;
  const id = uuidv4();
  const created_at = new Date().toISOString();

  if (!content) return res.status(400).json({ error: 'Content is required' });

  const stmt = db.prepare('INSERT INTO answers (id, question_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, question_id, req.user.id, content, created_at, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id, content, created_at });
  });
  stmt.finalize();
});

// Vote on an answer
router.post('/answers/:id/vote', authenticateToken, (req, res) => {
  const { type } = req.body; // 'up' or 'down'
  const answer_id = req.params.id;
  const user_id = req.user.id;

  if (!['up', 'down'].includes(type)) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  // Prevent self-voting
  db.get('SELECT author_id FROM answers WHERE id = ?', [answer_id], (err, answer) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!answer) return res.status(404).json({ error: 'Answer not found' });
    
    if (answer.author_id === user_id) {
      return res.status(403).json({ error: 'Cannot vote on your own answer' });
    }

    // Insert or Update vote
    // We use REPLACE INTO or INSERT OR REPLACE logic, but SQLite has ON CONFLICT
    // Since we have a UNIQUE constraint on (user_id, target_id)
    
    const stmt = db.prepare(`
      INSERT INTO votes (id, user_id, target_id, type) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, target_id) DO UPDATE SET type = excluded.type
    `);
    
    stmt.run(uuidv4(), user_id, answer_id, type, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
    stmt.finalize();
  });
});

// Accept an answer
router.post('/answers/:id/accept', authenticateToken, (req, res) => {
  const answer_id = req.params.id;
  const user_id = req.user.id;

  // 1. Get answer and question details
  const sql = `
    SELECT a.id as answer_id, a.author_id as answer_author_id, a.question_id, q.author_id as question_author_id, q.is_solved
    FROM answers a
    JOIN questions q ON a.question_id = q.id
    WHERE a.id = ?
  `;

  db.get(sql, [answer_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Answer not found' });

    // 2. Verify requester is the question author
    if (row.question_author_id !== user_id) {
      return res.status(403).json({ error: 'Only the question author can accept an answer' });
    }

    // 3. Prevent self-accept (farming)
    if (row.answer_author_id === user_id) {
      return res.status(403).json({ error: 'Cannot accept your own answer' });
    }

    // 4. Check if already solved
    if (row.is_solved) {
      return res.status(400).json({ error: 'Question is already solved' });
    }

    // 5. Mark answer as accepted and question as solved
    db.serialize(() => {
      db.run('UPDATE answers SET is_accepted = 1 WHERE id = ?', [answer_id]);
      db.run('UPDATE questions SET is_solved = 1 WHERE id = ?', [row.question_id]);

      // 6. Reward the answer author
      // +10 Reputation, +50 Balance
      db.run('UPDATE users SET reputation = reputation + 10, balance = balance + 50 WHERE id = ?', [row.answer_author_id]);
      
      res.json({ success: true });
    });
  });
});

export default router;
