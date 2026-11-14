-- ============================================================================
-- Cross Passion International (CPI) Church Management System
-- Production Supabase Database Schema
-- Version: 1.0.0
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('pastor', 'shepherd', 'finance_officer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM (
        'Pending Verification',
        'New Member',
        'Active',
        'Inactive',
        'Transferred',
        'Deceased'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE spiritual_stage AS ENUM (
        'New Convert',
        'Water Baptized',
        'Foundation Class',
        'Commissioned Worker',
        'Deacon / Deaconess',
        'Minister / Elder'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Excused', 'Not Recorded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_status AS ENUM ('Open', 'In Progress', 'Waiting', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_type AS ENUM (
        'Absence Follow-Up',
        'First-Timer Welcome',
        'Pastoral Visitation',
        'Prayer Request',
        'Welfare Check'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Normal', 'Medium', 'High', 'Urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE visitor_stage AS ENUM (
        'First Visit',
        'Contact Attempted',
        'Contacted',
        'Invited Back',
        'Returned',
        'Joined/Registered',
        'Closed'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE announcement_target AS ENUM ('all_shepherds', 'church_wide');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE event_category AS ENUM (
        'Conference',
        'Revival',
        'Cell Outreach',
        'Vigil',
        'Communion',
        'Youth',
        'Special Service'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLES

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'shepherd',
    assigned_cell TEXT,
    branch TEXT NOT NULL DEFAULT 'Main Sanctuary — Central Cathedral',
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Care Cells Definition
CREATE TABLE IF NOT EXISTS public.care_cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    zone TEXT,
    shepherd_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    max_capacity INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Canonical Members
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    city TEXT DEFAULT 'Central District',
    date_of_birth DATE,
    status member_status NOT NULL DEFAULT 'Active',
    spiritual_stage spiritual_stage NOT NULL DEFAULT 'New Convert',
    department TEXT,
    cell_group TEXT NOT NULL,
    current_shepherd_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    current_shepherd_name TEXT,
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    registered_by TEXT NOT NULL,
    general_notes TEXT,
    confidential_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Shepherd Assignment History
CREATE TABLE IF NOT EXISTS public.shepherd_assignments (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    shepherd_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shepherd_name TEXT NOT NULL,
    cell_group TEXT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'Active',
    assigned_by TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Attendance Records (Sunday, Midweek, Vigil)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    service_name TEXT NOT NULL,
    service_date DATE NOT NULL,
    service_category TEXT NOT NULL DEFAULT 'sunday',
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    cell_group TEXT NOT NULL,
    shepherd_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status attendance_status NOT NULL DEFAULT 'Present',
    recorded_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    consecutive_absences INTEGER NOT NULL DEFAULT 0
);

-- Weekly Cell Fellowship Meetings & Cell Offerings
CREATE TABLE IF NOT EXISTS public.cell_meetings (
    id TEXT PRIMARY KEY,
    cell_name TEXT NOT NULL,
    shepherd_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shepherd_name TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    topic TEXT NOT NULL,
    attendees_count INTEGER NOT NULL DEFAULT 0,
    offering_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Pastoral Follow-Up Tasks
CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    shepherd_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shepherd_name TEXT NOT NULL,
    task_type follow_up_type NOT NULL,
    due_date TEXT,
    priority priority_level NOT NULL DEFAULT 'Medium',
    status follow_up_status NOT NULL DEFAULT 'Open',
    next_action TEXT,
    notes TEXT,
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- First-Timers / Guests
CREATE TABLE IF NOT EXISTS public.visitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_attended TEXT NOT NULL,
    invited_by TEXT,
    assigned_shepherd_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_shepherd_name TEXT,
    journey_stage visitor_stage NOT NULL DEFAULT 'First Visit',
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Finance & Stewardship Ledger
CREATE TABLE IF NOT EXISTS public.finance_records (
    id TEXT PRIMARY KEY,
    ref TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    giver TEXT NOT NULL,
    category TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'Cash / Envelope',
    amount NUMERIC(12, 2) NOT NULL,
    cell_group TEXT,
    status TEXT NOT NULL DEFAULT 'Submitted',
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Private Messages (Shepherd <-> Pastor)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role user_role NOT NULL,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Church Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    priority priority_level NOT NULL DEFAULT 'Normal',
    target announcement_target NOT NULL DEFAULT 'all_shepherds',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Church Events & Programs
CREATE TABLE IF NOT EXISTS public.church_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    flyer_url TEXT,
    category event_category NOT NULL DEFAULT 'Conference',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- System Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    notification_type TEXT NOT NULL DEFAULT 'general',
    member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_members_shepherd ON public.members(current_shepherd_id);
CREATE INDEX IF NOT EXISTS idx_members_cell ON public.members(cell_group);
CREATE INDEX IF NOT EXISTS idx_members_dob ON public.members(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(service_date);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON public.attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_meetings_shepherd ON public.cell_meetings(shepherd_id);
CREATE INDEX IF NOT EXISTS idx_tasks_shepherd ON public.follow_up_tasks(shepherd_id);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.chat_messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);

-- 5. HELPER FUNCTIONS FOR SECURITY (RLS)
CREATE OR REPLACE FUNCTION public.is_pastor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'pastor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_assigned_cell()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT assigned_cell FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Shepherds ONLY see their own cell & private messages.
-- Pastor has church-wide access to all data.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shepherd_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Pastor can manage all profiles"
ON public.profiles FOR ALL TO authenticated USING (public.is_pastor());

-- Members Policies
CREATE POLICY "Members viewable by pastor or cell shepherd"
ON public.members FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    current_shepherd_id = auth.uid() OR
    cell_group = public.get_assigned_cell()
);

CREATE POLICY "Members insertable by pastor or cell shepherd"
ON public.members FOR INSERT TO authenticated
WITH CHECK (
    public.is_pastor() OR
    current_shepherd_id = auth.uid() OR
    cell_group = public.get_assigned_cell()
);

CREATE POLICY "Members updatable by pastor or cell shepherd"
ON public.members FOR UPDATE TO authenticated
USING (
    public.is_pastor() OR
    current_shepherd_id = auth.uid() OR
    cell_group = public.get_assigned_cell()
);

CREATE POLICY "Members deletable by pastor only"
ON public.members FOR DELETE TO authenticated
USING (public.is_pastor());

-- Attendance Policies
CREATE POLICY "Attendance viewable by pastor or cell shepherd"
ON public.attendance_records FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid() OR
    cell_group = public.get_assigned_cell()
);

CREATE POLICY "Attendance manageable by pastor or cell shepherd"
ON public.attendance_records FOR ALL TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid() OR
    cell_group = public.get_assigned_cell()
);

-- Cell Meetings Policies
CREATE POLICY "Cell meetings viewable by pastor or cell shepherd"
ON public.cell_meetings FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid() OR
    cell_name = public.get_assigned_cell()
);

CREATE POLICY "Cell meetings insertable by cell shepherd"
ON public.cell_meetings FOR INSERT TO authenticated
WITH CHECK (
    public.is_pastor() OR
    shepherd_id = auth.uid()
);

CREATE POLICY "Cell meetings updatable by cell shepherd"
ON public.cell_meetings FOR UPDATE TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid()
);

-- Follow-Up Tasks Policies
CREATE POLICY "Tasks viewable by pastor or assigned shepherd"
ON public.follow_up_tasks FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid()
);

CREATE POLICY "Tasks manageable by assigned shepherd or pastor"
ON public.follow_up_tasks FOR ALL TO authenticated
USING (
    public.is_pastor() OR
    shepherd_id = auth.uid()
);

-- Visitors Policies
CREATE POLICY "Visitors viewable by pastor or assigned shepherd"
ON public.visitors FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    assigned_shepherd_id = auth.uid()
);

CREATE POLICY "Visitors manageable by assigned shepherd or pastor"
ON public.visitors FOR ALL TO authenticated
USING (
    public.is_pastor() OR
    assigned_shepherd_id = auth.uid()
);

-- Finance Policies (Pastor sees all; Shepherd sees ONLY cell fellowship offerings for their cell)
CREATE POLICY "Finance viewable by pastor or own cell fellowship offerings"
ON public.finance_records FOR SELECT TO authenticated
USING (
    public.is_pastor() OR
    (category = 'Cell Fellowship Offering' AND cell_group = public.get_assigned_cell())
);

CREATE POLICY "Finance insertable by shepherd for cell offering or by pastor"
ON public.finance_records FOR INSERT TO authenticated
WITH CHECK (
    public.is_pastor() OR
    (category = 'Cell Fellowship Offering' AND cell_group = public.get_assigned_cell())
);

CREATE POLICY "Finance updatable/deletable by pastor only"
ON public.finance_records FOR UPDATE TO authenticated
USING (public.is_pastor());

-- Chat Messages (Strict 1-on-1 Privacy)
-- A shepherd CANNOT see any other shepherd's messages!
CREATE POLICY "Messages viewable only by conversation participants"
ON public.chat_messages FOR SELECT TO authenticated
USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    public.is_pastor()
);

CREATE POLICY "Messages insertable by sender"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Messages updatable by recipient (mark read)"
ON public.chat_messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid());

-- Announcements Policies (Pastor writes, all authenticated read)
CREATE POLICY "Announcements viewable by all authenticated users"
ON public.announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Announcements manageable by pastor only"
ON public.announcements FOR ALL TO authenticated
USING (public.is_pastor());

-- Events Policies (Pastor writes, all authenticated read)
CREATE POLICY "Events viewable by all authenticated users"
ON public.church_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Events manageable by pastor only"
ON public.church_events FOR ALL TO authenticated
USING (public.is_pastor());

-- Notifications Policies
CREATE POLICY "Notifications viewable only by recipient"
ON public.notifications FOR SELECT TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "Notifications updatable only by recipient"
ON public.notifications FOR UPDATE TO authenticated
USING (recipient_id = auth.uid());

-- Audit Logs Policies (Pastor only)
CREATE POLICY "Audit logs viewable by pastor only"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_pastor());

CREATE POLICY "Audit logs insertable by all authenticated systems"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- 7. AUTOMATED TRIGGER: Sync new auth.users into profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, assigned_cell)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'shepherd'),
        new.raw_user_meta_data->>'assigned_cell'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. REALTIME REPLICATION (For live chat and updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.church_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
