# LinkVault Design Document

## Overview
LinkVault is a full-stack secure sharing system for text and files with authenticated upload, token-based retrieval, moderation, and admin visibility.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- File Upload: Multer (disk storage)
- Auth: JWT bearer tokens
- Security/Middleware: Helmet, CORS, Morgan


## Project structure
- `frontend/` React app (create/retrieve link UI)
- `backend/` API + Mongo models + file storage

## Run instructions
### First Time Setup (only once)
1. Create MongoDB data folder:
```powershell
mkdir C:\data\db -Force
```
2. Setup backend:
```powershell
cd D:\Personal_Projects\LinkVault\backend
npm install
```
3. Setup frontend:
```powershell
cd D:\Personal_Projects\LinkVault\frontend
npm install
```

### From Next Time (every time you start app)
Open 3 terminals.

1. Terminal 1: start MongoDB
```powershell
mongod --dbpath C:\data\db
```

2. Terminal 2: start backend
```powershell
cd D:\Personal_Projects\LinkVault\backend
npm run dev
```
Backend runs on `http://localhost:4000`

3. Terminal 3: start frontend
```powershell
cd D:\Personal_Projects\LinkVault\frontend
npm run dev
```
Frontend runs on `http://localhost:5173`

Mongo URI used by backend:
`mongodb://localhost:27017/linkvault`

## Core Features and Implementation

### 1. User Registration and Login
- Feature:
  - Users can register and login.
  - Logged-in users receive a JWT.
- Backend implementation:
  - `POST /api/auth/register` creates user after validation.
  - `POST /api/auth/login` validates credentials and returns JWT.
  - Passwords are hashed with `crypto.scrypt` and per-user salt.
- Files:
  - `backend/src/routes/auth.js`
  - `backend/src/utils/security.js`
  - `backend/src/models/User.js`

### 2. JWT Authentication and Role Access
- Feature:
  - Protected APIs require bearer token.
  - Admin-only APIs are role-restricted.
- Backend implementation:
  - `requireAuth` middleware extracts and verifies bearer token.
  - `requireAdmin` checks `user.role === "admin"`.
- Files:
  - `backend/src/auth.js`
  - `backend/src/routes/admin.js`

### 3. Create Secure Share (Text or File)
- Feature:
  - Authenticated users can create either:
    - text share, or
    - file share.
  - Exactly one content type is allowed.
- Backend implementation:
  - `POST /api/shares` with `upload.single("file")`.
  - Validates `text XOR file`, expiry, maxViews, password length.
  - Generates random token using `crypto.randomBytes`.
  - Stores share metadata in MongoDB.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/models/Share.js`
  - `backend/src/utils/security.js`

### 4. File Upload and Storage
- Feature:
  - Uploaded file is stored on local disk.
- Backend implementation:
  - Multer disk storage writes to `backend/uploads`.
  - Filename is timestamp + random token + original extension.
  - DB stores original name, mime type, size, and path.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/config.js`

### 5. Link Expiry
- Feature:
  - Each share has `expiresAt`.
  - Default expiry is set when not provided.
- Backend implementation:
  - Expiry parsed/validated during share creation.
  - Access routes reject expired links.
  - MongoDB TTL index auto-removes expired records.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/models/Share.js`

### 6. One-Time and Max-Access Limits
- Feature:
  - Optional one-time view and max views/downloads limit.
- Backend implementation:
  - Access count computed as `viewCount + downloadCount`.
  - Routes deny access when one-time already used or max reached.
- Files:
  - `backend/src/routes/shares.js`

### 7. Password-Protected Links
- Feature:
  - Optional password on share.
- Backend implementation:
  - Password hash/salt stored in share record.
  - `x-access-password` checked on retrieve/download routes.
  - 401 response with `passwordRequired: true` when missing/invalid.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/utils/security.js`

### 8. Retrieve Content by Token
- Feature:
  - Receiver opens link token and gets content.
- Backend implementation:
  - `GET /api/shares/:token`:
    - For text: returns text payload and increments `viewCount`.
    - For file: returns metadata + download URL.
- Files:
  - `backend/src/routes/shares.js`

### 9. File Download
- Feature:
  - File shares can be downloaded through secure endpoint.
- Backend implementation:
  - `GET /api/shares/:token/download` validates same rules.
  - Increments `downloadCount`, then streams via `res.download`.
- Files:
  - `backend/src/routes/shares.js`

### 10. User Dashboard and History
- Feature:
  - User can see own shares and delete own shares.
  - User dashboard shows all posts and filtered reported posts.
- Backend implementation:
  - `GET /api/shares/mine` returns active shares for logged-in owner.
  - `DELETE /api/shares/id/:shareId` allows owner delete.
- Frontend implementation:
  - Dashboard cards, post list, detail panel, delete action.
- Files:
  - `backend/src/routes/shares.js`
  - `frontend/src/App.jsx`

### 11. Reporting Workflow (Moderation)
- Feature:
  - Logged-in users can report a post token with optional reason.
  - Duplicate reports by same user are blocked.
- Backend implementation:
  - `POST /api/shares/:token/report` stores `{ reportedBy, reason, createdAt }`.
- Frontend implementation:
  - Report page takes token + reason and submits report.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/models/Share.js`
  - `frontend/src/App.jsx`

### 12. Admin Dashboard
- Feature:
  - Admin can monitor users, admin posts, access totals, reported posts.
  - Admin can view user-specific posts and delete any post.
- Backend implementation:
  - `GET /api/admin/users`
  - `GET /api/admin/users/:userId/shares`
  - `GET /api/admin/shares`
  - `GET /api/admin/reported`
- Frontend implementation:
  - Admin tiles and sections for posts/users/access.
  - Reported posts route and moderation actions.
- Files:
  - `backend/src/routes/admin.js`
  - `frontend/src/App.jsx`

### 13. Access Tracking
- Feature:
  - Tracks how many times content is accessed.
- Implementation:
  - Text open increments `viewCount`.
  - File download increments `downloadCount`.
  - Admin aggregates access totals per owner from these counters.
- Files:
  - `backend/src/routes/shares.js`
  - `backend/src/routes/admin.js`

### 14. Background Cleanup for Expired Content
- Feature:
  - Removes expired records and stale uploaded files.
- Backend implementation:
  - Background job runs every minute.
  - Finds expired shares, deletes corresponding files, then DB docs.
  - Also run once at startup.
- Files:
  - `backend/src/utils/expiryCleanup.js`
  - `backend/src/index.js`

### 15. Security Hardening Basics
- Feature:
  - Secure defaults around headers, auth, and validation.
- Implementation:
  - `helmet()` for HTTP headers.
  - Input validation on auth/share/report routes.
  - Token format checks and centralized error handling.
- Files:
  - `backend/src/index.js`
  - `backend/src/middleware.js`
  - `backend/src/routes/*.js`

## Data Model Summary

### User
- Fields:
  - `name`, `email`, `passwordHash`, `passwordSalt`, `role`, timestamps
- File:
  - `backend/src/models/User.js`

### Share
- Fields:
  - `token`, `owner`, `type`, `text`, `file`, `expiresAt`
  - `oneTimeView`, `maxViews`
  - `viewCount`, `downloadCount`
  - `reports[]`, `passwordHash`, `passwordSalt`, timestamps
- TTL index:
  - `expiresAt` with `expireAfterSeconds: 0`
- File:
  - `backend/src/models/Share.js`

## API Surface Summary
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- Shares:
  - `POST /api/shares`
  - `GET /api/shares/mine`
  - `DELETE /api/shares/id/:shareId`
  - `POST /api/shares/:token/report`
  - `GET /api/shares/:token`
  - `GET /api/shares/:token/download`
- Admin:
  - `GET /api/admin/users`
  - `GET /api/admin/users/:userId/shares`
  - `GET /api/admin/shares`
  - `GET /api/admin/reported`

## Known Limitations
- File storage is local disk (single-instance oriented).
- Access tracking is count-based, not identity-based for recipients.
- No distributed lock for cleanup worker in multi-instance deployments.

## Suggested Next Improvements
- Add tests for auth, share limits, report workflow, and admin APIs.
- Add rate limiting and audit logs for sensitive routes.
- Move file storage to object storage for production scale.
- Add recipient-level access events if identity tracking is required.
