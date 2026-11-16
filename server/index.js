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
        message: 'API server running, but Supabase connection failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      service: 'Cross Passion International (CPI) Ministerial API',
      version: '1.0.0',
      database: 'Connected (Supabase Cloud)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
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
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const memberData = req.body;
    const { data, error } = await supabase.from('members').insert([memberData]).select().single();
    if (error) throw error;

    res.status(201).json({ success: true, member: data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.patch('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('members').update(updates).eq('id', id).select().single();
    if (error) throw error;

    res.json({ success: true, member: data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const { data, error } = await supabase.from('attendance_records').upsert(records).select();
    if (error) throw error;

    res.status(201).json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase.from('announcements').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, announcement: data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('church_events').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    res.json({ success: true, events: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('church_events').insert([req.body]).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, event: data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. MINISTERIAL INTEGRATION: SMS BROADCAST
// ==========================================
app.post('/api/ministerial/broadcast-sms', async (req, res) => {
  try {
    const { message, targetGroup, recipientPhoneNumbers } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message text is required' });
    }

    // This endpoint is ready for Twilio / Hubtel / Africa's Talking integration
    console.log(`[SMS BROADCAST] Target: ${targetGroup || 'Custom'} | Count: ${recipientPhoneNumbers?.length || 0}`);
    console.log(`[SMS CONTENT] ${message}`);

    res.json({
      success: true,
      message: 'SMS broadcast queued successfully',
      target: targetGroup || 'Custom flock',
      recipientsCount: recipientPhoneNumbers ? recipientPhoneNumbers.length : 0,
      deliveryStatus: 'QUEUED',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CPI Church Management Backend API`);
  console.log(`📡 Listening on Port: ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});
