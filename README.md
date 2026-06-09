🎓 User Support & FAQ Management System
A polished, enterprise-grade User Support Portal built on the MERN stack — designed for universities and institutions. It empowers users to self-serve through a rich FAQ knowledge base while support staff manage everything through a protected admin dashboard with real-time stats, query tracking, and one-click FAQ publishing.

Calm. Focused. Trustworthy. Clean surfaces, readable typography, and zero clutter — like a well-organized university help desk.


📋 Table of Contents

Features
Tech Stack
Project Structure
Getting Started
Environment Variables
API Reference
Roles & Permissions
Advanced Features
Accessibility
Contributing


✨ Features
For Users

FAQ Browse — searchable, category-filtered accordion FAQ library with helpful/not-helpful voting
Raise a Query — submit queries with category auto-detection and duplicate detection
My Queries — track the status of all submitted queries in real time
Personalized Dashboard — stats, activity timeline, recommended FAQs, reputation score
Community Discussions — threaded replies on queries with upvotes and verified answers
Leaderboard — reputation-based ranking with milestone badges

For Admins & Support Staff

Admin Dashboard — KPI cards, pending ticket queue, bulk actions, top FAQ analytics
FAQ Management — inline create/edit/publish/archive with bulk publish support
Query Review Queue — approve/reject solutions, one-click "Add to FAQ"
User Management — assign roles, activate/deactivate users (admin only)
Announcements — create and manage system-wide notices
Analytics Dashboard — query trends, FAQ performance, user growth, resolution times

System-Wide

Semantic Search — intent-aware hybrid search (embedding + BM25 + RRF fusion) powered by all-MiniLM-L6-v2 (ONNX, zero cost)
Spam & Validation Filtering — blocks meaningless submissions server- and client-side
Most Helpful FAQs — live top-10 ranking widget on dashboard and browse pages
Dark Mode — full dark/light theme toggle respecting prefers-color-scheme
WCAG 2.1 AA Accessibility — semantic HTML, keyboard navigation, ARIA, skip links


🛠 Tech Stack
LayerTechnologyFrontendReact 18 + Vite + React Router v6BackendNode.js + Express.jsDatabaseMongoDB + Mongoose ODMAuthJWT (access + refresh tokens), HTTP-only cookiesStylingPlain CSS with CSS custom properties (no Tailwind)TypographyInter (Google Fonts)Semantic Search@xenova/transformers (ONNX) + hnswlib-node

📁 Project Structure
cs8/
├── SPEC.md                          # Full project specification
├── project.md                       # Project notes
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── roleGuard.js             # Role-based access
│   │   ├── errorHandler.js          # Global error handler
│   │   ├── validate.js              # Request validation
│   │   └── queryValidation.js       # Query-specific spam/length checks
│   ├── models/
│   │   ├── User.js
│   │   ├── FAQ.js
│   │   ├── Query.js
│   │   ├── Announcement.js
│   │   ├── FAQVote.js
│   │   ├── Discussion.js
│   │   ├── ReputationLog.js
│   │   ├── BlockedAttempt.js
│   │   └── SearchLog.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── faqController.js
│   │   ├── queryController.js
│   │   ├── dashboardController.js
│   │   ├── discussionController.js
│   │   ├── adminController.js
│   │   ├── analyticsController.js
│   │   ├── leaderboardController.js
│   │   └── searchController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── faqRoutes.js
│   │   ├── queryRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── discussionRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   └── searchRoutes.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   ├── roles.js
│   │   ├── classifier.js            # Keyword-based category auto-detection
│   │   ├── spamFilter.js            # Spam/meaningless message detection
│   │   ├── reputation.js            # Reputation point helper
│   │   ├── badgeEngine.js           # Badge condition evaluator
│   │   ├── similarity.js            # Trigram similarity scorer
│   │   ├── embedder.js              # ONNX model loader + embed()
│   │   ├── vectorStore.js           # HNSW / Atlas vector store
│   │   ├── searchPipeline.js        # Embed → search → RRF fusion
│   │   ├── rrfMerge.js              # Reciprocal Rank Fusion
│   │   └── textCleaner.js           # Query normalisation
│   ├── scripts/
│   │   ├── buildEmbeddings.js       # Backfill embeddings for existing FAQs
│   │   └── rebuildIndex.js          # Rebuild HNSW index
│   └── data/
│       ├── faq_vectors.bin          # Persisted HNSW index (gitignored)
│       └── faq_id_map.json          # HNSW label ↔ MongoDB _id map
└── frontend/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/
        │   └── apiClient.js
        ├── contexts/
        │   ├── AuthContext.jsx
        │   └── ThemeContext.jsx
        ├── hooks/
        │   ├── useAuth.js
        │   └── useTheme.js
        ├── layouts/
        │   ├── DashboardLayout.jsx
        │   └── AuthLayout.jsx
        ├── components/
        │   ├── common/
        │   │   ├── Sidebar.jsx
        │   │   ├── Header.jsx
        │   │   ├── ProtectedRoute.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Toast.jsx
        │   │   ├── Badge.jsx
        │   │   ├── BadgeChip.jsx
        │   │   ├── ReputationBadge.jsx
        │   │   ├── SkeletonLoader.jsx
        │   │   ├── SkipLink.jsx
        │   │   ├── LoadingSpinner.jsx
        │   │   └── EmptyState.jsx
        │   ├── dashboard/
        │   │   ├── StatCard.jsx
        │   │   ├── QueryTable.jsx
        │   │   └── FAQItem.jsx
        │   ├── faq/
        │   │   ├── FAQCard.jsx
        │   │   ├── FAQSearch.jsx
        │   │   ├── CategoryFilter.jsx
        │   │   ├── TopFAQsWidget.jsx
        │   │   ├── SearchResultCard.jsx
        │   │   ├── SearchDropdown.jsx
        │   │   └── SearchModeToggle.jsx
        │   ├── discussion/
        │   │   ├── DiscussionThread.jsx
        │   │   └── DiscussionInput.jsx
        │   ├── leaderboard/
        │   │   ├── Podium.jsx
        │   │   └── RankRow.jsx
        │   ├── analytics/
        │   │   ├── LineChart.jsx
        │   │   └── BarChart.jsx
        │   └── admin/
        │       └── ReindexPanel.jsx
        └── pages/
            ├── auth/
            │   ├── LoginPage.jsx
            │   └── RegisterPage.jsx
            ├── user/
            │   ├── UserDashboardPage.jsx
            │   ├── FAQBrowsePage.jsx
            │   ├── RaiseQueryPage.jsx
            │   ├── MyQueriesPage.jsx
            │   ├── LeaderboardPage.jsx
            │   └── ProfilePage.jsx
            └── admin/
                ├── AdminDashboardPage.jsx
                ├── FAQManagementPage.jsx
                ├── QueryReviewPage.jsx
                ├── UserManagementPage.jsx
                ├── AnnouncementsPage.jsx
                └── AnalyticsDashboardPage.jsx

🚀 Getting Started
Prerequisites

Node.js ≥ 18
MongoDB (local or Atlas)
npm or yarn

Installation
1. Clone the repository
bashgit clone https://github.com/Akashkumhar/cs8.git
cd cs8
2. Install backend dependencies
bashcd backend
npm install
3. Install frontend dependencies
bashcd ../frontend
npm install
4. Configure environment variables
Copy .env.example to .env in the project root (or backend/) and fill in your values (see Environment Variables).
5. Seed embeddings (first-time setup)
After seeding FAQ data, run the backfill script to generate vector embeddings:
bashcd backend
node scripts/buildEmbeddings.js
6. Start the development servers
bash# Backend (from /backend)
npm run dev

# Frontend (from /frontend)
npm run dev
The frontend will be available at http://localhost:5173 and the backend API at http://localhost:5000/api.

🔐 Environment Variables
Create a .env file in the root or backend/ directory:
env# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/cs8

# Auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CLIENT_URL=http://localhost:5173

# Semantic Search
EMBEDDING_PROVIDER=local         # 'local' (ONNX) | 'openai'
OPENAI_API_KEY=                  # Only needed if EMBEDDING_PROVIDER=openai
VECTOR_STORE=hnsw                # 'hnsw' (local) | 'atlas'
ATLAS_VECTOR_INDEX_NAME=faq_semantic
SEARCH_DEFAULT_MODE=hybrid       # 'hybrid' | 'semantic' | 'keyword'
SEARCH_TOP_K=10
RRF_K=60

📡 API Reference
All routes are prefixed with /api.
Auth
MethodEndpointDescriptionAuthPOST/auth/registerRegister new userPublicPOST/auth/loginLoginPublicPOST/auth/logoutLogoutAuthPOST/auth/refreshRefresh access tokenPublicGET/auth/meGet current userAuth
FAQs
MethodEndpointDescriptionAuthGET/faqsList published FAQsPublicGET/faqs/topTop 10 most helpful FAQsPublicGET/faqs/:idGet single FAQPublicGET/faqs/allList all FAQs (incl. drafts)Support+POST/faqsCreate FAQSupport+PUT/faqs/:idUpdate FAQSupport+DELETE/faqs/:idArchive FAQSupport+POST/faqs/:id/voteCast helpful/not-helpful voteAuthDELETE/faqs/:id/voteRemove voteAuth
Queries
MethodEndpointDescriptionAuthGET/queriesList queries (by role)AuthGET/queries/:idGet single queryAuthPOST/queriesRaise a new queryAuthGET/queries/similarDuplicate detectionAuthPUT/queries/:id/solutionSubmit solutionAuthPUT/queries/:id/assignAssign to staffStaff+PUT/queries/:id/approveApprove solutionStaff+PUT/queries/:id/rejectReject solutionStaff+PUT/queries/:id/closeClose queryOwner/Staff+
Search
MethodEndpointDescriptionAuthGET/searchHybrid semantic + keyword searchPublicPOST/search/feedbackLog click-through eventAuthPOST/admin/search/reindexRebuild search embeddings indexAdmin
Dashboard & Analytics
MethodEndpointDescriptionAuthGET/dashboard/statsAggregated statsAuthGET/dashboard/my-statsPersonal user statsAuthGET/dashboard/recommended-faqsPersonalised FAQ suggestionsAuthGET/analytics/queriesQuery volume over timeAdminGET/analytics/faqsFAQ views and vote ratesAdminGET/analytics/resolutionAvg resolution time by categoryAdmin
Leaderboard
MethodEndpointDescriptionAuthGET/leaderboardTop-50 users by reputationPublicGET/leaderboard/monthlyMonthly leaderboardPublicGET/users/:id/badgesUser badge collectionAuth

👥 Roles & Permissions
PermissionUserSupport StaffAdminBrowse & search FAQs✅✅✅Vote on FAQs✅✅✅Raise queries✅✅✅Submit community solutions✅✅✅Create / edit FAQs❌✅✅Approve / reject solutions❌✅✅Assign queries to staff❌✅✅Manage announcements❌✅✅View analytics dashboard❌❌✅Manage users & roles❌❌✅Trigger search reindex❌❌✅

🔬 Advanced Features
🧠 Semantic Search
Hybrid search combining dense vector similarity (ONNX all-MiniLM-L6-v2, 384-dim) and BM25 keyword matching, fused via Reciprocal Rank Fusion (RRF). Zero external API dependency — runs entirely in-process via @xenova/transformers.
Switch to OpenAI embeddings at any time with EMBEDDING_PROVIDER=openai in .env.
🏆 Reputation & Badges
Users earn points for community contributions:
ActionPointsQuery resolved (as solver)+10Community post upvoted+2 per upvoteSolution verified by staff+15Spam attempt blocked−5
Badges include 🌟 First Answer, 🔥 Top Helper, 💯 Century, 🏆 Expert, 📚 FAQ Star, and 🎯 Streak Master.
🛡 Spam & Validation Filtering
Server-side and client-side validation blocks: minimum length violations, all-caps text, repeated characters, common filler phrases, and rate limiting (max 5 queries per user per 24 hours).
🔍 Duplicate Detection
Before submitting a query, the system checks for semantically similar existing FAQs and open queries using text indexing and trigram similarity, prompting users to review before submitting.
📊 Smart Classification
Queries are automatically categorised (academics, admission, fees, placement, facilities) using a configurable keyword mapping — no ML required.

♿ Accessibility
This project targets WCAG 2.1 AA compliance:

Semantic HTML (<nav>, <main>, <aside>, <article>)
Fully keyboard-navigable with visible focus rings
Focus trap in modals, restored on close
ARIA labels, aria-expanded, aria-live, aria-current, role="alert"
Colour contrast ≥ 4.5:1 for all text
Status indicators use colour + text label + icon (never colour alone)
All animations wrapped in @media (prefers-reduced-motion: reduce)
Skip-to-main-content link on every page


🤝 Contributing

Fork the repository
Create a feature branch: git checkout -b feature/your-feature
Commit your changes: git commit -m 'Add your feature'
Push to the branch: git push origin feature/your-feature
Open a Pull Request

Please follow the build order in SPEC.md §9.13 when adding new features to avoid dependency conflicts.
