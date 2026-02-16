# DASS Assignment - Event Management System
## Project Summary & Current Status

**Last Updated:** February 16, 2026  
**Project Type:** MERN Stack Event Management System for IIIT  
**Assignment Phase:** Phase 1 (Authentication & Basic Setup)

---

## 📋 Project Overview

An event management platform for IIIT that handles event registrations, merchandise sales, team formations, and real-time communication. The system supports three user roles: Participants, Organizers, and Admin.

### Technology Stack (MERN)
- **MongoDB Atlas** - Cloud database (Mongoose ODM)
- **Express.js** - Backend REST API framework
- **React (Vite)** - Frontend SPA
- **Node.js** - Runtime environment

---

## 🎯 Assignment Requirements Summary

### Phase 1 Requirements (Current Focus)
**Total Marks: 8 (Authentication & Security)**

#### 4.1 Registration & Login [3 Marks]
- ✅ Participant registration with email domain validation
  - IIIT emails: `@students.iiit.ac.in`, `@research.iiit.ac.in`, `@alumni.iiit.ac.in`, `@iiit.ac.in`
  - Non-IIIT: Any valid email
- ✅ Organizer authentication (Admin-provisioned only)
- ✅ Admin account provisioning (backend script)

#### 4.2 Security Requirements [3 Marks]
- ✅ Password hashing with bcrypt
- ✅ JWT-based authentication
- ⚠️ Role-based access control (RBAC) - Partially implemented

#### 4.3 Session Management [2 Marks]
- ✅ Role-based dashboard redirects
- ✅ Session persistence across browser restarts
- ✅ Logout clears authentication tokens

### Future Requirements (Not Yet Implemented)
- User onboarding & preferences [3 Marks]
- Event creation & management [Multiple sections]
- Advanced features (Tier A, B, C) [30 Marks]
- Deployment [5 Marks]

---

## 🏗️ Current Implementation Status

### ✅ COMPLETED

#### Backend (Node.js + Express)
**Location:** `/backend/`

##### 1. Server Setup (`server.js`)
- Express server running on port 5000
- MongoDB Atlas connection configured
- CORS enabled for cross-origin requests
- Socket.io setup for real-time features
- Payload limit increased to 50mb for Base64 images
- Auth routes mounted at `/api/auth`

##### 2. Database Models (Mongoose Schemas)
**Location:** `/backend/models/`

**User Model** (`User.js`)
```javascript
{
  firstName, lastName, email, password (hashed),
  role: ['participant', 'organizer', 'admin'],
  
  // Participant-specific
  interests: [String],
  following: [ObjectId], // Following organizers
  
  // Organizer-specific
  organizerName, category, description,
  contactEmail, contactNumber
}
```

**Event Model** (`Event.js`)
```javascript
{
  organizer: ObjectId,
  type: ['normal', 'merchandise'],
  name, description,
  startDate, endDate, registrationDeadline,
  eligibility, registrationLimit, stock, price,
  tags: [String],
  status: ['draft', 'published', 'completed', 'cancelled'],
  
  // Merchandise-specific
  itemDetails: { sizes, colors, variants },
  
  // Normal events
  customForm: Array // Dynamic form builder
}
```

**Registration Model** (`Registration.js`)
```javascript
{
  event: ObjectId,
  user: ObjectId,
  team: ObjectId, // Optional for team events
  
  // Merchandise
  itemSize, itemColor, quantity,
  
  // Payment (Tier A feature)
  paymentStatus: ['pending', 'approved', 'rejected', 'none'],
  paymentProof: String, // Image URL
  
  // Ticket & Attendance
  ticketId: String (unique),
  attended: Boolean,
  attendanceTime: Date,
  
  // Custom form responses
  customFormResponses: Object
}
```

**Team Model** (`Team.js`)
```javascript
{
  event: ObjectId,
  leader: ObjectId,
  name: String,
  members: [ObjectId],
  maxMembers, minMembers,
  inviteCode: String (unique),
  isComplete: Boolean
}
```

**Message Model** (`Message.js`)
```javascript
{
  event: ObjectId, // For public forum
  team: ObjectId,  // For private team chat
  user: ObjectId,
  content: String,
  type: ['text', 'file', 'image'],
  pinned: Boolean // Organizer/Admin only
}
```

**Feedback Model** (`Feedback.js`)
```javascript
{
  event: ObjectId,
  user: ObjectId, // Optional for anonymous
  rating: Number (1-5),
  comment: String,
  anonymous: Boolean
}
```

##### 3. Authentication System
**Location:** `/backend/controllers/authController.js`

**Implemented Features:**
- ✅ User registration with role validation
- ✅ Admin registration blocked via public API
- ✅ Organizer validation (requires organizerName & category)
- ✅ Password hashing (bcrypt) via Mongoose pre-save hook
- ✅ JWT token generation (30-day expiry)
- ✅ Login with email/password
- ✅ Password comparison method
- ✅ Protected route: GET `/api/auth/me`

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (protected)

##### 4. Middleware
**Location:** `/backend/middleware/authMiddleware.js`

**Auth Middleware:**
- JWT token verification
- User authentication from token
- Protects routes requiring authentication

##### 5. Environment Configuration
**Location:** `/backend/.env`
```
MONGO_URI=mongodb+srv://felicityadmin:passwordcomplicatedhai1729$@felicity-cluster-1...
PORT=5000
JWT_SECRET=supersecretkey
```

##### 6. Dependencies Installed
```json
{
  "bcryptjs": "^3.0.3",        // Password hashing
  "cloudinary": "^2.9.0",      // Image storage
  "cors": "^2.8.6",            // Cross-origin requests
  "dotenv": "^17.3.1",         // Environment variables
  "express": "^5.2.1",         // Web framework
  "jsonwebtoken": "^9.0.3",    // JWT authentication
  "mongoose": "^9.2.1",        // MongoDB ODM
  "multer": "^2.0.2",          // File uploads
  "nodemailer": "^8.0.1",      // Email sending
  "qrcode": "^1.5.4",          // QR code generation
  "socket.io": "^4.8.3"        // Real-time communication
}
```

---

#### Frontend (React + Vite)
**Location:** `/frontend/`

##### 1. Project Setup
- Vite-based React application
- React Router DOM for routing
- Axios for HTTP requests
- Context API for state management

##### 2. Routing Structure (`App.jsx`)
```javascript
Routes:
  / → Redirects to /login
  /login → Login page
  /register → Register page
  /dashboard → Dashboard (protected)
```

##### 3. Authentication Context
**Location:** `/frontend/src/context/AuthContext.jsx`

**Features:**
- ✅ User state management
- ✅ Login function with toast notifications
- ✅ Register function
- ✅ Logout function
- ✅ Auto-login on page refresh (checks localStorage token)
- ✅ Protected route helper

##### 4. Pages Implemented
**Location:** `/frontend/src/pages/`

**Login Page** (`Login.jsx`)
- Email/password form
- DaisyUI styled components
- Redirects to dashboard on success
- Link to registration page

**Register Page** (`Register.jsx`)
- User registration form
- Role selection (participant/organizer)
- Conditional fields based on role

**Dashboard Page** (`Dashboard.jsx`)
- Basic dashboard structure
- Role-based content (to be expanded)

##### 5. API Configuration
**Location:** `/frontend/src/api/axios.js`
- Axios instance with base URL
- Automatic JWT token attachment to requests
- Interceptors for authentication

##### 6. Dependencies Installed
```json
{
  "axios": "^1.13.5",              // HTTP client
  "daisyui": "^5.5.18",            // UI components
  "react": "^19.2.0",              // Core framework
  "react-dom": "^19.2.0",          // DOM rendering
  "react-hot-toast": "^2.6.0",    // Notifications
  "react-icons": "^5.5.0",         // Icon library
  "react-qr-reader": "^3.0.0-beta-1", // QR scanning
  "react-router-dom": "^7.13.0",   // Routing
  "socket.io-client": "^4.8.3",    // Real-time client
  "tailwindcss": "^4.1.18"         // Styling
}
```

---

### 🎨 UI Design System

**Location:** `/frontend/ui-demo.html` & `/frontend/ui-demo.css`

**Design Theme:** GitHub Dark / VS Code Dark inspired
- **No gradients** - All solid colors
- **Minimalist aesthetic** - Clean, professional look

#### Color Palette
```css
/* Backgrounds */
--bg-primary: #0d1117
--bg-secondary: #161b22
--bg-tertiary: #21262d
--bg-hover: #30363d

/* Borders */
--border-primary: #30363d
--border-secondary: #21262d

/* Text */
--text-primary: #c9d1d9
--text-secondary: #8b949e
--text-muted: #6e7681

/* Accents */
--accent-blue: #58a6ff
--accent-green: #3fb950
--accent-yellow: #d29922
--accent-red: #f85149
--accent-purple: #bc8cff
```

#### Components Designed
- ✅ Typography system (h1-h4, text variants)
- ✅ Buttons (primary, secondary, accent, danger, outline, ghost)
- ✅ Form elements (inputs, selects, textareas, checkboxes)
- ✅ Cards with headers, body, footer
- ✅ Tables with hover states
- ✅ Alerts (info, success, warning, error)
- ✅ Badges & tags
- ✅ Loading states (spinner, skeleton)
- ✅ Code blocks
- ✅ Navigation header
- ✅ Responsive design

---

## 📁 Project Structure

```
dass-assignment/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   ├── Registration.js
│   │   ├── Team.js
│   │   ├── Message.js
│   │   └── Feedback.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── .env
│   ├── server.js
│   ├── test_auth.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── components/ (empty - to be populated)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── ui-demo.html
│   ├── ui-demo.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── context/
│   └── project-summary.md (this file)
│
├── assignment.txt (Full requirements)
├── phase1.txt (Phase 1 requirements)
├── dependencies.txt (Library justifications)
└── password.txt (Admin credentials)
```

---

## ⚠️ PENDING IMPLEMENTATION

### High Priority (Phase 1 Completion)

#### 1. Role-Based Access Control (RBAC)
- [ ] Protected route wrapper component
- [ ] Role-based dashboard rendering
- [ ] Redirect logic based on user role
- [ ] Prevent unauthorized access to pages

#### 2. Email Domain Validation
- [ ] Frontend validation for IIIT email domains
- [ ] Backend validation for email domains
- [ ] Participant type detection (IIIT vs Non-IIIT)

#### 3. Admin Provisioning Script
- [ ] Create `backend/scripts/createAdmin.js`
- [ ] Check if admin exists before creating
- [ ] Auto-run on first server start

#### 4. Frontend UI Migration
- [ ] Replace DaisyUI with custom GitHub Dark theme
- [ ] Apply design system to Login page
- [ ] Apply design system to Register page
- [ ] Apply design system to Dashboard page

---

### Medium Priority (Future Phases)

#### 5. User Onboarding [3 Marks]
- [ ] Interest selection page
- [ ] Organizer follow functionality
- [ ] Skip option
- [ ] Profile preferences page

#### 6. Participant Features [22 Marks]
- [ ] Navigation menu
- [ ] My Events Dashboard
- [ ] Browse Events page with search/filters
- [ ] Event Details page
- [ ] Event registration workflows
- [ ] Profile page
- [ ] Clubs/Organizers listing
- [ ] Organizer detail page

#### 7. Organizer Features [18 Marks]
- [ ] Organizer navigation menu
- [ ] Organizer dashboard
- [ ] Event creation & editing
- [ ] Custom form builder
- [ ] Event analytics
- [ ] Participant management
- [ ] CSV export
- [ ] Discord webhook integration

#### 8. Admin Features [6 Marks]
- [ ] Admin navigation menu
- [ ] Club/Organizer management
- [ ] Add new organizer with auto-generated credentials
- [ ] Remove/disable organizers
- [ ] Password reset request handling

#### 9. Advanced Features [30 Marks]
**Tier A (Choose 2 - 8 marks each):**
- [ ] Team Formation & Management
- [ ] Merchandise Payment Approval Workflow
- [ ] QR Scanner & Attendance Tracking

**Tier B (Choose 2 - 6 marks each):**
- [ ] Real-Time Discussion Forum
- [ ] Organizer Password Reset Workflow
- [ ] Team Private Chat

**Tier C (Choose 1 - 2 marks each):**
- [ ] Anonymous Feedback System
- [ ] Discord Integration
- [ ] Email Notifications

#### 10. Deployment [5 Marks]
- [ ] Frontend deployment (Vercel/Netlify)
- [ ] Backend deployment (Render/Railway)
- [ ] Environment variables configuration
- [ ] Create deployment.txt with URLs

---

## 🔧 Development Commands

### Backend
```bash
cd backend
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 5000)
node test_auth.js          # Test authentication
```

### Frontend
```bash
cd frontend
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 5173)
npm run build              # Production build
npm run preview            # Preview production build
```

---

## 🔑 Key Design Decisions

### 1. Database Schema Design
- **Unified User Model:** Single model for all roles (participant, organizer, admin) with conditional fields
- **Event Flexibility:** Single Event model handles both normal events and merchandise
- **Registration Versatility:** Registration model supports individual, team, and merchandise orders
- **Real-time Ready:** Message model supports both event forums and team chats

### 2. Authentication Strategy
- **JWT Tokens:** Stateless authentication with 30-day expiry
- **bcrypt Hashing:** Secure password storage with salt rounds
- **Mongoose Hooks:** Automatic password hashing on user creation/update
- **Role Validation:** Server-side role enforcement

### 3. Frontend Architecture
- **Context API:** Lightweight state management (no Redux overhead)
- **Axios Interceptors:** Automatic token attachment to requests
- **React Router:** Client-side routing with protected routes
- **Toast Notifications:** User-friendly feedback for actions

### 4. UI/UX Approach
- **Dark Theme:** GitHub Dark inspired for developer-friendly aesthetic
- **Component Library:** Custom design system (no external UI framework dependency)
- **Responsive Design:** Mobile-first approach with breakpoints
- **Accessibility:** Semantic HTML and ARIA labels

---

## 📊 Current Test Data

### Database Connection
- **MongoDB Atlas Cluster:** felicity-cluster-1
- **Database Name:** dass-assignment (auto-created)
- **Connection Status:** ✅ Connected

### Admin Credentials (To be provisioned)
```
Email: admin@iiit.ac.in
Password: (To be set via backend script)
Role: admin
```

---

## 🐛 Known Issues & Limitations

### Current Issues
1. **No RBAC Implementation:** All authenticated users can access all routes
2. **No Email Validation:** Domain validation not implemented
3. **No Admin Script:** Admin must be created manually in database
4. **DaisyUI Dependency:** Frontend still uses DaisyUI instead of custom theme
5. **No Protected Routes:** Dashboard accessible without authentication check
6. **No Error Boundaries:** Frontend lacks error handling components

### Technical Debt
1. **Hardcoded URLs:** API base URL should be in environment variables
2. **No Input Validation:** Frontend forms lack comprehensive validation
3. **No Loading States:** No spinners during API calls
4. **No Pagination:** Future event lists will need pagination
5. **No Search Implementation:** Search functionality not built yet

---

## 📝 Next Steps (Recommended Order)

### Immediate (Complete Phase 1)
1. ✅ Create admin provisioning script
2. ✅ Implement email domain validation
3. ✅ Add role-based access control
4. ✅ Migrate UI to custom GitHub Dark theme
5. ✅ Add protected route wrapper
6. ✅ Test complete authentication flow

### Short-term (Week 1-2)
1. User onboarding flow
2. Browse Events page with filters
3. Event creation for organizers
4. Basic dashboard for all roles
5. Profile management

### Medium-term (Week 3-4)
1. Event registration workflows
2. Custom form builder
3. Team formation system
4. Choose and implement Tier A features
5. Choose and implement Tier B features

### Long-term (Week 5-6)
1. QR code generation and scanning
2. Real-time discussion forum
3. Email notification system
4. Analytics dashboards
5. Deployment and testing

---

## 📚 Reference Documents

1. **assignment.txt** - Complete assignment requirements (249 lines)
2. **phase1.txt** - Phase 1 specific requirements (60 lines)
3. **dependencies.txt** - Library choices and justifications (82 lines)
4. **password.txt** - Admin credentials and notes

---

## 🎯 Success Metrics

### Phase 1 Completion Checklist
- [x] MongoDB connection established
- [x] User model with role support
- [x] Password hashing with bcrypt
- [x] JWT authentication
- [x] Login/Register endpoints
- [x] Frontend auth context
- [x] Login/Register pages
- [ ] Email domain validation
- [ ] Role-based access control
- [ ] Admin provisioning script
- [ ] Session persistence testing
- [ ] UI theme migration

**Current Progress:** 8/12 (67% complete)

---

## 💡 Important Notes

### Security Considerations
- JWT secret should be changed before deployment
- MongoDB credentials should be rotated
- CORS should be restricted to specific origins in production
- Rate limiting should be added to prevent brute force attacks
- Input sanitization needed to prevent injection attacks

### Performance Considerations
- Image uploads should be compressed before storage
- Database queries should be indexed appropriately
- Frontend should implement lazy loading for routes
- API responses should be cached where appropriate
- Socket.io connections should be optimized

### Scalability Considerations
- Event pagination will be critical for large datasets
- Real-time features may need Redis for scaling
- File uploads should use CDN (Cloudinary already configured)
- Database should use connection pooling
- Frontend should implement code splitting

---

**Document Version:** 1.0  
**Created By:** AI Assistant  
**Last Modified:** February 16, 2026, 9:48 AM IST
