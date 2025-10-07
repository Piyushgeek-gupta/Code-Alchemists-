const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: true }));

// Helper to verify user via JWT (optional) - uses Supabase admin endpoint to get user by token
async function verifyUser(accessToken) {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error) return { error };
    return { user: data.user };
  } catch (err) {
    return { error: err };
  }
}

app.post('/submit', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  const { participantId, questionId, submittedCode, points } = req.body || {};
  if (!participantId || typeof points !== 'number') {
    return res.status(400).json({ error: 'participantId and points are required' });
  }

  // Verify the token (optional, but recommended)
  const { user, error: verifyErr } = await verifyUser(token);
  if (verifyErr || !user) {
    return res.status(401).json({ error: verifyErr?.message || 'Invalid token' });
  }

  try {
    // Call RPC submit_and_increment if exists
    try {
      const { data, error } = await supabase.rpc('submit_and_increment', {
        p_participant_id: participantId,
        p_question_id: questionId || null,
        p_submitted_code: submittedCode || null,
        p_status: 'correct',
        p_points_awarded: points,
      });
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (rpcErr) {
      // Fallback: insert submission and update participant score
      const { error: subErr } = await supabase.from('submissions').insert([
        {
          participant_id: participantId,
          question_id: questionId || null,
          submitted_code: submittedCode || null,
          status: 'correct',
          points_awarded: points,
        },
      ]);
      if (subErr) throw subErr;

      const { data: partData, error: partErr } = await supabase
        .from('participants')
        .select('score')
        .eq('id', participantId)
        .limit(1)
        .maybeSingle();
      let newScore = (partData?.score || 0) + points;
      if (partErr) {
        // attempt to still update
      }

      const { error: updErr } = await supabase.from('participants').update({ score: newScore }).eq('id', participantId);
      if (updErr) throw updErr;

      return res.json({ success: true, participant_id: participantId, new_score: newScore });
    }
  } catch (err) {
    console.error('submit error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Set participant language once (service role). Accepts { userId?, email?, language }
app.post('/select-language', async (req, res) => {
  const { userId, email, language } = req.body || {};
  const allowed = ['python', 'c', 'java'];
  if (!language || !allowed.includes(String(language))) {
    return res.status(400).json({ error: 'Invalid language' });
  }
  if (!userId && !email) {
    return res.status(400).json({ error: 'userId or email required' });
  }
  try {
    let targetUserId = userId;
    if (!targetUserId && email) {
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();
      if (profErr) return res.status(500).json({ error: profErr.message });
      targetUserId = prof?.user_id || null;
    }
    if (!targetUserId) return res.status(404).json({ error: 'User not found for provided email' });

    // Update only if not already set
    const { error: updErr } = await supabase
      .from('participants')
      .update({ selected_language: language })
      .eq('user_id', targetUserId)
      .is('selected_language', null);
    if (updErr) return res.status(500).json({ error: updErr.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Remove participant (admin only). Expects participantId and userId (auth user) to clean up.
app.post('/admin/remove-participant', async (req, res) => {
  const { participantId, userId } = req.body || {};
  if (!participantId || !userId) return res.status(400).json({ error: 'participantId and userId are required' });

  try {
    // Delete dependent records first if necessary (submissions cascade should handle it)
    const { error: delParticipantErr } = await supabase.from('participants').delete().eq('id', participantId);
    if (delParticipantErr) return res.status(500).json({ error: delParticipantErr.message });

    // Optionally delete profile (keep if other relations exist). Here we only remove profile row matching userId.
    await supabase.from('profiles').delete().eq('user_id', userId);

    // Delete auth user via admin API
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      // Not fatal; report warning
      return res.json({ success: true, warning: authErr.message });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Update participant password (admin only). Expects userId and newPassword.
app.post('/admin/update-password', async (req, res) => {
  const { userId, newPassword } = req.body || {};
  if (!userId || !newPassword) return res.status(400).json({ error: 'userId and newPassword are required' });
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, user: data?.user || null });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Server listening on port ${port}`));
