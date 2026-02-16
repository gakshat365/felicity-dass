# Phase 3 - Complete Analysis & Implementation Plan

**Date:** February 16, 2026  
**Total Marks:** 46 (22 Participant + 18 Organizer + 6 Admin)

---

## 📊 **Phase 3 Overview**

Phase 3 focuses on **core event management functionality** - registrations, tickets, analytics, and full CRUD operations for all roles.

### **Three Main Sections:**
1. **Participant Features** (9.1-9.8) - 22 Marks
2. **Organizer Features** (10.1-10.5) - 18 Marks  
3. **Admin Features** (11.1-11.2) - 6 Marks

---

## 🎯 **Section 9: Participant Features [22 Marks]**

### **9.1 Navigation Menu [1 Mark]**
**Requirements:**
- Dashboard
- Browse Events
- Clubs/Organizers
- Profile
- Logout

**Current Status:**
- ✅ Dashboard - Implemented
- ✅ Browse Events - Implemented
- ❌ Clubs/Organizers - Need to create
- ✅ Profile - Implemented
- ✅ Logout - Implemented

**Implementation:**
- Create Navbar component with all links
- Add to all participant pages
- Highlight active route

---

### **9.2 My Events Dashboard [6 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Upcoming Events Section:**
- Display all registered upcoming events
- Show: Event name, type, organizer, schedule
- Filter: Only future events

#### **Participation History (Tabs):**
1. **Normal** - Normal event registrations
2. **Merchandise** - Merchandise purchases
3. **Completed** - Past events attended
4. **Cancelled/Rejected** - Cancelled or rejected registrations

#### **Event Records Display:**
- Event name
- Event type
- Organizer name
- Participation status
- Team name (if applicable)
- **Clickable Ticket ID** (opens ticket view)

**Backend Needs:**
- Registration model (already exists)
- GET `/api/registrations/my-registrations` endpoint
- Filter by status, type, date
- Include ticket data

**Frontend Needs:**
- MyRegistrations page (replace placeholder)
- Tabs component
- Event cards for each registration
- Ticket modal/page

---

### **9.3 Browse Events Page [5 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Search:**
- Partial matching on event names
- Partial matching on organizer names
- Fuzzy matching support

#### **Features:**
- **Trending**: Top 5 events in last 24 hours (by registrations)

#### **Filters:**
- Event Type (Normal/Merchandise)
- Eligibility (All, IIIT Students, IIIT Community, Outside IIIT, Custom)
- Date Range (start date, end date)
- Followed Clubs (show only from followed organizers)
- All Events (default)

**Current Status:**
- ✅ Basic browse page exists
- ✅ Type filter exists
- ✅ Tag filter exists
- ❌ Need to add: Fuzzy search, trending, eligibility filter, date range, followed clubs filter

**Backend Needs:**
- Update GET `/api/events` with more filters
- Add fuzzy search logic
- Add trending endpoint (already exists)
- Add date range filtering

**Frontend Needs:**
- Update BrowseEvents.jsx with all filters
- Add date range picker
- Add "Followed Clubs" toggle
- Improve search with debouncing

---

### **9.4 Event Details Page [2 Marks]**

**Requirements:**

#### **Info Display:**
- Complete event details
- Event type clearly indicated
- Registration/Purchase button with validation

#### **Blocking Conditions:**
- Deadline passed → Disable button
- Registration limit reached → Disable button
- Stock exhausted (merchandise) → Disable button
- Show appropriate message for each case

**Current Status:**
- ✅ Basic event details page exists
- ❌ Need to add: Registration button, validation logic, blocking conditions

**Backend Needs:**
- Check registration eligibility endpoint
- Validate deadline, limits, stock

**Frontend Needs:**
- Update EventDetails.jsx
- Add registration button
- Add validation logic
- Show blocking messages

---

### **9.5 Event Registration Workflows [5 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Normal Event Registration:**
1. User fills custom registration form
2. Submit registration
3. Generate ticket with QR code
4. Send ticket via email
5. Store in Participation History
6. Show success message

#### **Merchandise Purchase:**
1. User selects size/color/variant
2. Submit purchase
3. Decrement stock
4. Generate ticket with QR code
5. Send confirmation email
6. Block if out of stock

#### **Ticket & QR Code:**
- Event details
- Participant details
- Unique Ticket ID
- QR code (encode ticket ID + event ID + user ID)
- Downloadable PDF

**Backend Needs:**
- POST `/api/registrations` endpoint
- Ticket generation service
- QR code generation (use `qrcode` library)
- Email service (use `nodemailer`)
- Stock management for merchandise
- PDF generation (use `pdfkit` or similar)

**Frontend Needs:**
- Registration form modal
- Merchandise selection UI
- Success confirmation
- Ticket display/download

---

### **9.6 Profile Page [2 Marks]**

**Requirements:**

#### **Editable Fields:**
- First Name
- Last Name
- Contact Number
- College/Organization Name
- Selected Interests
- Followed Clubs

#### **Non-Editable Fields:**
- Email Address (locked)
- Participant Type (locked)

#### **Security Settings:**
- Password reset/change mechanism
- Authentication required
- Validation

**Current Status:**
- ✅ Profile page exists with most fields
- ❌ Need to add: Password change functionality

**Backend Needs:**
- POST `/api/users/change-password` endpoint
- Verify old password
- Hash new password

**Frontend Needs:**
- Add password change section to Profile.jsx
- Password strength indicator
- Confirmation modal

---

### **9.7 Clubs/Organizers Listing Page [1 Mark]**

**Requirements:**
- List all approved organizers
- Show: Name, Category, Description
- Action: Follow/Unfollow button

**Current Status:**
- ❌ Need to create this page

**Backend Needs:**
- GET `/api/users/organizers` (already exists)
- POST `/api/users/follow/:id` (already exists)

**Frontend Needs:**
- Create ClubsListing.jsx page
- Organizer cards
- Follow/Unfollow buttons
- Search/filter by category

---

### **9.8 Organizer Detail Page (Participant View) [1 Mark]**

**Requirements:**
- Show: Name, Category, Description, Contact Email
- List: Upcoming events, Past events

**Current Status:**
- ❌ Need to create this page

**Backend Needs:**
- GET `/api/users/organizer/:id` endpoint
- GET `/api/events/organizer/:id/upcoming`
- GET `/api/events/organizer/:id/past`

**Frontend Needs:**
- Create OrganizerDetail.jsx page
- Event tabs (Upcoming/Past)
- Follow button

---

## 🎯 **Section 10: Organizer Features [18 Marks]**

### **10.1 Navigation Menu [1 Mark]**
**Requirements:**
- Dashboard
- Create Event
- Profile
- Logout
- Ongoing Events

**Current Status:**
- ✅ Most links exist
- ❌ Need to add: Ongoing Events link

**Implementation:**
- Create Navbar component
- Add "Ongoing Events" route

---

### **10.2 Organizer Dashboard [3 Marks]**

**Requirements:**

#### **Events Carousel:**
- Display all organizer's events as cards
- Show: Name, Type, Status (Draft/Published/Ongoing/Closed)
- Link to event detail page for management

#### **Event Analytics:**
- Registrations count
- Sales count
- Revenue total
- Attendance stats
- Only for completed events

**Current Status:**
- ❌ Need to replace placeholder with real dashboard

**Backend Needs:**
- GET `/api/events/organizer/my-events` (already exists)
- GET `/api/events/:id/analytics` endpoint

**Frontend Needs:**
- Update Dashboard.jsx for organizers
- Events carousel/grid
- Analytics cards
- Charts (optional)

---

### **10.3 Event Detail Page (Organizer View) [4 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Overview Section:**
- Name, Type, Status
- Dates (start, end, deadline)
- Eligibility
- Pricing

#### **Analytics Section:**
- Registrations/Sales count
- Attendance count
- Team completion percentage
- Revenue total

#### **Participants Section:**
- List all registered participants
- Show: Name, Email, Registration Date, Payment Status, Team, Attendance
- Search participants
- Filter by payment/attendance
- **Export to CSV**

**Backend Needs:**
- GET `/api/events/:id/participants` endpoint
- CSV export logic
- Analytics calculation

**Frontend Needs:**
- Create OrganizerEventDetail.jsx page
- Participants table
- Search/filter UI
- CSV download button
- Analytics charts

---

### **10.4 Event Creation & Editing [4 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Creation Flow:**
1. Create event (Draft status)
2. Define all required fields (from Section 8)
3. Build custom registration form
4. Publish event

#### **Editing Rules:**
- **Draft**: Free edits, can publish
- **Published**: Can update description, extend deadline, increase limit, close registrations
- **Ongoing/Completed**: No edits except status change

#### **Form Builder:**
- Support field types: text, dropdown, checkbox, file upload, etc.
- Mark fields as required/optional
- Reorder fields (drag & drop)
- **Lock form after first registration**

**Current Status:**
- ❌ Need to replace placeholder with real form

**Backend Needs:**
- POST `/api/events` (already exists)
- PATCH `/api/events/:id` with edit rules (already exists)
- Validate edit permissions based on status

**Frontend Needs:**
- Create CreateEvent.jsx (full implementation)
- Form builder component
- Drag & drop for field ordering
- Field type selector
- Preview mode
- Publish button

---

### **10.5 Organizer Profile Page [4 Marks]**

**Requirements:**

#### **Editable Fields:**
- Name
- Category
- Description
- Contact Email
- Contact Number
- Login email (non-editable)

#### **Discord Webhook:**
- Input webhook URL
- Auto-post new events to Discord
- Test webhook button

**Current Status:**
- ✅ Basic profile exists
- ❌ Need to add: Discord webhook functionality

**Backend Needs:**
- Add `discordWebhook` field to User model
- POST to Discord when event is published
- Discord webhook service

**Frontend Needs:**
- Add Discord webhook section to Profile
- Test webhook button
- Webhook URL validation

---

## 🎯 **Section 11: Admin Features [6 Marks]**

### **11.1 Navigation Menu [1 Mark]**
**Requirements:**
- Dashboard
- Manage Clubs/Organizers
- Password Reset Requests
- Logout

**Current Status:**
- ✅ Basic admin dashboard exists
- ❌ Need to add: Manage Clubs, Password Reset pages

---

### **11.2 Club/Organizer Management [5 Marks]** ⭐ MAJOR FEATURE

**Requirements:**

#### **Add New Club/Organizer:**
- Admin creates new organizer account
- System auto-generates email and password
- Admin receives credentials
- Admin shares with club/organizer
- New account can immediately log in

#### **Remove Club/Organizer:**
- View list of all clubs/organizers
- Remove or disable accounts
- Removed clubs cannot log in
- Option to archive or permanently delete

**Backend Needs:**
- POST `/api/admin/create-organizer` endpoint
- Auto-generate email format: `{name}@clubs.iiit.ac.in`
- Auto-generate random password
- DELETE `/api/admin/organizer/:id` endpoint
- PATCH `/api/admin/organizer/:id/disable` endpoint

**Frontend Needs:**
- Create ManageOrganizers.jsx page
- Add organizer form
- Organizers list table
- Delete/Disable buttons
- Credentials display modal

---

## 📋 **Implementation Priority**

### **Phase 3A - Core Registration (Week 1):**
1. ✅ Registration model & API
2. ✅ Event registration workflow
3. ✅ Ticket generation & QR codes
4. ✅ Email service setup
5. ✅ My Events Dashboard (participant)

### **Phase 3B - Event Management (Week 2):**
1. ✅ Event creation form (full implementation)
2. ✅ Form builder component
3. ✅ Event editing with rules
4. ✅ Organizer event detail page
5. ✅ Participant list & CSV export

### **Phase 3C - Enhanced Features (Week 3):**
1. ✅ Browse events enhancements (fuzzy search, filters)
2. ✅ Clubs/Organizers listing
3. ✅ Organizer detail page
4. ✅ Analytics dashboard
5. ✅ Discord webhook

### **Phase 3D - Admin Features (Week 4):**
1. ✅ Manage organizers
2. ✅ Password reset requests
3. ✅ System analytics
4. ✅ Final testing & polish

---

## 🗂️ **New Models Needed**

### **Already Exists:**
- ✅ Registration model
- ✅ Team model (for future)
- ✅ Message model (for forums)
- ✅ Feedback model

### **Might Need:**
- Ticket model (or embed in Registration)
- PasswordReset model (for reset requests)

---

## 📦 **New Dependencies Needed**

### **Backend:**
```json
{
  "qrcode": "^1.5.3",           // QR code generation
  "nodemailer": "^6.9.7",       // Email sending
  "pdfkit": "^0.13.0",          // PDF generation
  "csv-writer": "^1.6.0",       // CSV export
  "axios": "^1.6.2"             // Discord webhook
}
```

### **Frontend:**
```json
{
  "react-beautiful-dnd": "^13.1.1",  // Drag & drop for form builder
  "date-fns": "^2.30.0",             // Date formatting
  "react-datepicker": "^4.21.0",     // Date range picker
  "fuse.js": "^7.0.0"                // Fuzzy search
}
```

---

## 📊 **Phase 3 Marks Distribution**

| Section | Feature | Marks | Priority |
|---------|---------|-------|----------|
| **9.1** | Navigation Menu | 1 | Low |
| **9.2** | My Events Dashboard | 6 | ⭐ High |
| **9.3** | Browse Events | 5 | ⭐ High |
| **9.4** | Event Details | 2 | Medium |
| **9.5** | Registration Workflows | 5 | ⭐ High |
| **9.6** | Profile Page | 2 | Low |
| **9.7** | Clubs Listing | 1 | Low |
| **9.8** | Organizer Detail | 1 | Low |
| **10.1** | Navigation Menu | 1 | Low |
| **10.2** | Organizer Dashboard | 3 | Medium |
| **10.3** | Event Detail (Org) | 4 | ⭐ High |
| **10.4** | Event Creation | 4 | ⭐ High |
| **10.5** | Organizer Profile | 4 | Medium |
| **11.1** | Navigation Menu | 1 | Low |
| **11.2** | Manage Organizers | 5 | ⭐ High |
| **TOTAL** | | **46** | |

---

## 🎯 **High Priority Features (30 Marks):**
1. Event Registration Workflows (5 marks)
2. My Events Dashboard (6 marks)
3. Browse Events Enhancements (5 marks)
4. Event Creation & Form Builder (4 marks)
5. Event Detail - Organizer View (4 marks)
6. Manage Organizers (5 marks)

---

## ✅ **What's Already Done from Phase 2:**

From Phase 2, we already have:
- ✅ User models with interests & following
- ✅ Event models with custom forms
- ✅ Registration model
- ✅ Basic browse events page
- ✅ Basic event details page
- ✅ Basic profile page
- ✅ Onboarding flow
- ✅ Profile completeness tracking

**This gives us a ~20% head start on Phase 3!**

---

## 📝 **Next Steps:**

1. **Review this analysis** with the user
2. **Prioritize features** based on marks
3. **Start with high-priority items** (30 marks)
4. **Install new dependencies**
5. **Begin implementation**

---

**Total Phase 3 Marks:** 46  
**Estimated Implementation Time:** 3-4 weeks  
**Complexity:** High (involves tickets, QR codes, emails, form builder)

---

**Ready to start Phase 3 implementation?** 🚀
