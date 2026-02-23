# DASS Events Platform

A full-stack event management system built for IIIT Hyderabad's clubs, councils, and fest teams.

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB)

### Backend Setup
```bash
cd backend
cp .env.example .env       # Fill in MONGO_URI, JWT_SECRET, etc.
npm install
node scripts/createAdmin.js  # Seeds the admin account once
npm run dev                  # Starts on :5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev                  # Starts on :5173
```

---

## 🏗️ Tech Stack & Justification

### Backend
| Library | Version | Justification |
|---|---|---|
| `express` | 4.x | Minimal, flexible REST API framework for Node.js |
| `mongoose` | 7.x | Schema-based MongoDB ODM with built-in validation and middleware hooks |
| `jsonwebtoken` | 9.x | Industry-standard JWT generation and verification for stateless auth |
| `bcryptjs` | 2.x | Secure password hashing with configurable salt rounds — no native deps |
| `multer` | 1.x | Multipart form-data handling for payment proof image uploads |
| `cloudinary` | 1.x | Cloud-based image storage with CDN; removes need for local file management |
| `socket.io` | 4.x | Bidirectional real-time communication for Discussion Forum (Phase 5) |
| `qrcode` | 1.x | Server-side QR code generation for event tickets |
| `pdfkit` | 0.x | PDF ticket generation with embedded QR and event details |
| `nodemailer` | 6.x | Email delivery for tickets and password reset notifications |
| `axios` | 1.x | HTTP client used within backend for Discord webhook calls |
| `dotenv` | 16.x | Environment variable management |
| `cors` | 2.x | Cross-Origin Resource Sharing headers for frontend-backend communication |

### Frontend
| Library | Version | Justification |
|---|---|---|
| `react` | 18.x | Component-based UI with hooks for state and effects |
| `react-router-dom` | 6.x | Client-side routing with protected route wrappers and URL params |
| `axios` | 1.x | HTTP client; cleaner interceptor support than fetch for JWT injection |
| `react-hot-toast` | 2.x | Lightweight, accessible toast notifications |
| `date-fns` | 2.x | Immutable date formatting utilities; smaller than moment.js |
| `react-icons` | 4.x | Icon library (Font Awesome subset used in Navbar) |
| `html5-qrcode` | 2.x | Camera-based QR code scanning for the attendance scanner page |

---

## 📦 Advanced Features Implemented

### Tier A (Choose 2 — 8 Marks each)

#### ✅ 2. Merchandise Payment Approval Workflow
**Justification:** Directly supports real-world Felicity merchandise sales (T-shirts, hoodies, kits). Adds meaningful complexity through a multi-step state machine (pending → proof_uploaded → confirmed/rejected) and integrates tightly with Tier A QR ticket generation.

**Design choices:**
- Payment proof stored on Cloudinary (not local disk) for persistence across server restarts
- Stock decremented **only on approval** (not on purchase) to prevent ghost reservations
- Atomic `findOneAndUpdate` with `$gt: 0` guard prevents overselling in concurrent approvals
- QR ticket + confirmation email generated conditionally on approval — never in pending/rejected state

#### ✅ 3. QR Scanner & Attendance Tracking
**Justification:** Core real-world feature for events — organizers need to scan 200+ QR codes at Felicity gates. Provides a live attendance dashboard without manual data entry.

**Design choices:**
- Uses `html5-qrcode` library for device camera access — works on phones without a native app
- File-upload fallback for scanning screenshot/printed QRs
- Duplicate scan prevention via `attendanceMarked` boolean checked before save
- Manual override stores `isManualOverride: true` + `manualOverrideReason` for audit trail
- Full attendance report exported as CSV from the same endpoint as participant list

---

### Tier B (Choose 2 — 6 Marks each)

#### ✅ 1. Real-Time Discussion Forum
**Justification:** Enables participants to ask event-day questions without separate WhatsApp groups. Organizers can pin announcements so they float to the top for all users.

**Design choices:**
- Socket.IO rooms scoped per event ID — messages only broadcast to `join_room` members
- Access control: only registered (confirmed) participants + organizer + admin can post/view
- Single-level threading via `parentId` field — avoids deep recursion complexity
- Offline notifications created in DB when a reply targets a user who is not currently connected
- Soft-delete (`isDeleted: true`) preserves thread structure while hiding content

#### ✅ 2. Organizer Password Reset Workflow
**Justification:** Organizer accounts have no self-service password reset (by design — accounts are admin-provisioned). This provides the required controlled reset path without weakening security.

**Design choices:**
- Organizer submits a reason-annotated request via the "Forgot Password" flow
- Admin sees all requests with club name, date, and reason in a dedicated "Recovery" tab
- On approval, a cryptographically random temporary password (`ClubName#HEXHEX`) is auto-generated
- Password is shown to admin in the response AND emailed to the organizer via `nodemailer`
- Request status tracked as `pending → approved/rejected` with admin notes stored

---

### Tier C (Choose 1 — 2 Marks each)

#### ✅ 1. Anonymous Feedback System
**Justification:** Provides organizers with actionable post-event data without violating participant privacy. Simpler than a full review platform but satisfies the requirement with minimal surface area for abuse.

**Design choices:**
- Feedback stored in a separate `Feedback` collection with no user reference — only `eventId` + `rating` + `comment`
- The participant-event link is tracked via `registration.feedbackSubmitted` boolean to prevent duplicates without deanonymizing
- Eligibility gated on `attendanceStatus === 'Present'` to ensure quality feedback
- Aggregation (average, distribution by rating) computed on-the-fly — not stored — so it always reflects latest data
- Organizer can filter feedback by star rating using `?rating=` query param

---

## 📁 Project Structure

```
dass-assignment/
├── backend/
│   ├── controllers/    # Route handlers (auth, events, registrations, forum, feedback, admin)
│   ├── models/         # Mongoose schemas (User, Event, Registration, Message, Feedback, Notification, PasswordResetRequest)
│   ├── routes/         # Express routers
│   ├── middleware/     # protect (JWT), authorize (RBAC)
│   ├── services/       # ticketService, emailService, discordService
│   ├── utils/          # emailValidator
│   └── scripts/        # createAdmin.js
└── frontend/
    ├── src/
    │   ├── pages/      # Route-level components
    │   ├── components/ # Shared components (Navbar, FormBuilder, Scanner, Forum, etc.)
    │   ├── context/    # AuthContext (JWT + user state)
    │   └── api/        # Axios instance with interceptors
    └── public/
```

---

## 🔐 Default Credentials (Local Development)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@iiit.ac.in` | Set in `ADMIN_PASSWORD` env var (default: `ChangeMe@123`) |
| Organizer | Created by admin | Generated and shown in Admin Dashboard |
| Participant | Register at `/register` | Your chosen password |

> ⚠️ Change the admin password after first login in production.
