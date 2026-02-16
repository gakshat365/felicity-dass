# Phase 2 - Implementation Plan

**Date:** February 16, 2026  
**Status:** Ready to Implement  
**Total Marks:** 9 Marks (Onboarding: 3, User Models: 2, Event Types: 2, Event Attributes: 2)

---

## 📋 Requirements Summary (Based on Clarifications)

### ✅ Clarifications Received

1. **Interest Categories:** 
   - Start with 7: `dance`, `music`, `coding`, `hacking`, `opensource`, `quantum`, `art`
   - Admin can add more via backend DB in future (no UI needed now)

2. **Onboarding Flow:**
   - Appears **immediately after signup**
   - Progressive completion with 30% rule
   - Dismissible banner for incomplete profiles

3. **Event Tags:**
   - Must be from interest areas
   - Special tag: `"other"` for anything outside interest areas

4. **Form Builder:**
   - No file upload question type (for now)
   - 5 question types: Short answer, Long answer, Numerical, MCQ single, MCQ multiple

5. **Payment:**
   - Manual payment proof for now
   - Payment gateway integration in later phases

6. **Profile Completion:**
   - Progressive onboarding (30% rule)
   - Dismissible banner
   - Partial updates allowed
   - Visual progress indicator

---

## 🎯 Phase 2 Implementation Breakdown

### **5. User Onboarding & Preferences [3 Marks]**

#### 5.1 Onboarding Flow
**Trigger:** Immediately after successful registration

**Step 1: Welcome Screen**
- Show welcome message
- Explain benefits of completing profile
- "Let's personalize your experience" CTA
- "Skip for now" option (dismissible)

**Step 2: Areas of Interest**
- Multi-select checkboxes
- Options: `dance`, `music`, `coding`, `hacking`, `opensource`, `quantum`, `art`
- "Select at least 1" validation (soft - can skip)
- Visual: Card-based selection with icons

**Step 3: Clubs to Follow**
- List all approved organizers (clubs, councils, fest teams)
- Categorized tabs: "Clubs" | "Councils" | "Fest Teams"
- Search functionality
- Follow/Unfollow toggle buttons
- Can skip (select 0 clubs)

**Step 4: Additional Info (Optional)**
- College/Organization Name
- Contact Number
- Profile picture upload (future)
- Bio (future)

**Navigation:**
- "Next" button (saves and moves to next step)
- "Skip" button (saves current selections, goes to dashboard)
- Progress dots at top (Step 1/2/3/4)

#### 5.2 Progressive Profile Completion

**Profile Completeness Calculation:**
```javascript
Total Fields (Participant): 10
- firstName (mandatory) ✅
- lastName (mandatory) ✅
- email (mandatory) ✅
- password (mandatory) ✅
- participantType (auto-detected) ✅
- interests (optional) - 10%
- following (optional) - 10%
- collegeName (optional) - 10%
- contactNumber (optional) - 10%
- profilePicture (optional - future) - 10%

Base Completion: 50% (5 mandatory fields)
Each optional field: +10%
Max Completion: 100%
```

**Dashboard Widget:**
```
┌─────────────────────────────────────┐
│  Profile Completeness: 60%          │
│  ████████░░░░░░░░░░                 │
│  Complete your profile to get       │
│  personalized recommendations!      │
│  [Complete Profile] [Dismiss]       │
└─────────────────────────────────────┘
```

**Banner Behavior:**
- Shows if profile < 100%
- Dismissible (stores in localStorage)
- Reappears after 3 days if still incomplete
- Color-coded:
  - Red: < 60%
  - Yellow: 60-90%
  - Green: 90-100%

#### 5.3 Profile Page
**Editable Fields:**

**Participants:**
- ✅ First Name, Last Name
- ✅ Contact Number
- ✅ College/Organization Name
- ✅ Areas of Interest (multi-select)
- ✅ Following (organizer list)
- ✅ Password (separate "Change Password" section)
- ❌ Email (locked, shown as read-only)
- ❌ Participant Type (locked, shown as badge)

**Organizers:**
- ✅ Organizer Name
- ✅ Description
- ✅ Contact Email
- ✅ Contact Number
- ✅ Password
- ❌ Category (locked - shown as badge)
- ❌ Login Email (locked)

**API Endpoint:**
```
PATCH /api/users/profile
- Accepts partial updates
- Recalculates profile completion percentage
- Returns updated user object
```

---

### **6. User Data Models [2 Marks]**

#### 6.1 Participant Model Updates
```javascript
{
  // Existing fields (Phase 1)
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: 'participant',
  participantType: String (enum: ['IIIT Student', 'IIIT Professor', 'Outside IIIT']),
  
  // NEW - Phase 2
  interests: [{
    type: String,
    enum: ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art']
  }],
  following: [{ type: ObjectId, ref: 'User' }], // Organizers
  collegeName: String,
  contactNumber: String,
  profilePicture: String, // URL (future)
  bio: String, // (future)
  
  // Profile completion tracking
  profileCompleteness: { type: Number, default: 50 }, // Percentage
  onboardingCompleted: { type: Boolean, default: false },
  
  timestamps: true
}
```

#### 6.2 Organizer Model Updates
```javascript
{
  // Existing fields (Phase 1)
  firstName: String,
  lastName: String,
  email: String (required, unique),
  password: String (required, hashed),
  role: 'organizer',
  
  // Organizer specific
  organizerName: String (required),
  category: {
    type: String,
    enum: ['club', 'council', 'fest-team'],
    required: true
  },
  description: String,
  contactEmail: String,
  contactNumber: String,
  
  // NEW - Phase 2
  followerCount: { type: Number, default: 0 }, // Denormalized for performance
  isApproved: { type: Boolean, default: false }, // Admin approval
  
  timestamps: true
}
```

---

### **7. Event Types [2 Marks]**

#### 7.1 Normal Event (Individual)
```javascript
{
  type: 'normal',
  // Single participant registration
  // Examples: workshops, talks, competitions
  
  // Custom registration form
  customForm: [{
    questionId: String,
    questionText: String,
    questionType: String (enum: ['short', 'long', 'number', 'mcq-single', 'mcq-multiple']),
    required: Boolean,
    options: [String], // For MCQ types
    wordLimit: Number, // For text types
    order: Number
  }],
  
  // Max 25 questions
  maxQuestions: 25
}
```

#### 7.2 Merchandise Event (Individual)
```javascript
{
  type: 'merchandise',
  // Individual purchase only
  // Examples: T-shirts, hoodies, kits
  
  itemDetails: {
    sizes: [String], // ['S', 'M', 'L', 'XL', 'XXL']
    colors: [String], // ['Black', 'White', 'Blue']
    variants: [String] // ['Hoodie', 'T-Shirt', 'Polo']
  },
  
  stock: Number, // Total available quantity
  purchaseLimitPerUser: Number, // Max items per participant
  
  // No custom form for merchandise
  customForm: [] // Empty
}
```

---

### **8. Event Attributes [2 Marks]**

#### 8.1 Complete Event Schema
```javascript
const eventSchema = mongoose.Schema({
  // Basic Info
  name: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['normal', 'merchandise'], required: true },
  
  // Organizer
  organizer: { type: ObjectId, ref: 'User', required: true },
  
  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date, required: true },
  
  // Constraints
  eligibility: {
    type: String,
    enum: ['All', 'IIIT Students Only', 'IIIT Community', 'Outside IIIT Only', 'Custom'],
    default: 'All'
  },
  eligibilityCustom: String, // For custom eligibility text
  
  registrationLimit: Number, // Max participants
  registrationFee: { type: Number, default: 0 },
  
  // Tags (from interest areas + "other")
  tags: [{
    type: String,
    enum: ['dance', 'music', 'coding', 'hacking', 'opensource', 'quantum', 'art', 'other']
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Type-specific fields
  
  // For Normal Events: Custom Form
  customForm: [{
    questionId: { type: String, required: true }, // UUID
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['short', 'long', 'number', 'mcq-single', 'mcq-multiple'],
      required: true
    },
    required: { type: Boolean, default: false },
    options: [String], // For MCQ types only
    wordLimit: Number, // 50 for short, 200 for long
    order: { type: Number, required: true }
  }],
  
  // For Merchandise Events
  itemDetails: {
    sizes: [String],
    colors: [String],
    variants: [String]
  },
  stock: Number,
  purchaseLimitPerUser: Number,
  
  // Analytics (denormalized for performance)
  registrationCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  
  timestamps: true
});
```

#### 8.2 Dynamic Form Builder Specifications

**Form Builder UI:**
```
┌─────────────────────────────────────────┐
│  Event Registration Form Builder        │
├─────────────────────────────────────────┤
│  Form Title: [Workshop Registration]    │
│  Description: [Enter form description]  │
├─────────────────────────────────────────┤
│  Questions (0/25)                        │
│                                          │
│  [+ Add Question]                        │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ Question 1                         │  │
│  │ Type: [Short Answer ▼]            │  │
│  │ Question: [What is your name?]    │  │
│  │ ☑ Required                        │  │
│  │ Word Limit: 50                    │  │
│  │ [↑] [↓] [Delete]                  │  │
│  └───────────────────────────────────┘  │
│                                          │
│  [Preview Form] [Save Draft] [Publish]  │
└─────────────────────────────────────────┘
```

**Question Types:**

1. **Short Answer**
   - Word limit: 50 words
   - Single line text input
   - Validation: Max 50 words

2. **Long Answer**
   - Word limit: 200 words
   - Multi-line textarea
   - Validation: Max 200 words

3. **Numerical Answer**
   - Number input
   - Validation: Must be a number
   - Optional: Min/Max range

4. **Multiple Choice (Single Select)**
   - Radio buttons
   - Options: Add/Remove/Reorder
   - Validation: Must select one

5. **Multiple Choice (Multiple Select)**
   - Checkboxes
   - Options: Add/Remove/Reorder
   - Validation: At least one selected

**Form Response Storage:**
```javascript
// In Registration model
customFormResponses: {
  type: Map,
  of: mongoose.Schema.Types.Mixed
}

// Example stored data:
{
  "q1-uuid": "John Doe",
  "q2-uuid": "I am interested in AI",
  "q3-uuid": 25,
  "q4-uuid": "option-2",
  "q5-uuid": ["option-1", "option-3"]
}
```

---

## 🎨 Dashboard Sections (Event Discovery)

### Section 1: "For You" (Interest-based)
**Logic:**
```javascript
// Get events matching user's interests
const userInterests = user.interests; // ['coding', 'hacking']
const events = await Event.find({
  tags: { $in: userInterests },
  status: 'published',
  registrationDeadline: { $gte: new Date() }
}).sort({ startDate: 1 });
```

**UI:**
```
┌────────────────────────────────────┐
│  🎯 For You                        │
│  Events matching your interests    │
├────────────────────────────────────┤
│  [Event Card] [Event Card] [...]   │
└────────────────────────────────────┘
```

### Section 2: "Clubs You Follow"
**Logic:**
```javascript
// Get events from followed organizers
const followedOrganizers = user.following; // [ObjectId, ObjectId]
const events = await Event.find({
  organizer: { $in: followedOrganizers },
  status: 'published',
  registrationDeadline: { $gte: new Date() }
}).sort({ startDate: 1 });
```

**UI:**
```
┌────────────────────────────────────┐
│  ⭐ Clubs You Follow               │
│  Events from your favorite clubs   │
├────────────────────────────────────┤
│  [Event Card] [Event Card] [...]   │
└────────────────────────────────────┘
```

### Section 3: "Trending Events"
**Logic:**
```javascript
// Events with most registrations in last 24h
const events = await Event.find({
  status: 'published',
  registrationDeadline: { $gte: new Date() }
}).sort({ registrationCount: -1 }).limit(5);
```

### Section 4: "Ending Soon"
**Logic:**
```javascript
// Events with deadline in next 3 days
const threeDaysFromNow = new Date();
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

const events = await Event.find({
  status: 'published',
  registrationDeadline: { 
    $gte: new Date(),
    $lte: threeDaysFromNow
  }
}).sort({ registrationDeadline: 1 });
```

### Section 5: "All Events"
**Logic:**
```javascript
// All published events with filters
const events = await Event.find({
  status: 'published',
  registrationDeadline: { $gte: new Date() }
}).sort({ createdAt: -1 });
```

---

## 🔧 API Endpoints (Phase 2)

### User/Profile Endpoints
```
PATCH /api/users/profile
- Update user profile (partial updates)
- Calculate profile completeness
- Body: { interests, following, collegeName, contactNumber, ... }

GET /api/users/profile-completion
- Get current profile completion percentage
- Response: { completeness: 70, missingFields: ['contactNumber', 'bio'] }

POST /api/users/onboarding
- Save onboarding preferences
- Body: { interests: [], following: [], skipOnboarding: false }

GET /api/users/organizers
- Get all approved organizers for "Follow" feature
- Query params: ?category=club&search=tech
- Response: [{ _id, organizerName, category, followerCount }]
```

### Event Endpoints
```
POST /api/events
- Create new event (organizer only)
- Body: { name, description, type, dates, tags, customForm, ... }

GET /api/events/for-you
- Get personalized events based on interests
- Requires authentication

GET /api/events/following
- Get events from followed organizers
- Requires authentication

GET /api/events/trending
- Get trending events (most registrations)

GET /api/events/ending-soon
- Get events with deadline approaching

GET /api/events/:id
- Get single event details

PATCH /api/events/:id
- Update event (organizer only, with restrictions based on status)

DELETE /api/events/:id
- Delete event (organizer/admin only, only if draft)
```

---

## 📊 Implementation Priority

### Week 1: User Onboarding (3 Marks)
- [ ] Update User model with new fields
- [ ] Create onboarding flow (4 steps)
- [ ] Implement profile completeness calculation
- [ ] Build profile page with edit functionality
- [ ] Add dismissible banner component
- [ ] API endpoints for profile updates

### Week 2: Event Creation (4 Marks)
- [ ] Update Event model with all attributes
- [ ] Build dynamic form builder UI
- [ ] Implement 5 question types
- [ ] Add form preview functionality
- [ ] Event creation flow (draft → publish)
- [ ] API endpoints for events

### Week 3: Event Discovery (2 Marks)
- [ ] "For You" section with interest matching
- [ ] "Clubs You Follow" section
- [ ] "Trending Events" section
- [ ] "Ending Soon" section
- [ ] "All Events" with filters
- [ ] Event card component

---

## ✅ Success Criteria

### Onboarding [3 Marks]
- ✅ Appears immediately after signup
- ✅ 4-step flow (Welcome → Interests → Follow → Additional)
- ✅ Can skip at any step
- ✅ Progressive profile completion (30% rule)
- ✅ Dismissible banner on dashboard
- ✅ Profile page with edit functionality
- ✅ Partial updates supported

### User Models [2 Marks]
- ✅ All required participant fields
- ✅ All required organizer fields
- ✅ Profile completeness tracking
- ✅ Interest areas stored and validated

### Event Types [2 Marks]
- ✅ Normal event with custom form
- ✅ Merchandise event with item details
- ✅ Clear distinction in UI/UX

### Event Attributes [2 Marks]
- ✅ All required fields present
- ✅ Tags from interest areas + "other"
- ✅ Dynamic form builder (max 25 questions)
- ✅ 5 question types implemented
- ✅ Form responses stored as JSON

---

**Total Phase 2: 9 Marks**

Ready to start implementation! 🚀
