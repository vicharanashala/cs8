# FAQ Hub Project Documentation

## 1) Project Overview

FAQ Hub is a full-stack MERN application for:
- FAQ browsing and semantic search
- Community query raising and solution submission
- Admin/staff moderation, approval, analytics, and category management

Core stack:
- Frontend: React + Vite + React Router
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT (access/refresh)

---

## 2) High-Level Structure

```text
e:\faq_project
├── backend
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   └── uploads/
├── frontend
│   ├── index.html
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── pages/
│   └── vite.config.js
├── SPEC.md
└── project.md
```

Frontend main routes (from `frontend/src/App.jsx`):
- `/` FAQ page
- `/raise` Raise query page
- `/resolve` Query resolve/community board
- `/search` Search page
- `/login` Admin login
- `/admin` Admin panel (protected)
- `/admin/analytics` Analytics panel (protected)
- `/leaderboard` Reputation leaderboard

Backend API base:
- `/api/*`

---

## 3) Backend Route Mounts

From `backend/server.js`, mounted route groups:
- `/api/auth`
- `/api/faqs`
- `/api/queries`
- `/api/dashboard`
- `/api/users`
- `/api/announcements`
- `/api/categories`
- `/api/duplicates`
- `/api` (discussion routes)
- `/api/reputation`
- `/api/analytics`
- `/api/admin`
- `/api/search`
- `/api/health` (health check)

---

## 4) Endpoint Details

### 4.1 Auth (`/api/auth`)
- `POST /register` - Register account
- `POST /login` - Login (rate-limited)
- `POST /logout` - Logout (auth required)
- `POST /refresh` - Refresh token
- `GET /me` - Current user profile (auth required)

### 4.2 FAQs (`/api/faqs`)
- `GET /top` - Top helpful FAQs
- `GET /categories/list` - FAQ categories list
- `GET /top-rated` - Top rated FAQs
- `POST /assign-category` - Bulk assign FAQ category (staff/admin)
- `GET /` - Public FAQ listing (supports query params like `search`, `category`, `sort`)
- `GET /all` - Full FAQ listing (staff/admin)
- `GET /:id` - FAQ detail
- `GET /:id/my-vote` - Current user vote
- `POST /` - Create FAQ (staff/admin)
- `PUT /:id` - Update FAQ (staff/admin)
- `DELETE /:id` - Archive FAQ (staff/admin)
- `POST /:id/vote` - Helpful/not helpful vote
- `DELETE /:id/vote` - Remove vote
- `POST /:id/rate` - Rate FAQ (1-5)

### 4.3 Queries (`/api/queries`)
- `GET /similar` - Duplicate detection helper
- `POST /classify` - Auto classify query category
- `GET /` - Query listing (supports filters/scope)
- `GET /:id` - Query detail
- `POST /` - Raise query (multipart, optional screenshot)
- `PUT /:id/solution` - Submit community solution
- `PUT /:id/assign` - Assign query (staff/admin)
- `PUT /:id/approve` - Approve solution (staff/admin)
- `PUT /:id/reject` - Reject solution (staff/admin)
- `PUT /:id/close` - Close query
- `DELETE /:id` - Delete query (staff/admin)

### 4.4 Dashboard (`/api/dashboard`) - auth required
- `GET /stats` - Global summary stats
- `GET /recent-queries` - Recent queries
- `GET /faq-stats` - FAQ stats
- `GET /my-stats` - Personalized user stats
- `GET /my-activity` - User activity timeline
- `GET /recommended-faqs` - Personalized recommended FAQs

### 4.5 Users (`/api/users`) - admin only
- `GET /` - List users
- `PUT /:id/role` - Change role
- `PUT /:id/toggle-active` - Activate/deactivate account

### 4.6 Announcements (`/api/announcements`) - auth required
- `GET /` - List announcements
- `POST /` - Create (staff/admin)
- `DELETE /:id` - Delete (admin)

### 4.7 Categories (`/api/categories`)
- `GET /` - List categories
- `POST /` - Create category (admin)
- `PUT /:id` - Update category (admin)
- `DELETE /:id` - Delete category (admin)

### 4.8 Duplicate Handling (`/api/duplicates`)
- `POST /check` - Duplicate check
- `POST /merge` - Merge duplicate queries (staff/admin)
- `GET /similar/:id` - Find similar for a query (staff/admin)

### 4.9 Discussions (`/api`)
- `GET /queries/:queryId/discussions` - List discussion thread
- `POST /queries/:queryId/discussions` - Create discussion/reply
- `PUT /:id/upvote` - Toggle upvote
- `DELETE /:id` - Delete discussion
- `PUT /:id/verify` - Verify response (staff/admin)

### 4.10 Reputation (`/api/reputation`) - auth required
- `GET /leaderboard` - Leaderboard
- `GET /me` - My reputation
- `GET /user/:id` - User public profile
- `GET /stats` - Reputation stats

### 4.11 Analytics (`/api/analytics`) - staff/admin required
- `GET /overview`
- `GET /query-volume`
- `GET /category-breakdown`
- `GET /status-breakdown`
- `GET /top-contributors`
- `GET /bulk-summary`

### 4.12 Admin Search Ops (`/api/admin`) - staff/admin required
- `POST /search/reindex` - Rebuild search index
- `GET /search/indexed-count` - Index count
- `POST /search/warm-index` - Warm in-memory index

### 4.13 Search (`/api/search`)
- `GET /` - Search endpoint (public)
- `POST /feedback` - Search feedback (auth)
- `GET /logs` - Search logs (admin)
- `GET /stats` - Search stats (admin)

---

## 5) Major Features

### 5.1 FAQ System
- Browse FAQs with category filters
- Search FAQs by question/answer/tags
- Sort options (newest, oldest, most useful/helpful, most viewed, top rated)
- FAQ voting (`helpful` / `not_helpful`)
- FAQ rating (1-5)
- Top FAQs widget

### 5.2 Query Lifecycle
- Users can raise categorized queries with priority and screenshot
- Duplicate detection 
- Community can submit solutions for review
- Admin/staff can assign, approve, reject, close, or delete
- Category-aware review in admin

### 5.3 Admin Panel
- Query review queue with moderation actions
- FAQ CRUD and category assignment
- Categories CRUD
- Announcements management
- Analytics dashboard

### 5.4 Search
- Search endpoint with feedback collection
- Search stats/logs for admin
- Reindex and warm-index operations

### 5.5 Community and Reputation
- Threaded discussions under queries
- Upvote/verify discussion responses
- Reputation scoring and leaderboard

---

## 6) Security and Validation

- JWT authentication middleware (`authenticate`, `optionalAuth`)
- Role guards (`adminOnly`, `staffOrAdmin`)
- Input validation via `express-validator`
- Auth rate limiting on login
- Centralized error handler
- Protected admin/staff endpoints

---

## 7) Notes for Development

- Backend entry: `backend/server.js`
- Frontend entry: `frontend/src/App.jsx`
- API health check: `GET /api/health`
- Uploaded files served from: `/uploads`

