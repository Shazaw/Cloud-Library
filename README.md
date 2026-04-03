# CloudLibrary — Open Book Space

A full-stack public cloud library platform for discovering, downloading and sharing public domain literature. Built as a Cloud Computing project for UGM Semester 4.

**Live URL:** http://157.230.244.123
**Server:** DigitalOcean Droplet — Ubuntu 24.04 LTS (1 vCPU / 1 GB RAM)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [API Reference](#api-reference)
8. [Authentication Flow](#authentication-flow)
9. [File Upload & Download Flow](#file-upload--download-flow)
10. [Features](#features)
11. [Setup & Deployment](#setup--deployment)
12. [Environment Variables](#environment-variables)
13. [Project Structure](#project-structure)

---

## Project Overview

CloudLibrary is a web application that provides free access to over 240 public domain books. Users can:

- Browse, search and filter a library of classical literature
- Download books directly (linked to Project Gutenberg)
- Create personal accounts with their own library
- Track reading progress (Saved / Reading / Finished)
- Maintain a Want to Read list
- Upload their own public domain books
- Write reviews and rate books

The platform uses a black-and-blue minimalist design inspired by Goodreads and Open Library, with real book cover images loaded from Project Gutenberg.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20 LTS |
| **Framework** | Express.js 4 |
| **Database** | PostgreSQL 16 |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **File Upload** | Multer (50 MB limit) |
| **Process Manager** | PM2 |
| **Reverse Proxy** | Nginx |
| **Frontend** | Vanilla JS SPA (no framework) |
| **Fonts** | Inter + Playfair Display + JetBrains Mono |
| **Hosting** | DigitalOcean (Ubuntu 24.04) |

---

## Architecture

```
Internet
    │
    ▼
┌─────────────┐
│    Nginx    │  :80  → reverse proxy
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Node.js / Express │  :3001
│   (PM2 managed)     │
│                     │
│  ┌───────────────┐  │
│  │  Static SPA   │  │  /var/www/cloudlibrary/frontend/public/
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  REST API     │  │  /api/*
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │  File Uploads │  │  /uploads/books/
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    PostgreSQL 16     │  localhost:5432
│    cloudlibrary DB   │
└─────────────────────┘
```

**Request flow:**
1. Browser requests `http://157.230.244.123/`
2. Nginx forwards all traffic to Express on port 3001
3. Express serves the static SPA (`index.html`) for all non-API routes
4. The SPA uses `history.pushState` routing — Nginx passes all unknown paths to Express which returns `index.html`
5. API calls (`/api/*`) are handled by Express route handlers, which query PostgreSQL

---

## Database Schema

### `users` table

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, `uuid_generate_v4()` |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL |
| `email` | VARCHAR(255) | UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `display_name` | VARCHAR(100) | |
| `bio` | TEXT | DEFAULT '' |
| `avatar_color` | VARCHAR(7) | DEFAULT '#3b82f6' |
| `role` | VARCHAR(20) | DEFAULT 'user' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

### `books` table

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, `uuid_generate_v4()` |
| `title` | VARCHAR(500) | NOT NULL |
| `author` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | DEFAULT '' |
| `genre` | VARCHAR(100) | DEFAULT 'General' |
| `language` | VARCHAR(50) | DEFAULT 'English' |
| `year` | INTEGER | |
| `pages` | INTEGER | |
| `isbn` | VARCHAR(20) | |
| `cover_color` | VARCHAR(7) | DEFAULT '#3b82f6' |
| `cover_gradient` | VARCHAR(100) | DEFAULT gradient |
| `file_path` | VARCHAR(500) | |
| `file_name` | VARCHAR(255) | |
| `file_size` | BIGINT | DEFAULT 0 |
| `file_type` | VARCHAR(50) | DEFAULT 'text/plain' |
| `gutenberg_id` | INTEGER | |
| `gutenberg_url` | VARCHAR(500) | |
| `download_count` | INTEGER | DEFAULT 0 |
| `is_public` | BOOLEAN | DEFAULT true |
| `uploaded_by` | UUID | REFERENCES users(id) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

### `user_library` table

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, `uuid_generate_v4()` |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `book_id` | UUID | NOT NULL, REFERENCES books(id) ON DELETE CASCADE |
| `status` | VARCHAR(20) | DEFAULT 'saved' — `saved \| reading \| finished` |
| `progress` | INTEGER | DEFAULT 0 (page number) |
| `added_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(user_id, book_id) |

### `want_to_read` table

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, `uuid_generate_v4()` |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `book_id` | UUID | NOT NULL, REFERENCES books(id) ON DELETE CASCADE |
| `added_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(user_id, book_id) |

### `reviews` table

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, `uuid_generate_v4()` |
| `user_id` | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| `book_id` | UUID | NOT NULL, REFERENCES books(id) ON DELETE CASCADE |
| `rating` | INTEGER | CHECK (rating >= 1 AND rating <= 5) |
| `review_text` | TEXT | DEFAULT '' |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(user_id, book_id) |

---

## Backend Implementation

### File Deletion Flow

```
User requests DELETE /api/books/:id
        │
        ▼
Authenticate JWT token
        │
        ▼
Find book in DB by ID
        │
   Not found? ──► 404 Book not found
        │
        ▼
Check: uploaded_by == user.id  OR  user.role == 'admin'
        │
   Not authorized? ──► 403 Not Authorized
        │
        ▼
Delete physical file from /uploads/books/ (if exists)
        │
        ▼
DELETE FROM books WHERE id = $1
        │
        ▼
200 { message: 'Book deleted successfully' }
```

### File Upload Flow

```
User POST /api/books/upload (multipart/form-data)
        │
        ▼
Authenticate JWT token
        │
        ▼
Multer validates file:
  - Max size: 50 MB
  - Allowed: .pdf .txt .epub .mobi .doc .docx .rtf
        │
   Invalid? ──► 400 error message
        │
        ▼
Validate required fields: title, author
        │
   Missing? ──► 400 "Title and author are required"
        │
        ▼
Save file to /var/www/cloudlibrary/uploads/books/
  (filename: timestamp-random.ext)
        │
        ▼
INSERT INTO books (title, author, description, genre, language,
  year, pages, cover_color, cover_gradient, file_path,
  file_name, file_size, file_type, is_public, uploaded_by)
        │
   DB error? ──► Delete uploaded file, return 500
        │
        ▼
201 { message: 'Book uploaded successfully', book: {...} }
```

### Authentication Flow

```
Registration: POST /api/auth/register
  1. Check username + email not already taken
  2. bcryptjs.hash(password, 12)
  3. INSERT INTO users
  4. Sign JWT: { userId, username, role } — 7 day expiry
  5. Return { token, user }

Login: POST /api/auth/login
  1. Find user by username OR email
  2. bcryptjs.compare(password, hash)
  3. Sign JWT — 7 day expiry
  4. Return { token, user }

Protected routes: Bearer token in Authorization header
  → middleware/auth.js verifies JWT, attaches req.user
  → optionalAuth: proceeds even without token (sets req.user = null)
```

---

## Frontend Implementation

### SPA Architecture

The frontend is a single-page application using vanilla JavaScript with:

- **Client-side router** — `history.pushState` with pattern matching for dynamic routes (`/book/:id`)
- **`<template>` tags** — Each page is a `<template>` in `index.html`, cloned into `#app` on navigation
- **Module pattern** — `API` object wraps all fetch calls with auth token injection
- **Component functions** — `bookCard(book)` generates HTML strings for reuse across pages

### Pages

| Route | Description |
|---|---|
| `/` | Home — Featured, Most Downloaded, Browse by Genre, Browse by Era, New Additions, genre rows (Adventure, Horror, Romance, Sci-Fi, Philosophy), How It Works, CTA |
| `/library` | Full library with search, genre filter pills, sort dropdown, pagination |
| `/book/:id` | Book detail — cover, metadata, rating, description, download, add to library/WTR, reviews |
| `/login` | Login form with email/username support |
| `/register` | Registration form |
| `/profile` | Profile with stats bento grid, avatar color picker, bio/name edit, password change |
| `/my-library` | Tabbed: Saved / Reading / Finished |
| `/want-to-read` | Want to Read list |
| `/contributions` | Books uploaded by the user, with delete action |
| `/upload` | Multi-step upload wizard: File → Metadata → Preview |
| `/*` | 404 page |

### Design System

The CSS follows a shadcn/ui token architecture:

```css
:root {
  --background:  222 47% 4%;   /* near-black navy */
  --foreground:  210 40% 98%;  /* off-white */
  --card:        222 47% 7%;
  --primary:     217 91% 60%;  /* electric blue */
  --border:      217 33% 13%;
  --radius:      0.75rem;
  --font-sans:   'Inter', system-ui;
  --font-display:'Playfair Display', Georgia;
}
```

Key UI patterns:
- Book cards in portrait 2:3 ratio with real cover images from Project Gutenberg
- Fallback gradient covers when no image available
- Horizontal `book-row` grids for genre sections
- Era cards with year ranges for chronological browsing
- How-It-Works cards explaining core features
- Stats banner showing live counts
- Glassmorphism nav with scroll detection
- Toast notification system (success / error / warning / info)
- Multi-step upload wizard with step indicators

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | Required | Get current user |

**Register body:** `{ username, email, password, display_name? }`
**Login body:** `{ login (username or email), password }`

### Books

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/books` | Optional | List books (search, filter, paginate) |
| GET | `/api/books/featured` | None | Top 8 by downloads |
| GET | `/api/books/genres` | None | Genre list with counts |
| GET | `/api/books/:id` | Optional | Single book detail |
| GET | `/api/books/:id/reviews` | None | Book reviews |
| POST | `/api/books/:id/reviews` | Required | Add/update review |
| GET | `/api/books/:id/download` | None | Download file or redirect to Gutenberg |
| POST | `/api/books/upload` | Required | Upload book (multipart/form-data) |
| DELETE | `/api/books/:id` | Required | Delete book (owner or admin) |

**GET /api/books query params:**
- `search` — full-text search across title, author, description
- `genre` — filter by genre
- `author` — filter by author
- `language` — filter by language
- `page` — page number (default: 1)
- `limit` — per page (default: 20)
- `sort` — `created_at` \| `title` \| `downloads` \| `year`

**Response format:**
```json
{
  "books": [...],
  "total": 241,
  "page": 1,
  "pages": 13
}
```

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/:id/profile` | None | Public profile |
| PUT | `/api/users/profile` | Required | Update display_name, bio, avatar_color |
| PUT | `/api/users/password` | Required | Change password |
| GET | `/api/users/library` | Required | User's library |
| POST | `/api/users/library/:bookId` | Required | Add to library with status |
| DELETE | `/api/users/library/:bookId` | Required | Remove from library |
| GET | `/api/users/want-to-read` | Required | Want to Read list |
| POST | `/api/users/want-to-read/:bookId` | Required | Add to Want to Read |
| DELETE | `/api/users/want-to-read/:bookId` | Required | Remove from Want to Read |
| GET | `/api/users/contributions` | Required | Books uploaded by user |

---

## Features

### Core Features

- **241+ public domain books** pre-seeded from Project Gutenberg (expanded from initial 25)
- **Real book cover images** loaded from `gutenberg.org/cache/epub/{id}/pg{id}.cover.medium.jpg`
- **Gradient fallback covers** when no Gutenberg image is available
- **Search** across title, author and description
- **Genre filtering** with 13+ categories
- **Sort** by newest, title A–Z, most downloaded, publication year
- **Pagination** (20 per page)
- **Book download** — serves local file or redirects to Gutenberg

### User Features

- **JWT authentication** — 7-day tokens, stored in localStorage
- **Personal library** with three statuses: Saved / Reading / Finished
- **Want to Read list** — separate from library
- **Community reviews** — 1–5 star rating + text review (one per user per book)
- **Contributions page** — manage books you've uploaded
- **Profile customization** — display name, bio, avatar color

### Homepage Sections

1. **Featured Books** — top 8 by download count
2. **Most Downloaded** — sorted by all-time downloads
3. **Browse by Genre** — card grid with book counts per genre
4. **Browse by Era** — 6 historical periods from Ancient World to Modern Age
5. **Recently Added** — newest books
6. **Adventure & Action** — genre row
7. **Horror & Gothic** — genre row
8. **Romance & Love** — genre row
9. **Science Fiction** — genre row
10. **Philosophy & Ideas** — genre row
11. **Community Stats Banner** — live counts
12. **How It Works** — 4-step explainer

---

## Setup & Deployment

### Prerequisites

- Ubuntu 24.04 LTS
- Node.js 20 LTS
- PostgreSQL 16
- Nginx
- PM2 (`npm install -g pm2`)

### Server Setup

```bash
# 1. Install dependencies
apt update && apt install -y nodejs npm postgresql nginx

# 2. Clone/upload project to /var/www/cloudlibrary

# 3. Create database
sudo -u postgres psql
CREATE DATABASE cloudlibrary;
CREATE USER cloudlib_user WITH PASSWORD 'CloudLib@2024!';
GRANT ALL PRIVILEGES ON DATABASE cloudlibrary TO cloudlib_user;
\c cloudlibrary
GRANT ALL ON SCHEMA public TO cloudlib_user;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q

# 4. Run schema
cd /var/www/cloudlibrary/backend
PGPASSWORD='CloudLib@2024!' psql -h localhost -U cloudlib_user -d cloudlibrary -f db/schema.sql

# 5. Seed initial books
node db/seed.js

# 6. Install backend dependencies
npm install

# 7. Start with PM2
pm2 start server.js --name cloudlibrary
pm2 save
pm2 startup

# 8. Configure Nginx
```

### Nginx Configuration

`/etc/nginx/sites-available/cloudlibrary`:

```nginx
server {
    listen 80;
    server_name 157.230.244.123;

    client_max_body_size 55M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/cloudlibrary /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## Environment Variables

`backend/.env`:

```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cloudlibrary
DB_USER=cloudlib_user
DB_PASSWORD=CloudLib@2024!
JWT_SECRET=cl0udl1br4ry_jwt_s3cr3t_k3y_2024_UGM
```

---

## Project Structure

```
/var/www/cloudlibrary/
├── backend/
│   ├── server.js              # Express entry point (port 3001)
│   ├── .env                   # Environment variables
│   ├── package.json
│   ├── db/
│   │   ├── index.js           # PostgreSQL connection pool
│   │   ├── schema.sql         # All table definitions + indexes
│   │   └── seed.js            # Initial 25 seed books
│   ├── middleware/
│   │   └── auth.js            # JWT authenticate + optionalAuth middleware
│   └── routes/
│       ├── auth.js            # /api/auth/*
│       ├── books.js           # /api/books/*
│       └── users.js           # /api/users/*
├── frontend/
│   └── public/
│       ├── index.html         # SPA shell with all page <template> tags
│       ├── css/
│       │   └── style.css      # Full design system (~1100 lines)
│       └── js/
│           ├── api.js         # API client (fetch wrapper with auth)
│           └── app.js         # SPA router + all page handlers
└── uploads/
    └── books/                 # Uploaded book files (multer destination)

Local (development):
cloudlibrary/
├── frontend/public/           # Local copies of deployed files
├── backend-books.js           # Local copy of routes/books.js
├── seed-books.py              # Python script to seed 216 additional books
└── preview-proxy.py           # Local dev server (port 4200, proxies API)

.claude/
└── launch.json                # Preview plugin config
```

---

## Book Collection

The library contains 241+ books spanning:

| Genre | Count |
|---|---|
| Classic | 50+ |
| Adventure | 35+ |
| Romance | 25+ |
| Horror & Gothic | 20+ |
| Science Fiction | 20+ |
| Historical Fiction | 15+ |
| Drama (Shakespeare) | 12+ |
| Poetry | 15+ |
| Philosophy | 15+ |
| Mystery | 12+ |
| Biography | 8+ |
| Satire | 8+ |
| Fantasy | 8+ |

Featured authors include: Jane Austen, Charles Dickens, William Shakespeare, Mark Twain, Leo Tolstoy, Fyodor Dostoevsky, Victor Hugo, Jules Verne, H.G. Wells, Arthur Conan Doyle, Edgar Allan Poe, Emily Brontë, Charlotte Brontë, Thomas Hardy, George Eliot, Oscar Wilde, Jack London, Edith Wharton, Henry James, and many more.

All books are in the **public domain** and sourced from **Project Gutenberg** (gutenberg.org).

---

## Cloud Computing Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **Cloud Hosting** | DigitalOcean Droplet (IaaS) |
| **Load Balancing / Reverse Proxy** | Nginx in front of Node.js |
| **Process Management** | PM2 auto-restart + startup |
| **Database as a Service** | PostgreSQL on same server (can migrate to managed DB) |
| **File Storage** | Server-side file storage in `/uploads/books/` |
| **REST API** | Express.js RESTful endpoints |
| **Stateless Auth** | JWT tokens — server stores no session state |
| **CDN / External Assets** | Book covers served from Gutenberg CDN |
| **Cloud Deployment Pipeline** | SSH → SFTP file upload → PM2 restart |

---

*CloudLibrary — UGM Cloud Computing Project, Semester 4*
