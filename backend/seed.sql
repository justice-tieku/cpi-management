-- ============================================================================
-- Cross Passion International (CPI) Church Management System
-- Initial Seed Data
-- ============================================================================

-- 1. Insert Initial Profiles (Pastors and Shepherds)
-- Note: Replace UUIDs with real Supabase Auth user IDs when registering users in production.
INSERT INTO public.profiles (id, email, name, role, assigned_cell, branch)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'pastor.adams@crosspassion.org', 'Pastor Adams', 'pastor', NULL, 'Main Sanctuary — Central Cathedral'),
    ('a0000000-0000-0000-0000-000000000002', 'nathan.cole@crosspassion.org', 'Elder Nathan Cole', 'shepherd', 'Bethel Cell (Central)', 'Main Sanctuary — Central Cathedral'),
    ('a0000000-0000-0000-0000-000000000003', 'ruth.taiwo@crosspassion.org', 'Deaconess Ruth Taiwo', 'shepherd', 'Eden Cell (South)', 'Main Sanctuary — Central Cathedral'),
    ('a0000000-0000-0000-0000-000000000004', 'matthew.kim@crosspassion.org', 'Bro. Matthew Kim', 'shepherd', 'Moriah Young Adults', 'Main Sanctuary — Central Cathedral'),
    ('a0000000-0000-0000-0000-000000000005', 'grace.olatunji@crosspassion.org', 'Sister Grace Olatunji', 'shepherd', 'Sharon Cell (East)', 'Main Sanctuary — Central Cathedral'),
    ('a0000000-0000-0000-0000-000000000006', 'emmanuel.vance@crosspassion.org', 'Pastor Emmanuel Vance', 'shepherd', 'Hebron Cell (North)', 'Main Sanctuary — Central Cathedral')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    assigned_cell = EXCLUDED.assigned_cell;

-- 2. Insert Care Cells
INSERT INTO public.care_cells (name, zone, shepherd_id, max_capacity)
VALUES
    ('Bethel Cell (Central)', 'Central', 'a0000000-0000-0000-0000-000000000002', 35),
    ('Eden Cell (South)', 'South', 'a0000000-0000-0000-0000-000000000003', 30),
    ('Moriah Young Adults', 'Campus Area', 'a0000000-0000-0000-0000-000000000004', 30),
    ('Sharon Cell (East)', 'East Gateway', 'a0000000-0000-0000-0000-000000000005', 30),
    ('Hebron Cell (North)', 'North Hills', 'a0000000-0000-0000-0000-000000000006', 35)
ON CONFLICT (name) DO NOTHING;

-- 3. Insert Canonical Members
INSERT INTO public.members (
    id, first_name, last_name, phone, email, city, date_of_birth,
    status, spiritual_stage, department, cell_group, current_shepherd_id, current_shepherd_name,
    registered_at, registered_by, general_notes
)
VALUES
    ('CPI-M-1024', 'David', 'Adebayo', '+1 (555) 234-8901', 'd.adebayo@gmail.com', 'Central District', '1992-11-06', 'Active', 'Commissioned Worker', 'Worship & Choir', 'Bethel Cell (Central)', 'a0000000-0000-0000-0000-000000000002', 'Elder Nathan Cole', '2025-03-12', 'Pastor Adams', 'Faithful in choir practice and Sunday early service communion.'),
    ('CPI-M-1025', 'Sarah', 'Jenkins', '+1 (555) 432-1190', 'sarah.j@outlook.com', 'South Ridge', '1995-04-12', 'Active', 'Foundation Class', 'Ushering', 'Eden Cell (South)', 'a0000000-0000-0000-0000-000000000003', 'Deaconess Ruth Taiwo', '2025-08-19', 'Deaconess Ruth Taiwo', 'Missed consecutive services due to relocation.'),
    ('CPI-M-1026', 'Christian', 'Okon', '+1 (555) 987-6543', 'c.okon@yahoo.com', 'Metro Campus Area', '2001-11-15', 'Active', 'Water Baptized', 'Media & Tech', 'Moriah Young Adults', 'a0000000-0000-0000-0000-000000000004', 'Bro. Matthew Kim', '2026-01-14', 'Bro. Matthew Kim', 'Active youth member in Moriah cell.'),
    ('CPI-M-1031', 'Kimberly', 'Brooks', '+1 (555) 444-9988', 'k.brooks@gmail.com', 'Metro Campus Area', '1998-11-08', 'Active', 'Foundation Class', 'Youth Ushering', 'Moriah Young Adults', 'a0000000-0000-0000-0000-000000000004', 'Bro. Matthew Kim', '2026-02-10', 'Bro. Matthew Kim', 'Attending Friday cell fellowship regularly.'),
    ('CPI-M-1032', 'Joshua', 'Acheampong', '+1 (555) 777-1234', 'j.acheampong@yahoo.com', 'Metro Campus Area', '2000-11-04', 'Active', 'Water Baptized', NULL, 'Moriah Young Adults', 'a0000000-0000-0000-0000-000000000004', 'Bro. Matthew Kim', '2026-03-01', 'Bro. Matthew Kim', 'Student at metro campus.'),
    ('CPI-M-1027', 'Elizabeth', 'Warren', '+1 (555) 321-7788', 'elizabeth.w@crosspassion.org', 'East Gateway', '1985-07-22', 'Active', 'Deacon / Deaconess', 'Protocol & Hospitality', 'Sharon Cell (East)', 'a0000000-0000-0000-0000-000000000005', 'Sister Grace Olatunji', '2024-11-05', 'Pastor Adams', 'Serving faithfully on protocol team.'),
    ('CPI-M-1028', 'Samuel', 'Mensah', '+1 (555) 876-5432', 'samuel.mensah@gmail.com', 'North Hills', '1996-12-01', 'Active', 'New Convert', NULL, 'Hebron Cell (North)', 'a0000000-0000-0000-0000-000000000006', 'Pastor Emmanuel Vance', '2026-09-02', 'Pastor Emmanuel Vance', 'Eager to begin Foundation Class.')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Cell Meetings & Offerings
INSERT INTO public.cell_meetings (id, cell_name, shepherd_id, shepherd_name, meeting_date, topic, attendees_count, offering_amount, notes)
VALUES
    ('CELL-MTG-01', 'Moriah Young Adults', 'a0000000-0000-0000-0000-000000000004', 'Bro. Matthew Kim', '2026-11-03', 'Walking in Spiritual Authority (Romans 8)', 18, 185.00, 'Deep prayer session. 2 members shared breakthrough testimonies.'),
    ('CELL-MTG-02', 'Moriah Young Adults', 'a0000000-0000-0000-0000-000000000004', 'Bro. Matthew Kim', '2026-10-27', 'The Power of Consistency in Prayer', 20, 210.00, 'Welcomed 1 new convert. Cell fellowship offering counted and remitted.'),
    ('CELL-MTG-03', 'Bethel Cell (Central)', 'a0000000-0000-0000-0000-000000000002', 'Elder Nathan Cole', '2026-11-02', 'Faith That Overcomes the World', 31, 420.00, 'Central cell fellowship hosted at Cathedral Annex.')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Finance Ledger Records
INSERT INTO public.finance_records (id, ref, transaction_date, giver, category, method, amount, cell_group, status, recorded_by)
VALUES
    ('FIN-101', 'TXN-9021', '2026-11-05', 'Bro. David Adebayo', 'Tithe', 'Bank Transfer', 850.00, 'Bethel Cell (Central)', 'Approved', 'Finance Secretariat'),
    ('FIN-102', 'TXN-9022', '2026-11-05', 'Sunday 1st Service Collection', 'Sunday Offering', 'Cash / Envelope', 3420.00, NULL, 'Paid/Posted', 'Chief Usher'),
    ('FIN-103', 'TXN-9023', '2026-11-03', 'Moriah Cell Fellowship Offering', 'Cell Fellowship Offering', 'Cash / Envelope', 185.00, 'Moriah Young Adults', 'Approved', 'Bro. Matthew Kim'),
    ('FIN-104', 'TXN-9024', '2026-10-27', 'Moriah Cell Fellowship Offering', 'Cell Fellowship Offering', 'Cash / Envelope', 210.00, 'Moriah Young Adults', 'Paid/Posted', 'Bro. Matthew Kim')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Announcements
INSERT INTO public.announcements (id, title, content, author_id, author_name, priority, target)
VALUES
    ('ANN-001', 'Church-Wide 3 Days Fasting & Prophetic Encounters', 'Beloved Shepherds and Ministers, our corporate monthly 3-day consecration begins this Wednesday. All cell fellowships should align their prayer meetings with this fasting direction. Break daily at 6:00 PM with holy communion.', 'a0000000-0000-0000-0000-000000000001', 'Pastor Adams', 'Urgent', 'all_shepherds'),
    ('ANN-002', 'Mandatory Quarterly Shepherd & Ministerial Review', 'All appointed cell shepherds and assistant leaders are requested to assemble at the Cathedral Conference Annex this Saturday at 9:00 AM. We will review cell attendance reports and kingdom allocations.', 'a0000000-0000-0000-0000-000000000001', 'Pastor Adams', 'High', 'all_shepherds'),
    ('ANN-003', 'Water Baptism & Believers Foundation Class Induction', 'Shepherds should submit the names of all new converts from their cell ready for water baptism by Friday noon.', 'a0000000-0000-0000-0000-000000000001', 'Pastor Adams', 'Normal', 'church_wide')
ON CONFLICT (id) DO NOTHING;

-- 7. Insert Church Events
INSERT INTO public.church_events (id, title, event_date, event_time, location, description, flyer_url, category, created_by)
VALUES
    ('EVT-001', 'Annual Kingdom Harvest Convention 2026', '2026-11-20', '6:00 PM - 9:30 PM (Daily)', 'Central Cathedral — Main Sanctuary', 'A 3-day sacred gathering of revival, apostolic doctrine, supernatural healings, and ministerial impartation. Every care cell is mobilizing their district for the great harvest.', 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80', 'Conference', 'Pastor Adams'),
    ('EVT-002', 'All-Night Prophetic & Miracle Communion Vigil', '2026-11-27', '10:00 PM - 5:00 AM', 'Cathedral Dome & Global Live Stream', 'Overnight breakthrough night of warfare prayers, communion of fire, and prophetic decree. All cell shepherds are expected with their flock delegates.', 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1200&q=80', 'Vigil', 'Pastor Adams'),
    ('EVT-003', 'District Cell Street Evangelism & Soul Outreach', '2026-12-05', '8:00 AM - 12:00 PM', 'Designated Metro Cell Zones & Neighborhoods', 'Simultaneous soul-winning drive across all 5 cell territories. Materials, tracts, and follow-up cards provided by pastoral secretariat.', 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80', 'Cell Outreach', 'Pastor Adams')
ON CONFLICT (id) DO NOTHING;
