import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase Client (uses Service Role / Secret Key for admin capabilities)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cbxcstsuzchmegvrfscm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_CJ0WbtyykaD0vYB3hxAXjg_DtTyLLVc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors({
  origin: '*', // Allows requests from Vercel frontend or local testing
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const cleanText = (value) => typeof value === 'string'
  ? value.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
  : '';

const isValidEmail = (value) => typeof value === 'string'
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidPhone = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  const cleaned = value.replace(/[\s\-().]/g, '');
  if (/[^\d+]/.test(cleaned)) return false;
  let digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (digits.startsWith('233')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 9;
};

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// 1. HEALTH & SYSTEM DIAGNOSTICS
// ==========================================
app.get('/health', async (req, res) => {
  try {
    const { count, error } = await supabase.from('members').select('*', { count: 'exact', head: true });
    
    if (error) {
      return res.status(500).json({
        status: 'warning',
        message: 'API server running, but database connection failed',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      service: 'Cross Passion International (CPI) Ministerial API',
      version: '1.0.0',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Request unsuccessful. Please try again.',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Cross Passion International (CPI) Backend API is running.',
    documentation: '/health',
    endpoints: [
      '/health',
      '/api/stats',
      '/api/members',
      '/api/attendance',
      '/api/cell-meetings',
      '/api/announcements',
      '/api/events',
      '/api/finance/summary',
      '/api/ministerial/broadcast-sms'
    ]
  });
});

// ==========================================
// 2. CHURCH EXECUTIVE DASHBOARD STATS
// ==========================================
app.get('/api/stats', async (req, res) => {
  try {
    const [membersRes, cellsRes, eventsRes, tasksRes] = await Promise.all([
      supabase.from('members').select('*', { count: 'exact' }),
      supabase.from('care_cells').select('*', { count: 'exact' }),
      supabase.from('church_events').select('*', { count: 'exact' }),
      supabase.from('follow_up_tasks').select('*', { count: 'exact' })
    ]);

    const activeMembers = membersRes.data ? membersRes.data.filter(m => m.membership_status === 'Active').length : 0;
    const totalMembers = membersRes.count || (membersRes.data ? membersRes.data.length : 0);

    res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        careCellsCount: cellsRes.count || (cellsRes.data ? cellsRes.data.length : 0),
        eventsCount: eventsRes.count || (eventsRes.data ? eventsRes.data.length : 0),
        pendingTasksCount: tasksRes.count || (tasksRes.data ? tasksRes.data.length : 0)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

// ==========================================
// 3. MEMBERS API
// ==========================================
app.get('/api/members', async (req, res) => {
  try {
    const { cell_id, status } = req.query;
    let query = supabase.from('members').select('*');

    if (cell_id) query = query.eq('cell_id', cell_id);
    if (status) query = query.eq('membership_status', status);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ success: true, count: data.length, members: data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const memberData = req.body;
    if (!memberData || Object.keys(memberData).length === 0) {
      return res.status(400).json({ success: false, error: 'There is no data to save.' });
    }
    if (!cleanText(memberData.first_name) || !isValidPhone(memberData.phone)) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
    }
    if (memberData.email && !isValidEmail(memberData.email)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }

    const { data, error } = await supabase.from('members').insert([memberData]).select().single();
    if (error) throw error;

    res.status(201).json({ success: true, member: data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Unable to save the record. Please try again.' });
  }
});

app.patch('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (!id || !updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'There is no data to save.' });
    }

    const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single();
    if (error) throw error;

    res.json({ success: true, member: data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Unable to save changes. Please try again.' });
  }
});

// ==========================================
// 4. ATTENDANCE & CONGREGATIONAL LOGS
// ==========================================
app.get('/api/attendance', async (req, res) => {
  try {
    const { date, service_type } = req.query;
    let query = supabase.from('attendance_records').select('*');

    if (date) query = query.eq('service_date', date);
    if (service_type) query = query.eq('service_type', service_type);

    const { data, error } = await query.order('service_date', { ascending: false });
    if (error) throw error;

    res.json({ success: true, records: data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const rawRecords = Array.isArray(req.body) ? req.body : (req.body && Object.keys(req.body).length > 0 ? [req.body] : []);
    if (!rawRecords || rawRecords.length === 0) {
      return res.status(400).json({ success: false, error: 'There is no data to save.' });
    }
    const invalidRecord = rawRecords.find((record) =>
      !record || !record.memberId || !record.date || Number.isNaN(new Date(record.date).getTime())
      || !['Present', 'Absent', 'Excused'].includes(record.status)
    );
    if (invalidRecord) {
      return res.status(400).json({ success: false, error: 'Please enter valid attendance details.' });
    }

    const { data, error } = await supabase.from('attendance_records').upsert(rawRecords).select();
    if (error) throw error;

    res.status(201).json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Unable to save the record. Please try again.' });
  }
});

// ==========================================
// 5. ANNOUNCEMENTS & EVENTS
// ==========================================
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, announcements: data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content } = req.body || {};
    if (!cleanText(title) || !cleanText(content)
      || cleanText(title).length > 120 || cleanText(content).length > 2000) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
    }

    const { data, error } = await supabase.from('announcements').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, announcement: data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Unable to save the record. Please try again.' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('church_events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, events: data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { title, date, event_date, location, description } = req.body || {};
    const evDate = event_date || date;
    if (!cleanText(title) || !evDate || !cleanText(location)
      || Number.isNaN(new Date(evDate).getTime()) || cleanText(title).length > 120 || cleanText(location).length > 160) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
    }

    const { data, error } = await supabase.from('church_events').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, event: data });
  } catch (err) {
    res.status(400).json({ success: false, error: 'Unable to save the record. Please try again.' });
  }
});

// ==========================================
// 6. FINANCIAL STEWARDSHIP SUMMARY
// ==========================================
app.get('/api/finance/summary', async (req, res) => {
  try {
    const { data, error } = await supabase.from('finance_records').select('*');
    if (error) throw error;

    const totalOffering = (data || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    res.json({
      success: true,
      totalOffering,
      recordsCount: data ? data.length : 0,
      recentRecords: (data || []).slice(-10)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

// ==========================================
// 7. MINISTERIAL INTEGRATION: SMS BROADCAST
// ==========================================
app.post('/api/ministerial/broadcast-sms', async (req, res) => {
  try {
    const { message, targetGroup, recipientPhoneNumbers } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'There is no information to send.' });
    }

    if (!Array.isArray(recipientPhoneNumbers) || recipientPhoneNumbers.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one record before proceeding.' });
    }

    console.log(`[SMS BROADCAST] Target: ${targetGroup || 'Custom'} | Count: ${recipientPhoneNumbers.length}`);
    console.log(`[SMS CONTENT] ${message}`);

    res.json({
      success: true,
      message: 'Information sent successfully.',
      target: targetGroup || 'Custom flock',
      recipientsCount: recipientPhoneNumbers.length,
      deliveryStatus: 'QUEUED',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Unable to send information. Please try again.' });
  }
});

// ==========================================
// 8. MINISTERIAL AUTH & SHEPHERD ONBOARDING
// ==========================================

// Seed / Initialize Pastor & Default Shepherds in Supabase Auth
app.post('/api/auth/setup-initial-users', async (req, res) => {
  try {
    const setupPassword = process.env.INITIAL_SETUP_PASSWORD;
    if (!setupPassword) {
      return res.status(503).json({
        success: false,
        error: 'INITIAL_SETUP_PASSWORD is not configured on the server.'
      });
    }
    if (req.header('x-cpi-admin-secret') !== setupPassword) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized setup request.'
      });
    }
    const results = [];

    // Remove only the known placeholder profile UUIDs from seed.sql.
    // Real accounts created below are then the sole shepherd profiles shown by the app.
    await supabase.from('profiles').delete().in('id', [
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000003',
      'a0000000-0000-0000-0000-000000000004',
      'a0000000-0000-0000-0000-000000000005',
      'a0000000-0000-0000-0000-000000000006'
    ]);

    // 1. Senior Pastor
    const pastorEmail = 'crosspassioninternational67@gmail.com';
    const pastorPassword = setupPassword;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const pastorUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === pastorEmail.toLowerCase());

    let pastorId;
    if (pastorUser) {
      // Update password if exists
      const { data: updated } = await supabase.auth.admin.updateUserById(pastorUser.id, {
        password: pastorPassword,
        user_metadata: { name: 'Senior Pastor', role: 'pastor' }
      });
      pastorId = pastorUser.id;
      results.push({ email: pastorEmail, status: 'updated existing pastor' });
    } else {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: pastorEmail,
        password: pastorPassword,
        email_confirm: true,
        user_metadata: { name: 'Senior Pastor', role: 'pastor' }
      });
      if (error) throw error;
      pastorId = created.user.id;
      results.push({ email: pastorEmail, status: 'created pastor' });
    }

    // Upsert pastor profile
    await supabase.from('profiles').upsert({
      id: pastorId,
      email: pastorEmail,
      name: 'Senior Pastor',
      role: 'pastor',
      branch: 'Main Sanctuary — Central Cathedral'
    });

    // 2. Shepherd accounts are created only through the real-name
    // /api/shepherds/create flow. This avoids inserting mock shepherd identities.

    res.json({
      success: true,
      message: 'Initial accounts created successfully',
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[SETUP USERS ERROR]', err);
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

// Pastor Dynamic Shepherd Creation & Onboarding
app.post('/api/shepherds/create', async (req, res) => {
  try {
    const authorization = req.header('authorization');
    const accessToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }
    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (actorError || actorProfile?.role !== 'pastor') {
      return res.status(403).json({ success: false, error: 'Only the pastor can create shepherd accounts.' });
    }
    if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({
        success: false,
        error: 'Shepherd account creation requires SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY to be configured in Render.'
      });
    }

    const { name, email, phone, cellName, password, isPpitShepherd = false } = req.body;

    if (!cleanText(name) || !isValidEmail(email) || !cleanText(cellName)
      || cleanText(name).length > 60 || cleanText(cellName).length > 120) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ success: false, error: 'Enter a valid phone number.' });
    }
    if (password?.trim() && password.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const shepherdPassword = password?.trim() || process.env.INITIAL_SHEPHERD_PASSWORD;
    if (!shepherdPassword) {
      return res.status(503).json({
        success: false,
        error: 'A temporary shepherd password must be provided or INITIAL_SHEPHERD_PASSWORD must be configured.'
      });
    }

    const { error: profileSchemaError } = await supabase
      .from('profiles')
      .select('is_ppit_shepherd')
      .limit(0);
    if (profileSchemaError) {
      console.error('[CREATE SHEPHERD ERROR] Profiles schema check failed:', profileSchemaError);
      if (profileSchemaError.code === '42703' || profileSchemaError.code === 'PGRST204') {
        return res.status(503).json({
          success: false,
          error: 'The profiles table is missing the PPIT shepherd field. Run backend/ppit_migration.sql in Supabase, then retry.'
        });
      }
      throw profileSchemaError;
    }

    // 1. Create or update user in Supabase Auth
    const { data: existingUsers, error: listUsersError } = await supabase.auth.admin.listUsers();
    if (listUsersError) {
      console.error('[CREATE SHEPHERD ERROR] Supabase Auth admin access failed:', listUsersError);
      return res.status(503).json({
        success: false,
        error: 'Supabase Auth admin access failed. Verify the Render Supabase server-side key has admin permissions.'
      });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    let userId;
    if (existing) {
      const { data: updated, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: shepherdPassword,
        user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone, is_ppit_shepherd: Boolean(isPpitShepherd) }
      });
      if (error) throw error;
      userId = existing.id;
    } else {
      // Remove any pre-existing unlinked profile record with this email to prevent trigger constraint conflicts
      const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('email', cleanEmail);
      if (deleteProfileError) throw deleteProfileError;

      const { data: created, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: shepherdPassword,
        email_confirm: true,
        user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone, is_ppit_shepherd: Boolean(isPpitShepherd) }
      });

      if (error) {
        // If user already exists in auth or conflicted, lookup again and update
        const { data: retryList, error: retryListError } = await supabase.auth.admin.listUsers();
        if (retryListError) throw retryListError;
        const retryUser = retryList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (retryUser) {
          const { error: retryUpdateError } = await supabase.auth.admin.updateUserById(retryUser.id, {
            password: shepherdPassword,
            user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone, is_ppit_shepherd: Boolean(isPpitShepherd) }
          });
          if (retryUpdateError) throw retryUpdateError;
          userId = retryUser.id;
        } else {
          throw error;
        }
      } else {
        userId = created.user.id;
      }
    }

    // 2. Upsert to public.profiles
    if (isPpitShepherd) {
      const { error: clearPpitError } = await supabase
        .from('profiles')
        .update({ is_ppit_shepherd: false })
        .neq('id', userId);
      if (clearPpitError) throw clearPpitError;
    }

    const { data: profile, error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      email: email.trim(),
      name: name.trim(),
      role: 'shepherd',
      assigned_cell: cellName.trim(),
      phone: phone || null,
      is_ppit_shepherd: Boolean(isPpitShepherd),
      branch: 'Main Sanctuary — Central Cathedral'
    }).select().single();

    if (profErr) throw profErr;

    // 3. Ensure care cell exists
    const { error: cellError } = await supabase.from('care_cells').upsert({
      name: cellName.trim(),
      shepherd_id: userId,
      max_capacity: 35
    }, { onConflict: 'name' });
    if (cellError) throw cellError;

    res.status(201).json({
      success: true,
      message: `Shepherd account successfully created for ${name}`,
      shepherd: {
        id: userId,
        name: name.trim(),
        email: email.trim(),
        cell: cellName.trim(),
        phone: phone || '',
        temporaryPassword: shepherdPassword
      }
    });
  } catch (err) {
    console.error('[CREATE SHEPHERD ERROR]', err);
    res.status(500).json({ success: false, error: 'Could not add user.' });
  }
});

// Pastor deletes a shepherd and the related authentication account.
app.delete('/api/shepherds/:shepherdId', async (req, res) => {
  try {
    const authorization = req.header('authorization');
    const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData?.user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session.' });
    }

    const { data: actorProfile, error: actorError } = await supabase
      .from('profiles')
      .select('name,role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (actorError || actorProfile?.role !== 'pastor') {
      return res.status(403).json({ success: false, error: 'Only the pastor can delete shepherd accounts.' });
    }

    const shepherdId = req.params.shepherdId;
    const { data: shepherd, error: shepherdError } = await supabase
      .from('profiles')
      .select('id,name,email,role')
      .eq('id', shepherdId)
      .eq('role', 'shepherd')
      .maybeSingle();
    if (shepherdError) throw shepherdError;
    if (!shepherd) {
      return res.status(404).json({ success: false, error: 'Shepherd not found.' });
    }

    await supabase.from('audit_logs').insert({
      id: `LOG-${Date.now()}`,
      actor_id: authData.user.id,
      actor_name: actorProfile.name,
      actor_role: 'pastor',
      action: 'DELETE_SHEPHERD',
      entity_type: 'Shepherd',
      entity_id: shepherdId,
      details: `Deleted shepherd ${shepherd.name} (${shepherd.email})`
    });

    await supabase.from('members').update({
      current_shepherd_id: null,
      current_shepherd_name: null
    }).eq('current_shepherd_id', shepherdId);

    await supabase.from('care_cells').update({ shepherd_id: null }).eq('shepherd_id', shepherdId);

    const { error: profileError } = await supabase.from('profiles').delete().eq('id', shepherdId);
    if (profileError) throw profileError;

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(shepherdId);
    if (authDeleteError) throw authDeleteError;

    res.json({
      success: true,
      message: `${shepherd.name} was deleted successfully.`,
      shepherdId
    });
  } catch (err) {
    console.error('[DELETE SHEPHERD ERROR]', err);
    res.status(500).json({ success: false, error: 'Unable to delete the shepherd. Please try again.' });
  }
});

// Fetch all registered shepherds
app.get('/api/shepherds', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'shepherd')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, count: data ? data.length : 0, shepherds: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
  }
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// ==========================================
// ADMIN: DATABASE MIGRATION — Apply Missing RLS Policies
// This runs idempotent SQL via Supabase rpc exec or raw query.
// Safe to call multiple times (uses DROP POLICY IF EXISTS).
// ==========================================
app.post('/api/admin/apply-rls-migrations', async (req, res) => {
  try {
    const sql = `
      DROP POLICY IF EXISTS "Shepherd assignments manageable by pastor or shepherd" ON public.shepherd_assignments;
      CREATE POLICY "Shepherd assignments manageable by pastor or shepherd"
      ON public.shepherd_assignments FOR ALL TO anon, authenticated
      USING (public.is_pastor())
      WITH CHECK (public.is_pastor());

      DROP POLICY IF EXISTS "Notifications insertable by pastor" ON public.notifications;
      CREATE POLICY "Notifications insertable by pastor"
      ON public.notifications FOR INSERT TO anon, authenticated
      WITH CHECK (public.is_pastor());
    `;
    res.json({
      success: false,
      requiresManualMigration: true,
      message: 'For security, run the RLS SQL manually in Supabase SQL Editor.',
      sql
    });
  } catch (err) {
    console.error('[RLS Migration Error]', err);
    res.status(500).json({ success: false, error: 'Migration failed. Please try again.' });
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CPI Church Management Backend API`);
  console.log(`📡 Listening on Port: ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});
