# Phase 3 - Implementation Plan (Final)

**Date:** February 16, 2026  
**Total Marks:** 46  
**Based on User Clarifications**

---

## ✅ **Clarifications Confirmed**

### **1. Payment: Manual Approval with Screenshot** 💰
- ❌ No Stripe/Razorpay/Payment Gateway
- ✅ Show UPI QR code on screen
- ✅ User uploads payment screenshot
- ✅ Organizer/Admin approves in dashboard
- **Why:** Meets "Payment Proof Approval" requirement without API complexity

### **2. Email: Real SMTP (Nodemailer)** 📧
- ✅ Use nodemailer with Gmail App Password
- ✅ Send real emails with QR code attachment
- ❌ No console logging
- **Why:** Huge "Wow" factor, proves notification requirement

### **3. Team Events: Text Field Only** 👥
- ❌ No team management logic (invites, joining, locking)
- ✅ Just a "Team Name" text field during registration
- ✅ Multiple users can type same team name
- **Why:** Avoids complexity while showing team support

### **4. File Upload: Payment Proofs Only** 📁
- ✅ Use Cloudinary for payment screenshot uploads
- ❌ Skip file upload in form builder
- ✅ Form builder: text, checkboxes, dropdowns only
- **Why:** Keeps database schema clean

### **5. Discord: Must-Have (Easy Win)** 🎮
- ✅ Include Discord webhook
- ✅ One HTTP request: `axios.post(webhookUrl, { content: "..." })`
- **Why:** Counts as "External Integration" for minimal effort

### **6. Attendance: QR Scan → API Call** ✅
- ✅ Ticket contains QR with RegistrationID
- ✅ Organizer uses `react-qr-reader` to scan
- ✅ Scanning calls `POST /api/attendance/mark`
- ✅ Backend sets `attendanceMarked: true`
- **Why:** Real scanning functionality, impressive demo

---

## 📦 **Updated Dependencies**

### **Backend:**
```json
{
  "qrcode": "^1.5.3",           // QR code generation
  "nodemailer": "^6.9.7",       // Email sending (Gmail SMTP)
  "pdfkit": "^0.13.0",          // PDF ticket generation
  "csv-writer": "^1.6.0",       // CSV export
  "axios": "^1.6.2",            // Discord webhook
  "cloudinary": "^1.41.0",      // Payment screenshot upload
  "multer": "^1.4.5-lts.1"      // File upload middleware
}
```

### **Frontend:**
```json
{
  "react-beautiful-dnd": "^13.1.1",  // Drag & drop for form builder
  "date-fns": "^2.30.0",             // Date formatting
  "react-datepicker": "^4.21.0",     // Date range picker
  "fuse.js": "^7.0.0",               // Fuzzy search
  "react-qr-reader": "^3.0.0-beta-1" // QR code scanner
}
```

---

## 🗂️ **Updated Registration Model**

```javascript
const registrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Registration Details
  registrationType: { type: String, enum: ['normal', 'merchandise'], required: true },
  registrationDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  
  // Team (Simple Text Field)
  teamName: { type: String, default: null },
  
  // Custom Form Responses
  formResponses: { type: Map, of: mongoose.Schema.Types.Mixed },
  
  // Merchandise Details
  merchandiseDetails: {
    size: String,
    color: String,
    variant: String,
    quantity: { type: Number, default: 1 }
  },
  
  // Payment (Manual Approval)
  paymentRequired: { type: Boolean, default: false },
  paymentAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'proof_uploaded', 'approved', 'rejected'],
    default: 'pending'
  },
  paymentProofUrl: { type: String, default: null }, // Cloudinary URL
  paymentProofUploadedAt: { type: Date },
  paymentApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentApprovedAt: { type: Date },
  
  // Ticket
  ticketId: { type: String, unique: true, required: true },
  ticketQRCode: { type: String }, // Base64 or URL
  ticketPdfUrl: { type: String }, // Cloudinary URL for PDF
  
  // Attendance
  attendanceMarked: { type: Boolean, default: false },
  attendanceMarkedAt: { type: Date },
  attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
```

---

## 🎯 **Implementation Phases**

### **Phase 3A: Core Registration System (Week 1)**

#### **Day 1-2: Registration Backend**
1. ✅ Update Registration model
2. ✅ Create registration endpoints:
   - `POST /api/registrations` - Create registration
   - `GET /api/registrations/my-registrations` - User's registrations
   - `GET /api/registrations/:id` - Single registration
   - `PATCH /api/registrations/:id/cancel` - Cancel registration
3. ✅ Ticket generation service:
   - Generate unique ticket ID
   - Create QR code with registration ID
   - Generate PDF ticket
4. ✅ Email service setup:
   - Configure nodemailer with Gmail
   - Email template for ticket
   - Attach QR code and PDF

#### **Day 3-4: Payment System**
1. ✅ Payment proof upload:
   - Configure Cloudinary
   - `POST /api/registrations/:id/upload-payment-proof`
   - Store Cloudinary URL
2. ✅ Payment approval (Organizer/Admin):
   - `PATCH /api/registrations/:id/approve-payment`
   - `PATCH /api/registrations/:id/reject-payment`
3. ✅ UPI QR code display:
   - Store organizer UPI ID in event
   - Generate UPI payment QR code
   - Show during registration

#### **Day 5-7: My Events Dashboard (Frontend)**
1. ✅ Replace MyRegistrations placeholder
2. ✅ Implement tabs:
   - Upcoming Events
   - Normal Events
   - Merchandise
   - Completed
   - Cancelled/Rejected
3. ✅ Event cards with:
   - Event name, type, organizer
   - Status badge
   - Team name (if applicable)
   - Clickable ticket ID
4. ✅ Ticket modal/page:
   - Display ticket details
   - Show QR code
   - Download PDF button

---

### **Phase 3B: Event Management (Week 2)**

#### **Day 8-10: Event Creation Form**
1. ✅ Replace CreateEvent placeholder
2. ✅ Multi-step form:
   - Step 1: Basic Info (name, description, type)
   - Step 2: Dates & Eligibility
   - Step 3: Pricing & Limits
   - Step 4: Custom Form Builder
   - Step 5: Review & Publish
3. ✅ Form Builder Component:
   - Add field button
   - Field types: text (short/long), number, dropdown, checkbox, radio
   - Required toggle
   - Drag & drop reordering (react-beautiful-dnd)
   - Preview mode
4. ✅ Save as Draft / Publish

#### **Day 11-12: Event Editing**
1. ✅ Edit rules based on status:
   - Draft: Full edit + Publish
   - Published: Description, deadline, limit only
   - Ongoing/Completed: Status change only
2. ✅ Lock form after first registration
3. ✅ Status management:
   - Publish event
   - Close registrations
   - Mark as ongoing
   - Mark as completed

#### **Day 13-14: Organizer Event Detail**
1. ✅ Create OrganizerEventDetail page
2. ✅ Overview section:
   - Event details
   - Edit button (with rules)
3. ✅ Analytics section:
   - Total registrations
   - Confirmed registrations
   - Pending payments
   - Total revenue
   - Attendance count
4. ✅ Participants table:
   - Name, Email, Reg Date, Payment Status, Team, Attendance
   - Search by name/email
   - Filter by payment status
   - Filter by attendance
   - **Export to CSV button**
5. ✅ Payment approval interface:
   - View payment proof screenshot
   - Approve/Reject buttons

---

### **Phase 3C: Browse & Discovery (Week 3)**

#### **Day 15-16: Browse Events Enhancements**
1. ✅ Fuzzy search with fuse.js:
   - Search event names
   - Search organizer names
   - Typo tolerance
2. ✅ Advanced filters:
   - Event type (Normal/Merchandise)
   - Eligibility (All, IIIT Students, IIIT Community, Outside, Custom)
   - Date range picker
   - Followed Clubs toggle
   - "Trending" toggle (Top 5 in 24h)
3. ✅ Update backend `/api/events` endpoint:
   - Add fuzzy search logic
   - Add date range filtering
   - Add followed clubs filter
   - Add trending calculation

#### **Day 17-18: Event Details Page**
1. ✅ Update EventDetails page
2. ✅ Add registration button:
   - Check eligibility
   - Check deadline
   - Check limits/stock
   - Show blocking messages
3. ✅ Registration modal:
   - Display custom form
   - Merchandise selection (size, color, variant)
   - Team name input
   - Submit registration
4. ✅ Payment flow:
   - Show UPI QR code
   - Upload payment screenshot
   - Success message

#### **Day 19-20: Clubs & Organizers**
1. ✅ Create ClubsListing page:
   - List all organizers
   - Show: Name, Category, Description
   - Follow/Unfollow buttons
   - Search by name
   - Filter by category
2. ✅ Create OrganizerDetail page:
   - Organizer info
   - Follow button
   - Tabs: Upcoming Events, Past Events
   - Event cards

#### **Day 21: Attendance System**
1. ✅ QR Scanner page (Organizer):
   - Use react-qr-reader
   - Scan ticket QR code
   - Extract registration ID
   - Call attendance API
2. ✅ Attendance API:
   - `POST /api/attendance/mark`
   - Verify registration exists
   - Verify event is ongoing
   - Set attendanceMarked: true
   - Return success/error

---

### **Phase 3D: Admin & Extras (Week 4)**

#### **Day 22-24: Admin Features**
1. ✅ Replace AdminDashboard placeholder
2. ✅ Manage Organizers page:
   - List all organizers
   - Add new organizer:
     - Input: Name, Category, Description
     - Auto-generate email: `{name}@clubs.iiit.ac.in`
     - Auto-generate random password
     - Display credentials modal
     - Send welcome email
   - Remove/Disable organizer:
     - Soft delete (disable account)
     - Hard delete (permanent)
3. ✅ Password Reset Requests:
   - Users can request password reset
   - Admin sees list of requests
   - Admin can approve/reject
   - Send new password via email

#### **Day 25-26: Discord Integration**
1. ✅ Add discordWebhook field to User model (organizers)
2. ✅ Organizer profile:
   - Input webhook URL
   - Test webhook button
3. ✅ Auto-post to Discord:
   - When event is published
   - Send event details to webhook
   - Include event link

#### **Day 27-28: Polish & Testing**
1. ✅ Navigation menus for all roles
2. ✅ Responsive design check
3. ✅ Error handling
4. ✅ Loading states
5. ✅ Success/error toasts
6. ✅ Final testing:
   - Registration flow
   - Payment approval
   - Ticket generation
   - Email sending
   - QR scanning
   - CSV export
   - Discord posting

---

## 🔧 **Technical Implementation Details**

### **1. Ticket Generation Service**

```javascript
// backend/services/ticketService.js
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const cloudinary = require('cloudinary').v2;

const generateTicket = async (registration) => {
  // 1. Generate Ticket ID
  const ticketId = `TKT-${Date.now()}-${registration._id.toString().slice(-6)}`;
  
  // 2. Generate QR Code (contains registration ID)
  const qrCodeData = registration._id.toString();
  const qrCodeBase64 = await QRCode.toDataURL(qrCodeData);
  
  // 3. Generate PDF
  const doc = new PDFDocument();
  // Add event details, participant info, QR code
  // ...
  
  // 4. Upload PDF to Cloudinary
  const pdfUrl = await uploadPDFToCloudinary(doc);
  
  return { ticketId, qrCodeBase64, pdfUrl };
};
```

### **2. Email Service**

```javascript
// backend/services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password
  }
});

const sendTicketEmail = async (user, event, ticket) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `Your Ticket for ${event.name}`,
    html: `
      <h1>Registration Confirmed!</h1>
      <p>Your ticket ID: ${ticket.ticketId}</p>
      <img src="${ticket.qrCodeBase64}" alt="QR Code" />
      <p>Download your ticket PDF: <a href="${ticket.pdfUrl}">Click here</a></p>
    `,
    attachments: [
      {
        filename: 'ticket-qr.png',
        content: ticket.qrCodeBase64.split('base64,')[1],
        encoding: 'base64'
      }
    ]
  };
  
  await transporter.sendMail(mailOptions);
};
```

### **3. Payment Proof Upload**

```javascript
// backend/routes/registrationRoutes.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const upload = multer({ dest: 'uploads/' });

router.post('/:id/upload-payment-proof', 
  authMiddleware, 
  upload.single('paymentProof'),
  async (req, res) => {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // Update registration
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      {
        paymentProofUrl: result.secure_url,
        paymentStatus: 'proof_uploaded',
        paymentProofUploadedAt: new Date()
      },
      { new: true }
    );
    
    res.json(registration);
  }
);
```

### **4. Discord Webhook**

```javascript
// backend/services/discordService.js
const axios = require('axios');

const postToDiscord = async (webhookUrl, event) => {
  if (!webhookUrl) return;
  
  const message = {
    content: `🎉 **New Event Published!**\n\n**${event.name}**\n${event.description}\n\nRegister now: ${process.env.FRONTEND_URL}/events/${event._id}`
  };
  
  try {
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error('Discord webhook error:', error);
  }
};
```

### **5. QR Scanner (Frontend)**

```javascript
// frontend/src/pages/QRScanner.jsx
import { QrReader } from 'react-qr-reader';

const QRScanner = () => {
  const handleScan = async (result) => {
    if (result) {
      const registrationId = result.text;
      
      // Call attendance API
      await axios.post('/api/attendance/mark', { registrationId });
      
      toast.success('Attendance marked!');
    }
  };
  
  return (
    <QrReader
      onResult={handleScan}
      constraints={{ facingMode: 'environment' }}
    />
  );
};
```

---

## 📊 **Phase 3 Marks Breakdown (Updated)**

| Feature | Marks | Status | Priority |
|---------|-------|--------|----------|
| **9.1** Navigation Menu | 1 | 🟡 Easy | Low |
| **9.2** My Events Dashboard | 6 | 🔴 Complex | ⭐ High |
| **9.3** Browse Events | 5 | 🟡 Medium | ⭐ High |
| **9.4** Event Details | 2 | 🟢 Easy | Medium |
| **9.5** Registration Workflows | 5 | 🔴 Complex | ⭐ High |
| **9.6** Profile Page | 2 | 🟢 Easy | Low |
| **9.7** Clubs Listing | 1 | 🟢 Easy | Low |
| **9.8** Organizer Detail | 1 | 🟢 Easy | Low |
| **10.1** Navigation Menu | 1 | 🟡 Easy | Low |
| **10.2** Organizer Dashboard | 3 | 🟡 Medium | Medium |
| **10.3** Event Detail (Org) | 4 | 🔴 Complex | ⭐ High |
| **10.4** Event Creation | 4 | 🔴 Complex | ⭐ High |
| **10.5** Organizer Profile | 4 | 🟡 Medium | Medium |
| **11.1** Navigation Menu | 1 | 🟡 Easy | Low |
| **11.2** Manage Organizers | 5 | 🟡 Medium | ⭐ High |
| **TOTAL** | **46** | | |

**Legend:**
- 🟢 Easy (1-2 days)
- 🟡 Medium (3-5 days)
- 🔴 Complex (5-7 days)

---

## ✅ **Environment Variables Needed**

```env
# .env (Backend)
MONGO_URI=mongodb+srv://...
PORT=5000
JWT_SECRET=your_jwt_secret

# Email (Gmail)
EMAIL_USER=your.email@gmail.com
EMAIL_APP_PASSWORD=your_app_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (for Discord links)
FRONTEND_URL=http://localhost:5173

# UPI (for payment QR)
UPI_ID=yourname@paytm
```

---

## 🚀 **Ready to Start!**

**All clarifications confirmed. Implementation plan is complete.**

**Next Steps:**
1. Install new dependencies
2. Set up Cloudinary account
3. Set up Gmail App Password
4. Start with Phase 3A (Registration System)

**Shall I begin implementation?** 🎯

---

**Total Implementation Time:** 4 weeks (28 days)  
**Complexity:** High  
**Confidence:** Very High (all requirements are clear and achievable)
