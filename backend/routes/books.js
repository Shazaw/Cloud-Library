const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/books');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.epub', '.mobi', '.doc', '.docx', '.rtf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, TXT, EPUB, MOBI, DOC, DOCX, RTF files allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// GET /api/books - List all books with search/filter
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, genre, author, language, page = 1, limit = 20, sort = 'created_at' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let conditions = ['b.is_public = true'];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(b.title ILIKE $${idx} OR b.author ILIKE $${idx} OR b.description ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (genre && genre !== 'all') {
      conditions.push(`b.genre ILIKE $${idx}`);
      params.push(genre); idx++;
    }
    if (author) {
      conditions.push(`b.author ILIKE $${idx}`);
      params.push(`%${author}%`); idx++;
    }
    if (language) {
      conditions.push(`b.language ILIKE $${idx}`);
      params.push(language); idx++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const sortMap = { created_at: 'b.created_at DESC', title: 'b.title ASC', downloads: 'b.download_count DESC', year: 'b.year DESC' };
    const orderBy = sortMap[sort] || 'b.created_at DESC';

    const countRes = await db.query(`SELECT COUNT(*) FROM books b ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const booksRes = await db.query(
      `SELECT b.id, b.title, b.author, b.description, b.genre, b.language, b.year, b.pages,
              b.cover_color, b.cover_gradient, b.file_size, b.file_type, b.download_count,
              b.gutenberg_id, b.gutenberg_url, b.created_at,
              u.username as uploaded_by_username, u.display_name as uploaded_by_name
       FROM books b
       LEFT JOIN users u ON b.uploaded_by = u.id
       ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      books: booksRes.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Books list error:', err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/genres - Get all genres
router.get('/genres', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT genre, COUNT(*) as count FROM books WHERE is_public = true GROUP BY genre ORDER BY count DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// GET /api/books/featured - Featured books
router.get('/featured', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.id, b.title, b.author, b.description, b.genre, b.cover_color, b.cover_gradient,
              b.download_count, b.year, b.pages, b.gutenberg_id
       FROM books b WHERE b.is_public = true ORDER BY b.download_count DESC, b.created_at DESC LIMIT 8`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch featured books' });
  }
});

// GET /api/books/:id - Get single book
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.username as uploaded_by_username, u.display_name as uploaded_by_name,
              COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN users u ON b.uploaded_by = u.id
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.id = $1 AND b.is_public = true
       GROUP BY b.id, u.username, u.display_name`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    const book = result.rows[0];
    // Check if user has this in library or want-to-read
    if (req.user) {
      const libCheck = await db.query('SELECT status FROM user_library WHERE user_id = $1 AND book_id = $2', [req.user.id, book.id]);
      const wtrCheck = await db.query('SELECT id FROM want_to_read WHERE user_id = $1 AND book_id = $2', [req.user.id, book.id]);
      const revCheck = await db.query('SELECT rating, review_text FROM reviews WHERE user_id = $1 AND book_id = $2', [req.user.id, book.id]);
      book.in_library = libCheck.rows.length > 0 ? libCheck.rows[0].status : null;
      book.in_want_to_read = wtrCheck.rows.length > 0;
      book.my_review = revCheck.rows[0] || null;
    }
    res.json(book);
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// GET /api/books/:id/reviews - Get reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.rating, r.review_text, r.created_at,
              u.username, u.display_name, u.avatar_color
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.book_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/books/:id/reviews - Add review
router.post('/:id/reviews', authenticate, async (req, res) => {
  try {
    const { rating, review_text } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const result = await db.query(
      `INSERT INTO reviews (user_id, book_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, book_id) DO UPDATE SET rating = $3, review_text = $4, created_at = NOW()
       RETURNING *`,
      [req.user.id, req.params.id, rating, review_text || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// GET /api/books/:id/download - Download book file
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books WHERE id = $1 AND is_public = true', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    const book = result.rows[0];

    // Increment download count
    await db.query('UPDATE books SET download_count = download_count + 1 WHERE id = $1', [book.id]);

    // If it has a local file, serve it
    if (book.file_path) {
      const filePath = path.join(__dirname, '../../uploads/books', book.file_path);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.txt"`);
        res.setHeader('Content-Type', book.file_type || 'text/plain');
        return res.sendFile(filePath);
      }
    }

    // Redirect to Gutenberg if available
    if (book.gutenberg_url) {
      return res.redirect(book.gutenberg_url);
    }

    res.status(404).json({ error: 'File not available' });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// POST /api/books/upload - Upload a book
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { title, author, description, genre, language, year, pages, isbn } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'Title and author are required' });
    if (!req.file) return res.status(400).json({ error: 'Book file is required' });

    const colors = [
      ['#1a237e', '#3b82f6'], ['#4a1942', '#8b5cf6'], ['#1b5e20', '#10b981'],
      ['#e65100', '#f59e0b'], ['#b71c1c', '#ef4444'], ['#006064', '#06b6d4'],
      ['#37474f', '#78909c'], ['#4e342e', '#a1887f']
    ];
    const colorPair = colors[Math.floor(Math.random() * colors.length)];

    const result = await db.query(
      `INSERT INTO books (title, author, description, genre, language, year, pages, isbn,
                          cover_color, cover_gradient, file_path, file_name, file_size, file_type,
                          uploaded_by, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
       RETURNING *`,
      [
        title, author, description || '', genre || 'General',
        language || 'English', year ? parseInt(year) : null, pages ? parseInt(pages) : null,
        isbn || null, colorPair[1],
        `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
        req.file.filename, req.file.originalname, req.file.size,
        req.file.mimetype, req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file) {
      const filePath = path.join(__dirname, '../../uploads/books', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// DELETE /api/books/:id - Delete book (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    const book = result.rows[0];
    if (book.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete file if exists
    if (book.file_path) {
      const filePath = path.join(__dirname, '../../uploads/books', book.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.query('DELETE FROM books WHERE id = $1', [req.params.id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
