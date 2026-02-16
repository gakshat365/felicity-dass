# Context 0: Initial Setup & Authentication

## 1. Project Initialization
- **Frontend**: Initialized with Vite + React. Added `Tailwind CSS` and `DaisyUI` for styling.
- **Backend**: Initialized with Express.js. Connected to MongoDB Atlas.
- **Architecture**: MERN Stack with separate `frontend/` and `backend/` directories.

## 2. Infrastructure
- **Server**: `server.js` running on port 5000. Configured with CORS, Socket.io, and Body Parser.
- **Database**: Mongoose connected to Atlas.
- **Environment**: `.env` configured with `MONGO_URI` and `JWT_SECRET`.

## 3. Backend Implementation
### Models (Mongoose Schemas)
- **User**: Includes roles (`participant`, `organizer`, `admin`), profile fields, and secure password hashing.
- **Event**: Handles both normal and merchandise events.
- **Registration**: Tracks user registrations, payments (for merch), and QR tickets.
- **Team**: Support for Hackathon teams (Tier A).
- **Message**: For Chat functionality (Tier B).
- **Feedback**: Anonymous feedback (Tier C).

### Authentication API
- **POST /api/auth/register**: Creates new users (prevents duplicate emails).
- **POST /api/auth/login**: Authenticates users and returns a JWT token.
- **GET /api/auth/me**: Returns current user profile (protected route).
- **Middleware**: `authMiddleware.js` implements JWT verification and role-based access control.

## 4. Frontend Implementation
### Context & State
- **AuthContext**: Manages user login state, token storage in `localStorage`, and session persistence via `/api/auth/me`.
- **Axios Instance**: Configured with Interceptors to automatically attach the Bearer token to every request.

### Pages & Components
- **App.jsx**: Main router configuration.
- **Login.jsx**: User login form with error handling and redirection.
- **Register.jsx**: User sign-up form covering standard and organizer fields.
- **Dashboard.jsx**: Basic dashboard layout with sidebar and role-based conditional rendering.

## 5. Next Steps (Phase 2)
- Implement **Event Creation** for Organizers.
- Implement **Event Discovery/List** for Participants.
- Integrate **Advanced Features** (Team & Merch logic).
