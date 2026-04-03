const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:id/profile - Get user profile
router.get('/:id/profile', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_color, u.created_at,
              COUNT(DISTINCT ul.book_id) as library_count,
              COUNT(DISTINCT wtr.book_id) as want_to_read_count,
              COUNT(DISTINCT b.id) as contributions_count
       FROM users u
       LEFT JOIN user_library ul ON u.id = ul.user_id
       LEFT JOIN want_to_read wtr ON u.id = wtr.user_id
       LEFT JOIN books b ON u.id = b.uploaded_by
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile - Update own profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { display_name, bio, avatar_color } = req.body;
    const result = await db.query(
      `UPDATE users SET display_name = COALESCE($1, display_name),
                        bio = COALESCE($2, bio),
                        avatar_color = COALESCE($3, avatar_color),
                        updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, display_name, bio, avatar_color, created_at`,
      [display_name, bio, avatar_color, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/password - Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/users/library - Get my library
router.get('/library', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.title, b.author, b.genre, b.cover_color, b.cover_gradient,
              b.year, b.download_count, ul.status, ul.progress, ul.added_at
       FROM user_library ul JOIN books b ON ul.book_id = b.id
       WHERE ul.user_id = $1 ORDER BY ul.added_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

// POST /api/users/library/:bookId - Add to library
router.post('/library/:bookId', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      `INSERT INTO user_library (user_id, book_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, book_id) DO UPDATE SET status = $3
       RETURNING *`,
      [req.user.id, req.params.bookId, status || 'saved']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to library' });
  }
});

// DELETE /api/users/library/:bookId - Remove from library
router.delete('/library/:bookId', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM user_library WHERE user_id = $1 AND book_id = $2', [req.user.id, req.params.bookId]);
    res.json({ message: 'Removed from library' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from library' });
  }
});

// GET /api/users/want-to-read - Get want to read list
router.get('/want-to-read', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.title, b.author, b.genre, b.cover_color, b.cover_gradient,
              b.year, b.description, wtr.added_at
       FROM want_to_read wtr JOIN books b ON wtr.book_id = b.id
       WHERE wtr.user_id = $1 ORDER BY wtr.added_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch want to read list' });
  }
});

// POST /api/users/want-to-read/:bookId - Add to want to read
router.post('/want-to-read/:bookId', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO want_to_read (user_id, book_id) VALUES ($1, $2)
       ON CONFLICT (user_id, book_id) DO NOTHING RETURNING *`,
      [req.user.id, req.params.bookId]
    );
    res.json({ message: 'Added to want to read', added: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to want to read' });
  }
});

// DELETE /api/users/want-to-read/:bookId - Remove from want to read
router.delete('/want-to-read/:bookId', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM want_to_read WHERE user_id = $1 AND book_id = $2', [req.user.id, req.params.bookId]);
    res.json({ message: 'Removed from want to read' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove' });
  }
});

// GET /api/users/contributions - Get my uploaded books
router.get('/contributions', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, author, genre, cover_color, cover_gradient, year, download_count,
              file_size, created_at
       FROM books WHERE uploaded_by = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

module.exports = router;
