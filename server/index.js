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

// Health endpoint for connectivity checks
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

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

  const { participantId, questionId, submittedCode, points, email, selectedLanguage } = req.body || {};
  if (typeof points !== 'number') {
    return res.status(400).json({ error: 'points is required' });
  }

  // If a token is provided, verify it; otherwise allow fallback using service role by validating participant exists
  if (token) {
    const { user, error: verifyErr } = await verifyUser(token);
    if (verifyErr || !user) {
      return res.status(401).json({ error: verifyErr?.message || 'Invalid token' });
    }
  } else {
    // No token: ensure we can resolve/create a participant by id or email
    let pid = participantId || null;
    if (!pid && email) {
      // find user_id by email
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();
      if (profErr || !prof?.user_id) return res.status(401).json({ error: 'Unauthorized or user not found by email' });
      // find or create participant for that user_id
      const { data: part } = await supabase
        .from('participants')
        .select('id, selected_language')
        .eq('user_id', prof.user_id)
        .limit(1)
        .maybeSingle();
      if (part?.id) {
        pid = part.id;
      } else {
        const lang = ['python','c','java'].includes(String(selectedLanguage)) ? selectedLanguage : null;
        const { data: ins, error: insErr } = await supabase
          .from('participants')
          .insert([{ contest_id: null, user_id: prof.user_id, selected_language: lang, score: 0 }])
          .select('id')
          .maybeSingle();
        if (insErr || !ins?.id) return res.status(500).json({ error: insErr?.message || 'Failed to create participant' });
        pid = ins.id;
      }
    }
    if (!pid) return res.status(401).json({ error: 'Unauthorized or invalid participant' });
    req.body.participantId = pid;
  }

  try {
    const pid = req.body.participantId || participantId;
    const qid = questionId || null;

    // Hard pre-check: if already has a correct submission for this question, do not award again
    if (pid && qid) {
      const { data: already, error: alreadyErr } = await supabase
        .from('submissions')
        .select('id')
        .eq('participant_id', pid)
        .eq('question_id', qid)
        .eq('status', 'correct')
        .limit(1)
        .maybeSingle();
      if (alreadyErr) throw alreadyErr;
      if (already) {
        // Already solved: do not insert or log duplicates
        const { data: partRow } = await supabase
          .from('participants')
          .select('score')
          .eq('id', pid)
          .limit(1)
          .maybeSingle();
        return res.json({ success: true, participant_id: pid, new_score: partRow?.score || 0, already_solved: true });
      }
    }

    // Call RPC submit_and_increment if exists
    try {
      const { data, error } = await supabase.rpc('submit_and_increment', {
        p_participant_id: pid,
        p_question_id: qid,
        p_submitted_code: ((submittedCode || '') + (typeof req.body.timeLeftSeconds === 'number' ? `\n\n# time_left_seconds=${req.body.timeLeftSeconds}` : '')),
        p_status: 'correct',
        p_points_awarded: points,
      });
      if (error) throw error;
      return res.json({ success: true, data });
    } catch (rpcErr) {
      // Fallback: implement idempotent behavior manually
      // Check if already solved correctly
      const { data: existing, error: existErr } = await supabase
        .from('submissions')
        .select('id')
        .eq('participant_id', pid)
        .eq('question_id', qid)
        .eq('status', 'correct')
        .limit(1)
        .maybeSingle();
      if (existErr) throw existErr;

      if (!existing) {
        // First correct submission -> insert and increment
        const { error: subErr } = await supabase.from('submissions').insert([
          {
            participant_id: pid,
            question_id: qid,
            submitted_code: ((submittedCode || '') + (typeof req.body.timeLeftSeconds === 'number' ? `\n\n# time_left_seconds=${req.body.timeLeftSeconds}` : '')),
            status: 'correct',
            points_awarded: points,
          },
        ]);
        if (subErr) throw subErr;

        const { data: partData } = await supabase
          .from('participants')
          .select('score')
          .eq('id', pid)
          .limit(1)
          .maybeSingle();
        const newScore = (partData?.score || 0) + points;
        const { error: updErr } = await supabase
          .from('participants')
          .update({ score: newScore })
          .eq('id', pid);
        if (updErr) throw updErr;
        // audit log for scoring submission
        try {
          const { data: partInfo } = await supabase
            .from('participants')
            .select('id, user_id')
            .eq('id', pid)
            .limit(1)
            .maybeSingle();
          let participantName = null;
          let participantEmail = null;
          if (partInfo?.user_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', partInfo.user_id)
              .limit(1)
              .maybeSingle();
            participantName = prof?.full_name || null;
            participantEmail = prof?.email || null;
          }
          await supabase.from('submission_audit_logs').insert([
            {
              participant_id: pid,
              participant_name: participantName,
              participant_email: participantEmail,
              question_id: qid,
              question_number: typeof req.body.questionNumber === 'number' ? req.body.questionNumber : null,
              points_awarded: points,
              time_left_seconds: typeof req.body.timeLeftSeconds === 'number' ? req.body.timeLeftSeconds : null,
            },
          ]);
        } catch {}
        return res.json({ success: true, participant_id: pid, new_score: newScore });
      } else {
        // Already solved -> record a non-scoring attempt for audit and return current score
        await supabase.from('submissions').insert([
          {
            participant_id: pid,
            question_id: qid,
            submitted_code: ((submittedCode || '') + (typeof req.body.timeLeftSeconds === 'number' ? `\n\n# time_left_seconds=${req.body.timeLeftSeconds}` : '')),
            status: 'pending',
            points_awarded: 0,
          },
        ]);
        // audit log
        try {
          const { data: partInfo } = await supabase
            .from('participants')
            .select('id, user_id')
            .eq('id', pid)
            .limit(1)
            .maybeSingle();
          let participantName = null;
          let participantEmail = null;
          if (partInfo?.user_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', partInfo.user_id)
              .limit(1)
              .maybeSingle();
            participantName = prof?.full_name || null;
            participantEmail = prof?.email || null;
          }
          await supabase.from('submission_audit_logs').insert([
            {
              participant_id: pid,
              participant_name: participantName,
              participant_email: participantEmail,
              question_id: qid,
              question_number: typeof req.body.questionNumber === 'number' ? req.body.questionNumber : null,
              points_awarded: 0,
              time_left_seconds: typeof req.body.timeLeftSeconds === 'number' ? req.body.timeLeftSeconds : null,
            },
          ]);
        } catch {}
        const { data: partData } = await supabase
          .from('participants')
          .select('score')
          .eq('id', pid)
          .limit(1)
          .maybeSingle();
        return res.json({ success: true, participant_id: pid, new_score: partData?.score || 0, already_solved: true });
      }
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
