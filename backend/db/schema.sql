-- CloudLibrary Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  bio TEXT DEFAULT '',
  avatar_color VARCHAR(7) DEFAULT '#3b82f6',
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  genre VARCHAR(100) DEFAULT 'General',
  language VARCHAR(50) DEFAULT 'English',
  year INTEGER,
  pages INTEGER,
  isbn VARCHAR(20),
  cover_color VARCHAR(7) DEFAULT '#3b82f6',
  cover_gradient VARCHAR(100) DEFAULT 'linear-gradient(135deg, #1a237e, #3b82f6)',
  file_path VARCHAR(500),
  file_name VARCHAR(255),
  file_size BIGINT DEFAULT 0,
  file_type VARCHAR(50) DEFAULT 'text/plain',
  gutenberg_id INTEGER,
  gutenberg_url VARCHAR(500),
  download_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Library (saved/reading books)
CREATE TABLE IF NOT EXISTS user_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'saved',
  progress INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Want to Read list
CREATE TABLE IF NOT EXISTS want_to_read (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Book ratings and reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_created ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_library_user ON user_library(user_id);
CREATE INDEX IF NOT EXISTS idx_want_to_read_user ON want_to_read(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id);
