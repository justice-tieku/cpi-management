# Cross Passion International (CPI) — Backend Architecture

This folder contains the complete, production-grade Supabase backend for the Cross Passion International Church Management System.

---

## 📁 Directory Structure

```text
backend/
├── schema.sql              # Complete PostgreSQL Database Schema with RLS Policies & Triggers
├── seed.sql                # Initial Seed Data (Pastor, Shepherds, Members, Meetings, Events)
├── types.ts                # TypeScript Database Definitions matching Supabase tables
├── client.ts               # Typed Supabase Client initialized from Vite environment variables
├── index.ts                # Unified module export entrypoint
├── README.md               # Backend documentation and setup guide
└── services/
    ├── memberService.ts    # Member CRUD, cell reassignment, and pastoral notes
    ├── attendanceService.ts# Sunday Communion, Wednesday Midweek, and Vigil recording
    ├── cellMeetingService.ts# Cell meetings and automated offering financial collation
    ├── messagingService.ts # Realtime 1-on-1 private messaging (Pastor <-> Shepherd)
    ├── announcementService.ts# Broadcast announcements with Realtime listeners
    ├── eventService.ts     # Church events, conventions, vigils with flyers
    ├── taskService.ts      # Member follow-up and pastoral care tasks
    └── financeService.ts   # Church stewardship ledger & cell fellowship collections
```

---

## 🔒 Security & Privacy Rules (Enforced at Database Layer with RLS)

Every table has **Row Level Security (RLS)** enabled with strict policies:

1. **Pastor / Administrator:**
   - Full church-wide read and write permissions on every table.
   - Can view all care cells, member records, financial ledgers, and attendance rates.
   - Private 1-on-1 messaging channel with each individual shepherd.

2. **Cell Shepherds:**
   - **Members:** Can only view and update members assigned to their specific care cell.
   - **Attendance:** Can only record and inspect service attendance for their own cell flock.
   - **Cell Meetings:** Can only create and view cell meetings for their assigned cell.
   - **Cell Offerings:** Can only view and remit cell fellowship offerings for their cell. Cannot see tithes, building funds, or other cells.
   - **Messaging Privacy:** Shepherds can **ONLY** message the Pastor. Messages are strictly private — no shepherd can view another shepherd's conversations.
   - **Announcements & Events:** Read-only access to directives and upcoming events published by the pastor.

---

## 🚀 Setup Instructions (Step-by-Step)

### Step 1: Create a Free Project on Supabase
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organization, name it `CPI-Church-Management`, and set your database password.

### Step 2: Run Database Schema
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation bar.
2. Copy the entire contents of [backend/schema.sql](schema.sql).
3. Paste into the SQL Editor and click **Run**.
4. All tables, custom enums, RLS policies, performance indexes, and realtime publications will be created instantly.

### Step 3: Populate Initial Seed Data
1. In the SQL Editor, create a new query.
2. Copy the contents of [backend/seed.sql](seed.sql).
3. Paste and click **Run**.
4. Initial care cells (Bethel, Eden, Moriah, Sharon, Hebron), initial shepherd profiles, canonical members, sample cell meetings, and flyers will be inserted.

### Step 4: Connect to the Frontend
Create or open the `.env` file in the root of the project:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The typed client in `backend/client.ts` will automatically detect your project credentials and switch from local mock mode to cloud database mode.
