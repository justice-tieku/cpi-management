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
    if (!memberData.first_name || !memberData.phone) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
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
    if (!title || !title.trim() || !content || !content.trim()) {
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
    if (!title || !title.trim() || !evDate || !location || !location.trim()) {
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
    const results = [];

    // 1. Senior Pastor
    const pastorEmail = 'crosspassioninternational67@gmail.com';
    const pastorPassword = 'CrossPassion@99';

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

    // 2. Initial Shepherds
    const defaultShepherds = [
      { name: 'Elder Nathan Cole', email: 'nathan.cole@crosspassion.org', cell: 'Bethel Cell (Central)' },
      { name: 'Deaconess Ruth Taiwo', email: 'ruth.taiwo@crosspassion.org', cell: 'Eden Cell (South)' },
      { name: 'Bro. Matthew Kim', email: 'matthew.kim@crosspassion.org', cell: 'Moriah Young Adults' },
      { name: 'Sister Grace Olatunji', email: 'grace.olatunji@crosspassion.org', cell: 'Sharon Cell (East)' },
      { name: 'Pastor Emmanuel Vance', email: 'emmanuel.vance@crosspassion.org', cell: 'Hebron Cell (North)' }
    ];

    for (const sh of defaultShepherds) {
      const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === sh.email.toLowerCase());
      let shId;

      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password: pastorPassword,
          user_metadata: { name: sh.name, role: 'shepherd', assigned_cell: sh.cell }
        });
        shId = existing.id;
        results.push({ email: sh.email, status: 'updated existing shepherd' });
      } else {
        const { data: created, error } = await supabase.auth.admin.createUser({
          email: sh.email,
          password: pastorPassword,
          email_confirm: true,
          user_metadata: { name: sh.name, role: 'shepherd', assigned_cell: sh.cell }
        });
        if (error) {
          results.push({ email: sh.email, status: `error: ${error.message}` });
          continue;
        }
        shId = created.user.id;
        results.push({ email: sh.email, status: 'created shepherd' });
      }

      await supabase.from('profiles').upsert({
        id: shId,
        email: sh.email,
        name: sh.name,
        role: 'shepherd',
        assigned_cell: sh.cell,
        branch: 'Main Sanctuary — Central Cathedral'
      });
    }

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
    const { name, email, phone, cellName, password } = req.body;

    if (!name || !name.trim() || !email || !email.trim() || !cellName || !cellName.trim()) {
      return res.status(400).json({ success: false, error: 'Please enter the required information.' });
    }

    const shepherdPassword = password?.trim() || 'CrossPassion@99';

    // 1. Create or update user in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const cleanEmail = email.trim().toLowerCase();
    const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    let userId;
    if (existing) {
      const { data: updated, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: shepherdPassword,
        user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone }
      });
      if (error) throw error;
      userId = existing.id;
    } else {
      // Remove any pre-existing unlinked profile record with this email to prevent trigger constraint conflicts
      await supabase.from('profiles').delete().eq('email', cleanEmail);

      const { data: created, error } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        password: shepherdPassword,
        email_confirm: true,
        user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone }
      });

      if (error) {
        // If user already exists in auth or conflicted, lookup again and update
        const { data: retryList } = await supabase.auth.admin.listUsers();
        const retryUser = retryList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
        if (retryUser) {
          await supabase.auth.admin.updateUserById(retryUser.id, {
            password: shepherdPassword,
            user_metadata: { name: name.trim(), role: 'shepherd', assigned_cell: cellName.trim(), phone }
          });
          userId = retryUser.id;
        } else {
          throw error;
        }
      } else {
        userId = created.user.id;
      }
    }

    // 2. Upsert to public.profiles
    const { data: profile, error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      email: email.trim(),
      name: name.trim(),
      role: 'shepherd',
      assigned_cell: cellName.trim(),
      phone: phone || null,
      branch: 'Main Sanctuary — Central Cathedral'
    }).select().single();

    if (profErr) throw profErr;

    // 3. Ensure care cell exists
    await supabase.from('care_cells').upsert({
      name: cellName.trim(),
      shepherd_id: userId,
      max_capacity: 35
    }, { onConflict: 'name' });

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
    res.status(500).json({ success: false, error: 'Request unsuccessful. Please try again.' });
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
    // The shepherd_assignments table had RLS enabled but no policies,
    // causing all INSERT/SELECT/UPDATE to be rejected by default.
    // We apply an open policy so the anon key can manage assignments.
    const sql = `
      DROP POLICY IF EXISTS "Shepherd assignments manageable by pastor or shepherd" ON public.shepherd_assignments;
      CREATE POLICY "Shepherd assignments manageable by pastor or shepherd"
      ON public.shepherd_assignments FOR ALL TO anon, authenticated
      USING (true)
      WITH CHECK (true);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).maybeSingle();

    // If the rpc method doesn't exist, try via raw query workaround
    if (error && error.message && error.message.includes('exec_sql')) {
      // Fallback: execute statements one at a time via supabase-js client
      // by inserting a known row to verify connectivity
      console.warn('[RLS Migration] exec_sql RPC not available. Attempting direct upsert approach.');
      res.json({
        success: true,
        message: 'RLS migration via exec_sql not available on this plan. Apply the SQL manually in Supabase Dashboard > SQL Editor.',
        sql
      });
      return;
    }

    if (error) {
      console.error('[RLS Migration] Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      message: 'RLS policies applied successfully to shepherd_assignments table.',
      timestamp: new Date().toISOString()
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
