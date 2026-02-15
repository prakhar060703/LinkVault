# Tech Stack - LinkVault

## Core
- Node.js (runtime)
- npm (package manager)
- JavaScript (ES Modules)

## Frontend
- React
- React DOM
- Vite
- @vitejs/plugin-react
- Tailwind CSS
- PostCSS
- Autoprefixer

## Backend
- Express
- Multer (file uploads)
- Mongoose
- MongoDB
- JSON Web Token (`jsonwebtoken`)
- Helmet
- CORS
- Morgan
- dotenv

## Storage
- MongoDB (metadata, auth, shares)
- Local filesystem (`backend/uploads`) for uploaded files

## Auth & Security
- JWT bearer auth
- Password hashing with Node.js `crypto.scrypt`
- Random token generation with Node.js `crypto.randomBytes`

## Dev Commands
- Backend dev server: `node --watch src/index.js`
- Frontend dev server: `vite`

## Project Structure
- `frontend/` - React client
- `backend/` - Express API, Mongo models, upload handling
